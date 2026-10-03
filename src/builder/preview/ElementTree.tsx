import { memo, type ReactNode } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { Selectable } from './Selectable'

export type NodeRenderer = (node: ConfigNode, children: ReactNode) => ReactNode

export const ElementTree = memo(function ElementTree({
  node,
  renderNode,
}: {
  node: ConfigNode
  renderNode: NodeRenderer
}) {
  return (
    <Selectable id={node.id}>
      {renderNode(
        node,
        node.children.map((child) => <ElementTree key={child.id} node={child} renderNode={renderNode} />),
      )}
    </Selectable>
  )
})
