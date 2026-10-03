import { useLayoutEffect, useState } from 'react'
import { useDragSource, useDragState } from '../dnd/BuilderDnd'
import { findNode } from '../selection/selection'
import type { ConfigNode } from '../../registry/metadata'
import { useBuilderActions } from '../state/BuilderProvider'
import { nodeElement } from './measure'

interface Box {
  top: number
  left: number
  width: number
  height: number
  label: string
}

function measure(container: HTMLElement, id: string, zoom: number, root: ConfigNode): Box | null {
  const target = nodeElement(container, id)
  if (!target) return null
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const origin = container.getBoundingClientRect()
  const node = findNode(root, id)
  return {
    top: (rect.top - origin.top) / zoom,
    left: (rect.left - origin.left) / zoom,
    width: rect.width / zoom,
    height: rect.height / zoom,
    label: node?.label ?? id,
  }
}

export function SelectionOverlay({
  container,
  root,
  selectedId,
  hoverId,
  zoom,
}: {
  container: HTMLElement | null
  root: ConfigNode
  selectedId: string
  hoverId: string | null
  zoom: number
}) {
  const actions = useBuilderActions()
  const [hover, setHover] = useState<Box | null>(null)
  const [selected, setSelected] = useState<Box | null>(null)

  useLayoutEffect(() => {
    if (!container) return
    const update = () => {
      setSelected(measure(container, selectedId, zoom, root))
      setHover(hoverId && hoverId !== selectedId ? measure(container, hoverId, zoom, root) : null)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    container.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [container, hoverId, root, selectedId, zoom])

  const node = findNode(root, selectedId)
  const { item: dragging } = useDragState()

  return (
    <div className="overlay" data-drop-ignore="">
      {hover && !dragging ? <div className="outline hover" style={frameStyle(hover)} aria-hidden="true" /> : null}
      <DropIndicator container={container} root={root} zoom={zoom} />
      {selected ? (
        <div className="outline selected" style={frameStyle(selected)}>
          {selectedId !== root.id && node ? (
            <DragHandle id={selectedId} component={node.component} label={selected.label} />
          ) : (
            <span className="outline-tag" aria-hidden="true">{selected.label}</span>
          )}
          {selectedId !== root.id ? (
            <>
              <button
                type="button"
                className="outline-duplicate"
                aria-label={`Duplicate ${selected.label}`}
                onClick={(event) => {
                  event.stopPropagation()
                  actions.duplicate()
                }}
              >
                ⧉
              </button>
              <button
                type="button"
                className="outline-remove"
                aria-label={`Remove ${selected.label}`}
                title="Remove (Delete)"
                onClick={(event) => {
                  event.stopPropagation()
                  actions.remove()
                }}
              >
                ×
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function frameStyle(box: Box) {
  return { top: box.top, left: box.left, width: box.width, height: box.height }
}

/** The selected layer's name tag doubles as its drag handle on the canvas. */
function DragHandle({ id, component, label }: { id: string; component: string; label: string }) {
  const { setNodeRef, listeners, attributes } = useDragSource(`canvas:${id}`, { kind: 'layer', id, component, label })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="outline-tag outline-handle"
      {...attributes}
      {...listeners}
      aria-label={`Drag ${label}`}
      title="Drag to move"
      onClick={(event) => event.stopPropagation()}
    >
      <span aria-hidden="true">⠿</span> {label}
    </button>
  )
}

/** Shows where a drag will land: a line before or after a layer, or a box around the container it goes into. */
function DropIndicator({ container, root, zoom }: { container: HTMLElement | null; root: ConfigNode; zoom: number }) {
  const { target } = useDragState()
  const [box, setBox] = useState<Box | null>(null)
  const canvasTarget = target?.surface === 'canvas' ? target : null

  useLayoutEffect(() => {
    setBox(container && canvasTarget ? measure(container, canvasTarget.id, zoom, root) : null)
  }, [canvasTarget, container, root, zoom])

  if (!box || !canvasTarget) return null
  if (canvasTarget.position === 'inside') {
    return <div className="canvas-drop-box" style={frameStyle(box)} aria-hidden="true" />
  }
  const vertical = canvasTarget.axis === 'vertical'
  const after = canvasTarget.position === 'after'
  const style = vertical
    ? { top: after ? box.top + box.height : box.top, left: box.left, width: box.width }
    : { top: box.top, left: after ? box.left + box.width : box.left, height: box.height }
  return <div className={vertical ? 'canvas-drop-line' : 'canvas-drop-line upright'} style={style} aria-hidden="true" />
}
