import { useRef, useState, type DragEvent, type RefObject } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import { findNode, findPath, itemHostId, type PlacePosition } from '../selection/selection'
import { useBuilderActions, usePreferenceActions, useRegistry } from '../state/BuilderProvider'

const LAYER_DRAG = 'application/x-advui-layer'

interface DropTarget {
  id: string
  position: PlacePosition
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
  const draggingId = useRef<string | null>(null)
  const [drop, setDrop] = useState<DropTarget | null>(null)
  const hostId = itemHostId(registry, root, selectedId)
  const host = hostId ? findNode(root, hostId) : null
  const noun = host ? registry.itemNoun(host.component) : null

  const showDrop = (next: DropTarget | null) => {
    setDrop((current) => {
      if (current?.id === next?.id && current?.position === next?.position) return current
      return next
    })
  }

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
      <div
        role="tree"
        aria-label="Layers"
        onDragEnd={() => {
          draggingId.current = null
          showDrop(null)
        }}
      >
        <LayerNode
          node={root}
          root={root}
          depth={0}
          index={0}
          count={1}
          selectedId={selectedId}
          drop={drop}
          draggingId={draggingId}
          onSelect={onSelect}
          onMove={actions.move}
          onDuplicate={actions.duplicate}
          onDropTarget={showDrop}
          onPlace={actions.place}
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

function hoverPosition(
  registry: BuilderRegistry,
  event: DragEvent<HTMLDivElement>,
  node: ConfigNode,
  root: ConfigNode,
  depth: number,
  sourceId: string | null,
): PlacePosition | null {
  if (!sourceId) return null
  const source = findNode(root, sourceId)
  if (!source || findPath(source, node.id)) return null
  const rect = event.currentTarget.getBoundingClientRect()
  const ratio = rect.height === 0 ? 0.5 : (event.clientY - rect.top) / rect.height
  const inside = registry.acceptsChildren(node.component)
  if (depth === 0) return inside ? 'inside' : null
  if (inside && ratio > 0.28 && ratio < 0.72) return 'inside'
  return ratio < 0.5 ? 'before' : 'after'
}

function LayerNode({
  node,
  root,
  depth,
  index,
  count,
  selectedId,
  drop,
  draggingId,
  onSelect,
  onMove,
  onDuplicate,
  onDropTarget,
  onPlace,
}: {
  node: ConfigNode
  root: ConfigNode
  depth: number
  index: number
  count: number
  selectedId: string
  drop: DropTarget | null
  draggingId: RefObject<string | null>
  onSelect: (id: string) => void
  onMove: (direction: 'up' | 'down') => void
  onDuplicate: () => void
  onDropTarget: (drop: DropTarget | null) => void
  onPlace: (id: string, targetId: string, position: PlacePosition) => void
}) {
  const registry = useRegistry()
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0
  const selected = node.id === selectedId
  const marker = drop?.id === node.id ? drop.position : null

  const startDrag = (event: DragEvent<HTMLElement>) => {
    event.stopPropagation()
    event.dataTransfer.setData(LAYER_DRAG, node.id)
    event.dataTransfer.setData('text/plain', node.id)
    event.dataTransfer.effectAllowed = 'move'
    draggingId.current = node.id
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const position = hoverPosition(registry, event, node, root, depth, draggingId.current)
    if (!position) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    if (position === 'inside') setOpen(true)
    onDropTarget({ id: node.id, position })
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const sourceId = event.dataTransfer.getData(LAYER_DRAG) || draggingId.current
    const position = hoverPosition(registry, event, node, root, depth, sourceId)
    event.preventDefault()
    event.stopPropagation()
    draggingId.current = null
    onDropTarget(null)
    if (sourceId && position) onPlace(sourceId, node.id, position)
  }

  return (
    <div role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div
        className={['layer', selected ? 'current' : '', marker ? `drop-${marker}` : ''].filter(Boolean).join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={depth > 0}
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => {
          if (hasChildren) setOpen((value) => !value)
        }}
        onDragStart={startDrag}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={() => {
          draggingId.current = null
          onDropTarget(null)
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="layer-twist"
            draggable={false}
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
        <button
          type="button"
          className="layer-name"
          draggable={depth > 0}
          onDragStart={startDrag}
          onClick={() => onSelect(node.id)}
        >
          {node.label}
        </button>
        {selected && index > 0 ? (
          <button
            type="button"
            className="layer-move"
            draggable={false}
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
            draggable={false}
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
            draggable={false}
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
      </div>
      {open
        ? node.children.map((child, childIndex) => (
            <LayerNode
              key={child.id}
              node={child}
              root={root}
              depth={depth + 1}
              index={childIndex}
              count={node.children.length}
              selectedId={selectedId}
              drop={drop}
              draggingId={draggingId}
              onSelect={onSelect}
              onMove={onMove}
              onDuplicate={onDuplicate}
              onDropTarget={onDropTarget}
              onPlace={onPlace}
            />
          ))
        : null}
    </div>
  )
}
