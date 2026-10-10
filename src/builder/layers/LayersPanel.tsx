import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { useDragSource, useDragState, useDropSurface, useKeyboardMove, type KeyboardMove } from '../dnd/BuilderDnd'
import { findNode, findPath, itemHostId, type PlacePosition } from '../selection/selection'
import { useBuilderActions, usePreferenceActions, useRegistry } from '../state/BuilderProvider'

/**
 * The ids from the root down to one row. A row gets a trail only when it lies on it, so a new selection or drop
 * target re-renders the rows along the old and new trails, not the whole tree.
 */
type Trail = readonly string[]

interface DropMarker {
  trail: Trail
  position: PlacePosition
  /** A keyboard move, whose target can be anywhere in the tree, so its row scrolls into view. */
  keyboard: boolean
}

function trailTo(root: ConfigNode, id: string): Trail | null {
  return findPath(root, id)?.map((node) => node.id) ?? null
}

export function LayersPanel({
  root,
  selectedId,
  onSelect,
}: {
  root: ConfigNode
  selectedId: string
  onSelect: (id: string) => void
}) {
  const preferenceActions = usePreferenceActions()
  const actions = useBuilderActions()
  const registry = useRegistry()
  const [tree, setTree] = useState<HTMLDivElement | null>(null)
  useDropSurface('layers', tree)
  const hostId = itemHostId(registry, root, selectedId)
  const host = hostId ? findNode(root, hostId) : null
  const noun = host ? registry.itemNoun(host.component) : null
  const selection = useMemo(() => trailTo(root, selectedId), [root, selectedId])
  const { target, keyboard } = useDragState()
  const keyboardMove = useKeyboardMove()
  const dropId = target?.surface === 'layers' ? target.id : null
  const dropPosition = target?.surface === 'layers' ? target.position : null
  const drop = useMemo<DropMarker | null>(() => {
    const trail = dropId && dropPosition ? trailTo(root, dropId) : null
    return trail && dropPosition ? { trail, position: dropPosition, keyboard } : null
  }, [root, dropId, dropPosition, keyboard])

  return (
    <section className="layers" aria-label="Component Properties">
      <div className="layers-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Collapse inspector"
          aria-pressed={false}
          onClick={() => preferenceActions.update({ inspectorCollapsed: true })}
        >
          ☰
        </button>
        <h2>Component Properties</h2>
      </div>
      <h3>Layers</h3>
      <div ref={setTree} role="tree" aria-label="Layers">
        <LayerNode
          node={root}
          depth={0}
          index={0}
          count={1}
          selection={selection?.[0] === root.id ? selection : null}
          drop={drop?.trail[0] === root.id ? drop : null}
          onSelect={onSelect}
          onMove={actions.move}
          onDuplicate={actions.duplicate}
          keyboardMove={keyboardMove}
        />
      </div>
      {host && noun ? (
        <button type="button" className="text-btn layer-add" onClick={actions.addItem}>
          + Add {noun} to {host.label}
        </button>
      ) : null}
    </section>
  )
}

// The inner function has another name: inside it, `LayerNode` must mean the memoized one.
const LayerNode = memo(function LayerRow({
  node,
  depth,
  index,
  count,
  selection,
  drop,
  onSelect,
  onMove,
  onDuplicate,
  keyboardMove,
}: {
  node: ConfigNode
  depth: number
  index: number
  count: number
  /** The trail to the selected row, when this row is on it. */
  selection: Trail | null
  /** The trail to the row under a drag, when this row is on it. */
  drop: DropMarker | null
  onSelect: (id: string) => void
  onMove: (direction: 'up' | 'down') => void
  onDuplicate: () => void
  keyboardMove: KeyboardMove
}) {
  const [open, setOpen] = useState(true)
  const row = useRef<HTMLDivElement | null>(null)
  // The root layer stays put; every other row can be dragged onto the canvas or another row.
  const { setNodeRef, listeners, attributes, isDragging } = useDragSource(
    `layer:${node.id}`,
    { kind: 'layer', id: node.id, component: node.component, label: node.label },
    depth === 0,
  )
  const hasChildren = node.children.length > 0
  const selected = selection?.at(-1) === node.id
  const marker = drop?.trail.at(-1) === node.id ? drop.position : null
  // A drop inside a collapsed layer, or below it (a keyboard move walks the whole tree), shows its children.
  if (drop && (marker === null || marker === 'inside') && !open && hasChildren) setOpen(true)

  const follow = marker !== null && drop?.keyboard === true
  useEffect(() => {
    if (follow) row.current?.scrollIntoView({ block: 'nearest' })
  }, [follow, marker])

  return (
    <div role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div
        ref={(element) => {
          setNodeRef(element)
          row.current = element
        }}
        data-layer-id={node.id}
        className={['layer', selected ? 'current' : '', marker ? `drop-${marker}` : '', isDragging ? 'dragging' : '']
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
        {...(depth > 0 ? listeners : {})}
        {...(depth > 0 ? { 'aria-roledescription': attributes['aria-roledescription'] } : {})}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => {
          if (hasChildren) setOpen((value) => !value)
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="layer-twist"
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.label}`}
            onClick={(event) => {
              event.stopPropagation()
              setOpen((value) => !value)
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="layer-twist spacer" />
        )}
        <button type="button" className="layer-name" onClick={() => onSelect(node.id)}>
          {node.label}
        </button>
        {selected && index > 0 ? (
          <button
            type="button"
            className="layer-move"
            aria-label={`Move ${node.label} up`}
            onClick={(event) => {
              event.stopPropagation()
              onMove('up')
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            ↑
          </button>
        ) : null}
        {selected && index < count - 1 ? (
          <button
            type="button"
            className="layer-move"
            aria-label={`Move ${node.label} down`}
            onClick={(event) => {
              event.stopPropagation()
              onMove('down')
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            ↓
          </button>
        ) : null}
        {selected && depth > 0 ? (
          <button
            type="button"
            className="layer-move"
            aria-label={`Duplicate ${node.label}`}
            onClick={(event) => {
              event.stopPropagation()
              onDuplicate()
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            ⧉
          </button>
        ) : null}
        {selected && depth > 0 ? (
          <button
            type="button"
            className="layer-move"
            aria-label={`Move ${node.label} with the keyboard`}
            aria-describedby={keyboardMove.hintId}
            title="Move with the arrow keys: Enter drops, Escape cancels"
            onClick={(event) => {
              event.stopPropagation()
              keyboardMove.start(node.id)
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            ✥
          </button>
        ) : null}
      </div>
      {open
        ? node.children.map((child, childIndex) => (
            <LayerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIndex}
              count={node.children.length}
              selection={selection?.[depth + 1] === child.id ? selection : null}
              drop={drop?.trail[depth + 1] === child.id ? drop : null}
              onSelect={onSelect}
              onMove={onMove}
              onDuplicate={onDuplicate}
              keyboardMove={keyboardMove}
            />
          ))
        : null}
    </div>
  )
})
