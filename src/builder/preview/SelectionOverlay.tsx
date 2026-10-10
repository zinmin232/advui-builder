import { useLayoutEffect, useState, type ReactNode } from 'react'
import { useDragSource, useDragState } from '../dnd/BuilderDnd'
import { findNode, findPath } from '../selection/selection'
import type { ConfigNode } from '../../registry/metadata'
import { useBuilderActions, useRegistry } from '../state/BuilderProvider'
import { canEditText } from './canvasMode'
import { nodeElement } from './measure'
import { TextEditor } from './TextEditor'

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
  editing,
  onEditText,
  onEditDone,
}: {
  container: HTMLElement | null
  root: ConfigNode
  selectedId: string
  hoverId: string | null
  zoom: number
  /** The selected layer's text is being edited in place. */
  editing: boolean
  onEditText: () => void
  onEditDone: () => void
}) {
  const actions = useBuilderActions()
  const registry = useRegistry()
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

  const path = findPath(root, selectedId)
  const node = path?.at(-1) ?? null
  const parent = path && path.length > 1 ? path[path.length - 2] : null
  const index = parent && node ? parent.children.findIndex((child) => child.id === node.id) : -1
  const editable = node ? canEditText(registry, node) : false
  const { item: dragging } = useDragState()

  return (
    <div className="overlay" data-drop-ignore="">
      {hover && !dragging ? (
        <div className="outline hover" style={frameStyle(hover)} aria-hidden="true">
          <span className="outline-tag ghost">{hover.label}</span>
        </div>
      ) : null}
      <DropIndicator container={container} root={root} zoom={zoom} />
      {selected && node ? (
        <div className="outline selected" style={frameStyle(selected)}>
          {editing && editable ? (
            <TextEditor key={node.id} container={container} node={node} onDone={onEditDone} />
          ) : (
            <div className="outline-bar" role="group" aria-label={`${selected.label} toolbar`}>
              {parent ? (
                <DragHandle id={node.id} component={node.component} label={selected.label} />
              ) : (
                <span className="outline-tag">{selected.label}</span>
              )}
              {parent ? (
                <>
                  <Tool
                    label={`Select ${parent.label}`}
                    title={`Select the parent, ${parent.label}`}
                    onClick={() => actions.select(parent.id)}
                  >
                    ↰
                  </Tool>
                  <Tool
                    label={`Move ${selected.label} up`}
                    title="Move up (Alt+↑)"
                    disabled={index <= 0}
                    onClick={() => actions.move('up')}
                  >
                    ↑
                  </Tool>
                  <Tool
                    label={`Move ${selected.label} down`}
                    title="Move down (Alt+↓)"
                    disabled={index < 0 || index >= parent.children.length - 1}
                    onClick={() => actions.move('down')}
                  >
                    ↓
                  </Tool>
                </>
              ) : null}
              {editable ? (
                <Tool
                  label={`Edit ${selected.label} text`}
                  title="Edit text (Enter, or double-click)"
                  onClick={onEditText}
                >
                  ✎
                </Tool>
              ) : null}
              {parent ? (
                <>
                  <Tool
                    label={`Duplicate ${selected.label}`}
                    title="Duplicate (Ctrl+D)"
                    onClick={() => actions.duplicate()}
                  >
                    ⧉
                  </Tool>
                  <Tool
                    label={`Remove ${selected.label}`}
                    title="Remove (Delete)"
                    danger
                    onClick={() => actions.remove()}
                  >
                    ×
                  </Tool>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function Tool({
  label,
  title,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string
  title: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={danger ? 'outline-tool danger' : 'outline-tool'}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <span aria-hidden="true">{children}</span>
    </button>
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
    // Measured from the page after it commits, before the indicator paints.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
