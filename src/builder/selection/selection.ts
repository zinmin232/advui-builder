import type { ConfigNode, SelectionContext } from '../../registry/metadata'
import { acceptsChildren, itemNoun } from '../../registry/componentRegistry'

export function findPath(root: ConfigNode, id: string): ConfigNode[] | null {
  if (root.id === id) return [root]
  for (const child of root.children) {
    const nested = findPath(child, id)
    if (nested) return [root, ...nested]
  }
  return null
}

export function insertTargetId(root: ConfigNode, selectedId: string): string | null {
  const path = findPath(root, selectedId)
  if (!path) return null
  const node = path[path.length - 1]
  if (acceptsChildren(node.component)) return node.id
  if (path.length < 2) return null
  const parent = path[path.length - 2]
  return acceptsChildren(parent.component) ? parent.id : null
}

export function findNode(root: ConfigNode, id: string): ConfigNode | null {
  const path = findPath(root, id)
  return path ? path[path.length - 1] : null
}

export function selectionFrom(root: ConfigNode, id: string): SelectionContext | null {
  const path = findPath(root, id)
  if (!path) return null
  const node = path[path.length - 1]
  return {
    component: root.component,
    element: node.component,
    path: path.map((item) => item.label),
    ids: path.map((item) => item.id),
    props: node.props,
  }
}

export function removeNode(root: ConfigNode, id: string): { tree: ConfigNode; parentId: string } | null {
  if (root.id === id) return null
  const next = dropChild(root, id)
  return next.removed && next.parentId ? { tree: next.node, parentId: next.parentId } : null
}

function dropChild(node: ConfigNode, id: string): { node: ConfigNode; removed: boolean; parentId: string | null } {
  const index = node.children.findIndex((child) => child.id === id)
  if (index >= 0) {
    return {
      node: { ...node, children: node.children.filter((child) => child.id !== id) },
      removed: true,
      parentId: node.id,
    }
  }
  for (let index = 0; index < node.children.length; index += 1) {
    const nested = dropChild(node.children[index], id)
    if (!nested.removed) continue
    const children = node.children.slice()
    children[index] = nested.node
    return { node: { ...node, children }, removed: true, parentId: nested.parentId }
  }
  return { node, removed: false, parentId: null }
}

function collectIds(node: ConfigNode, used: Set<string>) {
  used.add(node.id)
  node.children.forEach((child) => collectIds(child, used))
}

function uniqueId(used: Set<string>, component: string): string {
  const base = component.toLowerCase().replace(/\./g, '-')
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

function cloneNode(node: ConfigNode, used: Set<string>): ConfigNode {
  const id = uniqueId(used, node.component)
  used.add(id)
  return {
    id,
    component: node.component,
    label: node.label,
    props: structuredClone(node.props),
    text: node.text,
    children: node.children.map((child) => cloneNode(child, used)),
  }
}

/** Hands out ids that are unused in `root`, never the same one twice. */
export function idAllocator(root: ConfigNode): (component: string) => string {
  const used = new Set<string>()
  collectIds(root, used)
  return (component) => {
    const id = uniqueId(used, component)
    used.add(id)
    return id
  }
}

/**
 * The Select, RadioGroup, Tabs, List or menu that an "add item" applies to:
 * the selection itself or the host it belongs to. A container in between
 * (a Tabs panel holding Text) ends the search.
 */
export function itemHostId(root: ConfigNode, selectedId: string): string | null {
  const path = findPath(root, selectedId)
  if (!path) return null
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const node = path[index]
    if (itemNoun(node.component)) return node.id
    if (index < path.length - 1 && acceptsChildren(node.component)) return null
  }
  return null
}

/** Copies a subtree with ids that are not used anywhere in `root`. */
export function freshCopy(root: ConfigNode, node: ConfigNode): ConfigNode {
  const used = new Set<string>()
  collectIds(root, used)
  return cloneNode(node, used)
}

export function duplicateNode(root: ConfigNode, id: string): { tree: ConfigNode; copyId: string } | null {
  if (root.id === id) return null
  const used = new Set<string>()
  collectIds(root, used)
  return copyBeside(root, id, used)
}

function copyBeside(
  node: ConfigNode,
  id: string,
  used: Set<string>,
): { tree: ConfigNode; copyId: string } | null {
  const index = node.children.findIndex((child) => child.id === id)
  if (index >= 0) {
    const copy = cloneNode(node.children[index], used)
    const children = node.children.slice()
    children.splice(index + 1, 0, copy)
    return { tree: { ...node, children }, copyId: copy.id }
  }
  for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
    const nested = copyBeside(node.children[childIndex], id, used)
    if (!nested) continue
    const children = node.children.slice()
    children[childIndex] = nested.tree
    return { tree: { ...node, children }, copyId: nested.copyId }
  }
  return null
}

export function moveNode(root: ConfigNode, id: string, direction: 'up' | 'down'): ConfigNode | null {
  const next = shiftChild(root, id, direction === 'up' ? -1 : 1)
  return next.moved ? next.node : null
}

function shiftChild(
  node: ConfigNode,
  id: string,
  delta: -1 | 1,
): { node: ConfigNode; moved: boolean } {
  const index = node.children.findIndex((child) => child.id === id)
  const target = index + delta
  if (index >= 0) {
    if (target < 0 || target >= node.children.length) return { node, moved: false }
    const children = node.children.slice()
    const [item] = children.splice(index, 1)
    children.splice(target, 0, item)
    return { node: { ...node, children }, moved: true }
  }
  for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
    const nested = shiftChild(node.children[childIndex], id, delta)
    if (!nested.moved) continue
    const children = node.children.slice()
    children[childIndex] = nested.node
    return { node: { ...node, children }, moved: true }
  }
  return { node, moved: false }
}

export type PlacePosition = 'before' | 'after' | 'inside'

function sameOrder(left: ConfigNode, right: ConfigNode): boolean {
  if (left.id !== right.id || left.children.length !== right.children.length) return false
  return left.children.every((child, index) => sameOrder(child, right.children[index]))
}

function containsId(node: ConfigNode, id: string): boolean {
  return node.id === id || node.children.some((child) => containsId(child, id))
}

/** Moves a layer beside another sibling or into a container. Returns null when the drop changes nothing. */
export function placeNode(
  root: ConfigNode,
  sourceId: string,
  targetId: string,
  position: PlacePosition,
): ConfigNode | null {
  if (sourceId === root.id || sourceId === targetId) return null
  const source = findNode(root, sourceId)
  const target = findNode(root, targetId)
  if (!source || !target || containsId(source, targetId)) return null
  if (position === 'inside') {
    if (!acceptsChildren(target.component)) return null
  } else if (targetId === root.id) {
    return null
  }

  const removed = removeNode(root, sourceId)
  if (!removed || !findNode(removed.tree, targetId)) return null
  const next =
    position === 'inside'
      ? mapTree(removed.tree, targetId, (node) => ({ ...node, children: [...node.children, source] }))
      : insertBeside(removed.tree, targetId, source, position)
  if (!next || sameOrder(root, next)) return null
  return next
}

function insertBeside(
  node: ConfigNode,
  targetId: string,
  source: ConfigNode,
  position: 'before' | 'after',
): ConfigNode | null {
  const index = node.children.findIndex((child) => child.id === targetId)
  if (index >= 0) {
    const children = node.children.slice()
    children.splice(position === 'before' ? index : index + 1, 0, source)
    return { ...node, children }
  }
  for (let childIndex = 0; childIndex < node.children.length; childIndex += 1) {
    const nested = insertBeside(node.children[childIndex], targetId, source, position)
    if (!nested) continue
    const children = node.children.slice()
    children[childIndex] = nested
    return { ...node, children }
  }
  return null
}

export function mapTree(
  node: ConfigNode,
  id: string,
  update: (node: ConfigNode) => ConfigNode,
): ConfigNode {
  if (node.id === id) return update(node)
  let changed = false
  const children = node.children.map((child) => {
    const next = mapTree(child, id, update)
    if (next !== child) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}
