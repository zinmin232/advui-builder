import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import type { LayoutAxis } from '../preview/measure'
import { canDrop, findPath, type PlacePosition } from '../selection/selection'

export interface Point {
  x: number
  y: number
}

export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export interface DropTarget {
  id: string
  position: PlacePosition
  /** How the target's siblings flow, so the drop line is drawn on the right edge. */
  axis: LayoutAxis
}

/** What is being dragged: a new component from the sidebar, or a layer already in the tree. */
export interface DragSubject {
  component: string
  movingId?: string
}

/**
 * Where on a layer the pointer is. Containers take the middle half as "inside"; the edges, and
 * every other layer, split into before and after along the axis the parent lays children out on.
 */
export function dropPosition(
  box: Box,
  pointer: Point,
  layer: { container: boolean; empty: boolean; root: boolean; axis: LayoutAxis },
): PlacePosition {
  if (layer.root || (layer.container && layer.empty)) return 'inside'
  const ratio =
    layer.axis === 'horizontal'
      ? (pointer.x - box.left) / Math.max(1, box.width)
      : (pointer.y - box.top) / Math.max(1, box.height)
  if (layer.container && ratio > 0.25 && ratio < 0.75) return 'inside'
  return ratio < 0.5 ? 'before' : 'after'
}

/**
 * The drop for a pointer over `hitId`: the deepest layer, walking up from the one under the pointer,
 * where the registry's drop rules accept the dragged component. `measure` gives a layer's box and axis.
 */
export function resolveDrop(
  registry: BuilderRegistry,
  root: ConfigNode,
  hitId: string,
  pointer: Point,
  subject: DragSubject,
  measure: (id: string) => { box: Box; axis: LayoutAxis } | null,
): DropTarget | null {
  const path = findPath(root, hitId)
  // A layer cannot be dropped onto itself or into its own children.
  if (!path || (subject.movingId && path.some((node) => node.id === subject.movingId))) return null
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const node = path[index]
    const measured = measure(node.id)
    if (!measured) continue
    const container = registry.acceptsChildren(node.component)
    const position = dropPosition(measured.box, pointer, {
      container,
      empty: node.children.length === 0,
      root: index === 0,
      axis: measured.axis,
    })
    const accepts = (at: PlacePosition) => canDrop(registry, root, subject.component, node.id, at, subject.movingId)
    if (accepts(position)) return { id: node.id, position, axis: measured.axis }
    if (container && position !== 'inside' && accepts('inside')) {
      return { id: node.id, position: 'inside', axis: measured.axis }
    }
    // An empty container is all "inside". What cannot go in it (a sibling column) lands beside it instead.
    if (position === 'inside' && index > 0) {
      const leaf = { container: false, empty: false, root: false, axis: measured.axis }
      const edge = dropPosition(measured.box, pointer, leaf)
      if (accepts(edge)) return { id: node.id, position: edge, axis: measured.axis }
    }
  }
  return null
}
