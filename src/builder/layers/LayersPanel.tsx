import { useState } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { useDragSource, useDragState, useDropSurface } from '../dnd/BuilderDnd'
import { findNode, itemHostId } from '../selection/selection'
import { useBuilderActions, usePreferenceActions, useRegistry } from '../state/BuilderProvider'

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
          selectedId={selectedId}
          onSelect={onSelect}
          onMove={actions.move}
          onDuplicate={actions.duplicate}
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

function LayerNode({
  node,
  depth,
  index,
  count,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
}: {
  node: ConfigNode
  depth: number
  index: number
  count: number
  selectedId: string
  onSelect: (id: string) => void
  onMove: (direction: 'up' | 'down') => void
  onDuplicate: () => void
}) {
  const [open, setOpen] = useState(true)
  const { target } = useDragState()
  // The root layer stays put; every other row can be dragged onto the canvas or another row.
  const { setNodeRef, listeners, attributes, isDragging } = useDragSource(
    `layer:${node.id}`,
    { kind: 'layer', id: node.id, component: node.component, label: node.label },
    depth === 0,
  )
  const hasChildren = node.children.length > 0
  const selected = node.id === selectedId
  const marker = target?.surface === 'layers' && target.id === node.id ? target.position : null
  // Dropping inside a collapsed layer shows its children, so the result is visible.
  if (marker === 'inside' && !open && hasChildren) setOpen(true)

  return (
    <div role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
      <div
        ref={setNodeRef}
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
      </div>
      {open
        ? node.children.map((child, childIndex) => (
            <LayerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIndex}
              count={node.children.length}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              onDuplicate={onDuplicate}
            />
          ))
        : null}
    </div>
  )
}
