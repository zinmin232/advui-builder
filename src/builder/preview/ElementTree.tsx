import { memo, type ReactNode } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { useRegistry } from '../state/BuilderProvider'
import { Selectable } from './Selectable'

export type NodeRenderer = (node: ConfigNode, children: ReactNode) => ReactNode

/** Fills an empty container in the preview so it has a size to click and drop onto. Never part of the code. */
function EmptySlot({ root }: { root: boolean }) {
  return (
    <div className={root ? 'empty-slot root' : 'empty-slot'} aria-hidden="true">
      {root ? 'Drag components here from the sidebar, or click one to add it' : 'Drop components here'}
    </div>
  )
}

export const ElementTree = memo(function ElementTree({
  node,
  renderNode,
  depth = 0,
}: {
  node: ConfigNode
  renderNode: NodeRenderer
  depth?: number
}) {
  const registry = useRegistry()
  const empty = node.children.length === 0 && registry.acceptsChildren(node.component)
  const invisible = registry.has(node.component) && registry.get(node.component).invisible === true
  return (
    <Selectable id={node.id} invisible={invisible}>
      {renderNode(
        node,
        empty
          ? [<EmptySlot key="empty-slot" root={depth === 0} />]
          : node.children.map((child) => (
              <ElementTree key={child.id} node={child} renderNode={renderNode} depth={depth + 1} />
            )),
      )}
    </Selectable>
  )
})
