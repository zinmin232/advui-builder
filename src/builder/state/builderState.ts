import { isSameValue } from '../../registry/adaptMeta'
import type { ConfigNode, PlatformId, PropMetadata } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import { canvasForTheme, DARK_CANVAS, isThemeCanvas } from '../canvasTheme'
import {
  duplicateNode,
  findNode,
  freshCopy,
  idAllocator,
  insertTargetId,
  itemHostId,
  mapTree,
  moveNode,
  placeNode,
  removeNode,
} from '../selection/selection'

export const MIN_WIDTH = 320
export const MAX_WIDTH = 1440
export const WIDTH_PRESETS = [320, 375, 768, 1024, 1440] as const
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 1.5

interface DocumentSnapshot {
  document: ConfigNode
  selectedId: string
  selectedComponent: string
}

export interface BuilderState {
  selectedComponent: string
  selectedId: string
  platform: PlatformId
  viewportWidth: number
  background: string
  theme: 'light' | 'dark'
  zoom: number
  document: ConfigNode
  past: DocumentSnapshot[]
  future: DocumentSnapshot[]
  /** Groups repeated edits of one field into a single undo step. */
  historyKey: string | null
}

export type BuilderAction =
  | { type: 'select-component'; component: string }
  | { type: 'select'; id: string }
  | { type: 'set-prop'; id: string; key: string; value: unknown }
  | { type: 'set-text'; id: string; text: string }
  | { type: 'reset' }
  | { type: 'set-platform'; platform: PlatformId }
  | { type: 'set-width'; width: number }
  | { type: 'set-background'; background: string }
  | { type: 'set-theme'; theme: 'light' | 'dark' }
  | { type: 'set-zoom'; zoom: number }
  | { type: 'insert'; component: string }
  | { type: 'add-item' }
  | { type: 'remove' }
  | { type: 'move'; direction: 'up' | 'down' }
  | { type: 'duplicate' }
  | { type: 'place'; id: string; targetId: string; position: 'before' | 'after' | 'inside' }
  | { type: 'apply-document'; document: ConfigNode; component: string }
  | { type: 'undo' }
  | { type: 'redo' }

export function clampWidth(width: number): number {
  if (Number.isNaN(width)) return 1024
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return 1
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 100) / 100))
}

export function platformWidth(platform: PlatformId): number {
  if (platform === 'android') return 390
  if (platform === 'ios') return 393
  return 1024
}

export function createBuilderState(
  registry: BuilderRegistry,
  component = registry.defaultComponent,
  partial: Partial<BuilderState> = {},
): BuilderState {
  const selectedComponent = partial.selectedComponent ?? component
  const document = partial.document ?? registry.createDocument(selectedComponent)
  return {
    platform: 'web',
    viewportWidth: 1024,
    background: DARK_CANVAS,
    theme: 'dark',
    zoom: 1,
    past: [],
    future: [],
    historyKey: null,
    ...partial,
    selectedComponent,
    document,
    selectedId: partial.selectedId ?? document.id,
  }
}

/**
 * Whether a prop value is kept on the node. Cleared and default values are left off;
 * required props keep an explicit value, even an empty one (`alt=""`).
 */
export function storesValue(prop: PropMetadata | undefined, value: unknown): boolean {
  if (value === undefined) return false
  if (value === '' && !prop?.required) return false
  return !(prop && prop.defaultValue !== undefined && isSameValue(value, prop.defaultValue))
}

function withProp(registry: BuilderRegistry, node: ConfigNode, key: string, value: unknown): ConfigNode {
  const meta = registry.get(node.component)
  const prop = meta.props.find((item) => item.key === key)
  if (value === undefined && prop?.required) return node
  const props = { ...node.props }
  if (storesValue(prop, value)) {
    props[key] = value
  } else {
    delete props[key]
  }
  if (sameProps(props, node.props)) return node
  return { ...node, props }
}

function sameProps(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (!isSameValue(left[key], right[key])) return false
  }
  return true
}

const HISTORY_LIMIT = 100

const documentActions = new Set<BuilderAction['type']>([
  'select-component',
  'set-prop',
  'set-text',
  'reset',
  'insert',
  'add-item',
  'remove',
  'move',
  'duplicate',
  'place',
  'apply-document',
])

function snapshot(state: BuilderState): DocumentSnapshot {
  return {
    document: state.document,
    selectedId: state.selectedId,
    selectedComponent: state.selectedComponent,
  }
}

function restore(state: BuilderState, snap: DocumentSnapshot): BuilderState {
  return {
    ...state,
    document: snap.document,
    selectedId: snap.selectedId,
    selectedComponent: snap.selectedComponent,
    historyKey: null,
  }
}

function historyKeyFor(action: BuilderAction): string | null {
  if (action.type === 'set-prop') return `set-prop:${action.id}:${action.key}`
  if (action.type === 'set-text') return `set-text:${action.id}`
  return null
}

function applyAction(registry: BuilderRegistry, state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'select-component': {
      const document = registry.createDocument(action.component)
      return {
        ...state,
        selectedComponent: action.component,
        document,
        selectedId: document.id,
      }
    }
    case 'select': {
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id }
    }
    case 'set-prop': {
      const document = mapTree(state.document, action.id, (node) => withProp(registry, node, action.key, action.value))
      return document === state.document ? state : { ...state, document }
    }
    case 'set-text': {
      const document = mapTree(state.document, action.id, (node) =>
        node.text === action.text ? node : { ...node, text: action.text },
      )
      return document === state.document ? state : { ...state, document }
    }
    case 'reset': {
      const document = registry.createDocument(state.selectedComponent)
      return { ...state, document, selectedId: document.id }
    }
    case 'set-platform':
      return {
        ...state,
        platform: action.platform,
        viewportWidth: platformWidth(action.platform),
      }
    case 'set-width':
      return { ...state, viewportWidth: clampWidth(action.width) }
    case 'set-background':
      return { ...state, background: action.background }
    case 'set-theme':
      return {
        ...state,
        theme: action.theme,
        background: isThemeCanvas(state.background) ? canvasForTheme(action.theme) : state.background,
      }
    case 'set-zoom':
      return { ...state, zoom: clampZoom(action.zoom) }
    case 'insert': {
      const targetId = insertTargetId(registry, state.document, state.selectedId)
      if (!targetId) return state
      const child = freshCopy(state.document, registry.createDocument(action.component))
      return {
        ...state,
        document: mapTree(state.document, targetId, (node) => ({
          ...node,
          children: [...node.children, child],
        })),
        selectedId: child.id,
      }
    }
    case 'add-item': {
      const hostId = itemHostId(registry, state.document, state.selectedId)
      const host = hostId ? findNode(state.document, hostId) : null
      const added = host ? registry.addItem(host, idAllocator(state.document)) : null
      if (!host || !added) return state
      return {
        ...state,
        document: mapTree(state.document, host.id, () => added.node),
        selectedId: added.selectedId,
      }
    }
    case 'remove': {
      const removed = removeNode(state.document, state.selectedId)
      if (!removed) return state
      return { ...state, document: removed.tree, selectedId: removed.parentId }
    }
    case 'move': {
      const document = moveNode(state.document, state.selectedId, action.direction)
      if (!document) return state
      return { ...state, document }
    }
    case 'duplicate': {
      const duplicated = duplicateNode(state.document, state.selectedId)
      if (!duplicated) return state
      return { ...state, document: duplicated.tree, selectedId: duplicated.copyId }
    }
    case 'place': {
      const document = placeNode(registry, state.document, action.id, action.targetId, action.position)
      if (!document) return state
      return { ...state, document, selectedId: action.id }
    }
    case 'apply-document':
      return {
        ...state,
        selectedComponent: action.component,
        document: action.document,
        selectedId: action.document.id,
      }
    default:
      return state
  }
}

export type BuilderReducer = (state: BuilderState, action: BuilderAction) => BuilderState

/** The reducer for one registry. Everything component-specific comes from the registry. */
export function createBuilderReducer(registry: BuilderRegistry): BuilderReducer {
  return (state, action) => reduce(registry, state, action)
}

function reduce(registry: BuilderRegistry, state: BuilderState, action: BuilderAction): BuilderState {
  if (action.type === 'undo') {
    const previous = state.past.at(-1)
    if (!previous) return state
    return {
      ...restore(state, previous),
      past: state.past.slice(0, -1),
      future: [snapshot(state), ...state.future],
    }
  }
  if (action.type === 'redo') {
    const next = state.future[0]
    if (!next) return state
    return {
      ...restore(state, next),
      past: [...state.past, snapshot(state)],
      future: state.future.slice(1),
    }
  }

  const next = applyAction(registry, state, action)
  if (next === state) return state
  if (!documentActions.has(action.type)) {
    return state.historyKey ? { ...next, historyKey: null } : next
  }

  const key = historyKeyFor(action)
  if (key && key === state.historyKey) {
    return { ...next, past: state.past, future: [], historyKey: key }
  }
  return {
    ...next,
    past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
    historyKey: key,
  }
}
