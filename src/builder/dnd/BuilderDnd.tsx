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
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from 'react'
import { layoutAxis, nodeElement, scrollParent } from '../preview/measure'
import { findNode } from '../selection/selection'
import { useBuilderActions, useBuilderState, useRegistry } from '../state/BuilderProvider'
import { describeSlot, moveSlots, resolveDrop, type DropTarget, type Point } from './dropTarget'

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
  /** A keyboard move: the target shows in Layers and on the canvas, and no shield covers the page. */
  keyboard: boolean
}

export interface KeyboardMove {
  /** Starts moving a layer with the keyboard. */
  start: (id: string) => void
  /** The id of the text that explains the keys, for `aria-describedby`. */
  hintId: string
}

const idle: DragState = { item: null, target: null, keyboard: false }
const DragStateContext = createContext<DragState>(idle)
const SurfaceContext = createContext<(surface: DropSurface, element: HTMLElement | null) => void>(() => {})
const KeyboardMoveContext = createContext<KeyboardMove>({ start: () => {}, hintId: '' })
const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

const surfaceAttribute: Record<DropSurface, string> = { canvas: 'data-builder-id', layers: 'data-layer-id' }
const EDGE = 40
const SCROLL_STEP = 14
// dnd-kit compares sensor options by identity: a new object each render would re-render every drag source.
const pointerOptions = { activationConstraint: { distance: 6 } }
const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
  onDragOver: () => undefined,
  onDragEnd: ({ active }) => `Dropped ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
  onDragCancel: ({ active }) => `Cancelled dragging ${(active.data.current as DragItem | undefined)?.label ?? 'item'}.`,
}
const accessibility = { announcements }

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

export function useKeyboardMove(): KeyboardMove {
  return useContext(KeyboardMoveContext)
}

/** Makes an element a drag source. The element stays in place; a chip follows the pointer. */
export function useDragSource(id: string, item: DragItem, disabled = false) {
  const draggable = useDraggable({ id, data: item, disabled })
  // dnd-kit's description explains its keyboard sensor, which the builder doesn't use (layers move with
  // useKeyboardMove), so it is left off.
  const { 'aria-describedby': _instructions, ...attributes } = draggable.attributes
  return { ...draggable, attributes }
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

/**
 * While dragging, a shield covers the page: it shows the grabbing cursor and keeps the pointer from hovering (and
 * restyling) everything it crosses. It is not a class on the body, because restyling every element on each pick-up
 * and drop takes tens of milliseconds on a large page. A wheel turn on the shield scrolls whatever is under it.
 */
function forwardWheel(event: WheelEvent<HTMLDivElement>) {
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
  for (const element of document.elementsFromPoint(event.clientX, event.clientY)) {
    if (!(element instanceof HTMLElement) || element.closest('[data-drop-ignore]')) continue
    const scroller = scrollParent(element)
    if (!scroller) continue
    scroller.scrollBy({ top: event.deltaY * scale, left: event.deltaX * scale })
    return
  }
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
  const sensors = useSensors(useSensor(PointerSensor, pointerOptions))

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
        setDrag({ item, target, keyboard: false })
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
    session.current = null
  }, [])

  useEffect(() => stop, [stop])

  const hintId = useId()
  const [announcement, setAnnouncement] = useState('')
  // Cancels the keyboard move in progress.
  const cancelMove = useRef<(() => void) | null>(null)

  /**
   * Moves a layer with the keyboard: the arrow keys (and Home, End) step through every place the drop rules allow,
   * in the order Layers shows them; Enter or Space drops it there; Escape, Tab, another key or a click cancels.
   */
  const startKeyboardMove = useCallback(
    (id: string) => {
      if (session.current || cancelMove.current) return
      const { registry: reg, document: tree } = latest.current
      const node = findNode(tree, id)
      const slots = node ? moveSlots(reg, tree, id) : []
      if (!node || slots.length === 0) return
      const item: DragItem = { kind: 'layer', id, component: node.component, label: node.label }
      const origin = document.activeElement
      let index = Math.max(
        0,
        slots.findIndex((slot) => slot.current),
      )

      const show = (lead = '') => {
        const slot = slots[index]
        const canvas = surfaces.current.get('canvas')
        const element = canvas ? nodeElement(canvas, slot.targetId) : null
        element?.scrollIntoView({ block: 'nearest' })
        const axis = element ? layoutAxis(element) : 'vertical'
        setDrag({
          item,
          keyboard: true,
          target: { surface: 'layers', id: slot.targetId, position: slot.position, axis },
        })
        setAnnouncement(lead + describeSlot(slot, id))
      }
      // Space activates a focused button when it is released; the release that drops must not start another move.
      const onKeyUp = (event: KeyboardEvent) => {
        if (event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        window.removeEventListener('keyup', onKeyUp, true)
      }
      const end = (commit: boolean, space = false) => {
        window.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('pointerdown', onPointerDown, true)
        if (space) window.addEventListener('keyup', onKeyUp, true)
        cancelMove.current = null
        setDrag(idle)
        const slot = slots[index]
        if (commit && !slot.current) {
          actions.place(id, slot.targetId, slot.position)
          setAnnouncement(`Moved ${item.label}. ${describeSlot(slot, id)}.`)
        } else {
          setAnnouncement(`${commit ? '' : 'Move cancelled. '}${item.label} stays where it was.`)
        }
        // Focus goes back where the move started, or to the layer's row when that is gone.
        requestAnimationFrame(() => {
          const row = surfaces.current
            .get('layers')
            ?.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(id)}"] .layer-name`)
          const back = origin instanceof HTMLElement && origin.isConnected ? origin : row
          back?.focus()
        })
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (MODIFIERS.has(event.key)) return
        if (event.key === 'Tab') {
          end(false)
          return
        }
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') index = Math.max(0, index - 1)
        else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') index = Math.min(slots.length - 1, index + 1)
        else if (event.key === 'Home') index = 0
        else if (event.key === 'End') index = slots.length - 1
        else if (event.key === 'Enter' || event.key === ' ') {
          if (!event.repeat) end(true, event.key === ' ')
          return
        } else {
          end(false)
          return
        }
        show()
      }
      const onPointerDown = () => end(false)
      window.addEventListener('keydown', onKeyDown, true)
      window.addEventListener('pointerdown', onPointerDown, true)
      cancelMove.current = () => end(false)
      show(`Moving ${item.label}, ${slots.length} places. `)
    },
    [actions],
  )

  useEffect(() => () => cancelMove.current?.(), [])
  const keyboardMove = useMemo<KeyboardMove>(() => ({ start: startKeyboardMove, hintId }), [startKeyboardMove, hintId])

  const onDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current as DragItem | undefined
    if (!item) return
    cancelMove.current?.()
    const start = event.activatorEvent as PointerEvent
    const onMove = (move: PointerEvent) => {
      if (session.current) session.current.pointer = { x: move.clientX, y: move.clientY }
    }
    window.addEventListener('pointermove', onMove)
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
    setDrag({ item, target: null, keyboard: false })
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
      accessibility={accessibility}
      onDragStart={onDragStart}
      onDragEnd={() => finish(true)}
      onDragCancel={() => finish(false)}
    >
      <SurfaceContext.Provider value={register}>
        <KeyboardMoveContext.Provider value={keyboardMove}>
          <DragStateContext.Provider value={drag}>{children}</DragStateContext.Provider>
        </KeyboardMoveContext.Provider>
      </SurfaceContext.Provider>
      {drag.item && !drag.keyboard ? (
        <div className="drag-shield" data-drop-ignore="" aria-hidden="true" onWheel={forwardWheel} />
      ) : null}
      <p id={hintId} hidden>
        Press Enter or Space to move it with the keyboard: the arrow keys choose the place, Enter or Space drops it, and
        Escape cancels.
      </p>
      <div className="sr" role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      <DragOverlay className="drag-overlay" dropAnimation={null}>
        {drag.item ? <div className={drag.target ? 'drag-chip' : 'drag-chip blocked'}>{drag.item.label}</div> : null}
      </DragOverlay>
    </DndContext>
  )
}
