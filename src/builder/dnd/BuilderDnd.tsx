import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type Announcements,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { layoutAxis, nodeElement, scrollParent } from '../preview/measure'
import { useBuilderActions, useBuilderState, useRegistry } from '../state/BuilderProvider'
import { resolveDrop, type DropTarget, type Point } from './dropTarget'

/** A new component, layout preset or block from the sidebar, or a layer already on the page. */
export type DragItem =
  | { kind: 'palette'; component: string; label: string }
  /** `component` is the row's root, which the drop rules check. */
  | { kind: 'columns'; spans: number[]; component: string; label: string }
  /** `component` is the block's root, which the drop rules check. */
  | { kind: 'block'; block: string; component: string; label: string }
  | { kind: 'layer'; id: string; component: string; label: string }

/** Places that accept drops: the preview frame (`data-builder-id` nodes) and the Layers tree (`data-layer-id` rows). */
export type DropSurface = 'canvas' | 'layers'

export interface DragState {
  item: DragItem | null
  target: (DropTarget & { surface: DropSurface }) | null
}

const idle: DragState = { item: null, target: null }
const DragStateContext = createContext<DragState>(idle)
const SurfaceContext = createContext<(surface: DropSurface, element: HTMLElement | null) => void>(() => {})

const surfaceAttribute: Record<DropSurface, string> = { canvas: 'data-builder-id', layers: 'data-layer-id' }
const EDGE = 40
const SCROLL_STEP = 14

export function useDragState(): DragState {
  return useContext(DragStateContext)
}

/** Registers an element as a drop surface while it is mounted. */
export function useDropSurface(surface: DropSurface, element: HTMLElement | null) {
  const register = useContext(SurfaceContext)
  useEffect(() => {
    register(surface, element)
    return () => register(surface, null)
  }, [register, surface, element])
}

/** Makes an element a drag source. The element stays in place; a chip follows the pointer. */
export function useDragSource(id: string, item: DragItem, disabled = false) {
  return useDraggable({ id, data: item, disabled })
}

function sameTarget(left: DragState['target'], right: DragState['target']): boolean {
  return (
    left?.surface === right?.surface &&
    left?.id === right?.id &&
    left?.position === right?.position &&
    left?.axis === right?.axis
  )
}

/** The surface under the pointer and the layer id there (null on a surface's empty space). */
function hitAt(
  surfaces: Map<DropSurface, HTMLElement>,
  point: Point,
): { surface: DropSurface; id: string | null } | null {
  for (const element of document.elementsFromPoint(point.x, point.y)) {
    // Builder chrome drawn over the canvas (selection handles, buttons) is looked through.
    if (element.closest('[data-drop-ignore]')) continue
    for (const [surface, root] of surfaces) {
      if (!root.contains(element)) continue
      const attribute = surfaceAttribute[surface]
      const hit = element.closest(`[${attribute}]`)
      // Inside the canvas but outside every layer (empty space around the page) means the root.
      return { surface, id: hit && root.contains(hit) ? hit.getAttribute(attribute) : null }
    }
  }
  return null
}

function scrollNearEdge(scroller: HTMLElement, point: Point) {
  const box = scroller.getBoundingClientRect()
  if (point.x < box.left || point.x > box.right) return
  if (point.y < box.top + EDGE && point.y >= box.top) scroller.scrollTop -= SCROLL_STEP
  else if (point.y > box.bottom - EDGE && point.y <= box.bottom) scroller.scrollTop += SCROLL_STEP
}

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
  onDragOver: () => undefined,
  onDragEnd: ({ active }) => `Dropped ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
  onDragCancel: ({ active }) => `Cancelled dragging ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
}

/**
 * Drag-and-drop for the sidebar, canvas, and Layers. dnd-kit handles the pointer and the drag chip;
 * the drop target comes from the element under the pointer and the registry's drop rules.
 */
export function BuilderDnd({ children }: { children: ReactNode }) {
  const registry = useRegistry()
  const state = useBuilderState()
  const actions = useBuilderActions()
  const [drag, setDrag] = useState<DragState>(idle)
  const surfaces = useRef(new Map<DropSurface, HTMLElement>())
  const latest = useRef({ registry, document: state.document })
  // The live drag. The drop reads the target from here, not from the last render.
  const session = useRef<{
    item: DragItem
    target: DragState['target']
    pointer: Point
    frame: number
    scrollers: HTMLElement[]
    off: () => void
  } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useLayoutEffect(() => {
    latest.current = { registry, document: state.document }
  })

  const register = useCallback((surface: DropSurface, element: HTMLElement | null) => {
    if (element) surfaces.current.set(surface, element)
    else surfaces.current.delete(surface)
  }, [])

  const measure = useCallback((surface: DropSurface, id: string) => {
    const root = surfaces.current.get(surface)
    if (!root) return null
    const element =
      surface === 'canvas'
        ? nodeElement(root, id)
        : root.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(id)}"]`)
    if (!element) return null
    const rect = element.getBoundingClientRect()
    return {
      box: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      axis: surface === 'canvas' ? layoutAxis(element) : ('vertical' as const),
    }
  }, [])

  // Named, so each frame can schedule the next one.
  const track = useCallback(
    function step() {
      const current = session.current
      if (!current) return
      const { registry: reg, document } = latest.current
      current.scrollers.forEach((scroller) => scrollNearEdge(scroller, current.pointer))
      const hit = hitAt(surfaces.current, current.pointer)
      const item = current.item
      const subject =
        item.kind === 'layer' ? { component: item.component, movingId: item.id } : { component: item.component }
      const resolved = hit
        ? resolveDrop(reg, document, hit.id ?? document.id, current.pointer, subject, (id) => measure(hit.surface, id))
        : null
      const target = resolved && hit ? { ...resolved, surface: hit.surface } : null
      if (!sameTarget(current.target, target)) {
        current.target = target
        setDrag({ item, target })
      }
      current.frame = requestAnimationFrame(step)
    },
    [measure],
  )

  const stop = useCallback(() => {
    const current = session.current
    if (!current) return
    cancelAnimationFrame(current.frame)
    current.off()
    document.body.classList.remove('builder-dragging')
    session.current = null
  }, [])

  useEffect(() => stop, [stop])

  const onDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current as DragItem | undefined
    if (!item) return
    const start = event.activatorEvent as PointerEvent
    const onMove = (move: PointerEvent) => {
      if (session.current) session.current.pointer = { x: move.clientX, y: move.clientY }
    }
    window.addEventListener('pointermove', onMove)
    // Stops the browser from selecting preview text while the pointer sweeps across it.
    document.body.classList.add('builder-dragging')
    window.getSelection()?.removeAllRanges()
    const scrollers = [...surfaces.current.values()]
      .map((element) => scrollParent(element))
      .filter((element): element is HTMLElement => element != null)
    session.current = {
      item,
      target: null,
      pointer: { x: start.clientX ?? 0, y: start.clientY ?? 0 },
      frame: 0,
      scrollers,
      off: () => window.removeEventListener('pointermove', onMove),
    }
    setDrag({ item, target: null })
    session.current.frame = requestAnimationFrame(track)
  }

  const finish = (commit: boolean) => {
    const item = session.current?.item
    const target = session.current?.target
    stop()
    setDrag(idle)
    if (!commit || !item || !target) return
    if (item.kind === 'palette') actions.insertAt(item.component, target.id, target.position)
    else if (item.kind === 'columns') actions.insertColumnsAt(item.spans, target.id, target.position)
    else if (item.kind === 'block') actions.insertBlockAt(item.block, target.id, target.position)
    else actions.place(item.id, target.id, target.position)
  }

  return (
    <DndContext
      sensors={sensors}
      autoScroll={false}
      accessibility={{ announcements }}
      onDragStart={onDragStart}
      onDragEnd={() => finish(true)}
      onDragCancel={() => finish(false)}
    >
      <SurfaceContext.Provider value={register}>
        <DragStateContext.Provider value={drag}>{children}</DragStateContext.Provider>
      </SurfaceContext.Provider>
      <DragOverlay dropAnimation={null}>
        {drag.item ? <div className={drag.target ? 'drag-chip' : 'drag-chip blocked'}>{drag.item.label}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}
