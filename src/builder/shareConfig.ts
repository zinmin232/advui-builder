import { componentRegistry, createDocument, getMeta, sidebarEntries } from '../registry/componentRegistry'
import type { ComponentMetadata, ConfigNode, PlatformId, PropMetadata } from '../registry/metadata'
import type { BuilderState } from './state/builderState'
import { builderReducer, storesValue } from './state/builderState'

/**
 * Shareable configuration. Root-only edits stay readable
 * (`?component=button&variant=secondary`); any edit below the root
 * carries the whole tree in `doc`.
 */
export interface BuilderConfiguration {
  component: string
  props: Record<string, unknown>
  text?: string
  platform?: PlatformId
  viewportWidth?: number
  /** Full tree, set when nested layers differ from the component template. */
  document?: ConfigNode
}

const reserved = new Set(['component', 'text', 'platform', 'viewport', 'doc'])
const MAX_NODES = 500
const MAX_DEPTH = 24

export function matchComponent(name: string): string | null {
  const needle = name.toLowerCase()
  return (
    sidebarEntries().find((entry) => entry.name.toLowerCase() === needle || entry.slug === needle)?.name ??
    null
  )
}

/** Props a link may set: real component props, not the content or typography editors. */
function shareableProps(meta: ComponentMetadata): PropMetadata[] {
  return meta.props.filter((prop) => !prop.textContent && prop.type !== 'typography' && !reserved.has(prop.key))
}

/** Reads a link or tree value as the prop's own type. Anything else is dropped. */
function typedValue(prop: PropMetadata, value: unknown): unknown {
  switch (prop.type) {
    case 'boolean':
      if (typeof value === 'boolean') return value
      return value === 'true' ? true : value === 'false' ? false : undefined
    case 'number':
    case 'spacing':
    case 'radius':
      if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
      return typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : undefined
    case 'select':
      if (typeof value !== 'string') return undefined
      return !prop.options || prop.options.some((option) => option.value === value) ? value : undefined
    case 'string':
    case 'color':
    case 'icon':
      return typeof value === 'string' ? value : undefined
    default:
      return undefined
  }
}

function readProps(meta: ComponentMetadata, read: (key: string) => unknown): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  for (const prop of shareableProps(meta)) {
    const value = typedValue(prop, read(prop.key))
    if (storesValue(prop, value)) props[prop.key] = value
  }
  return props
}

function sameBelowRoot(document: ConfigNode, template: ConfigNode): boolean {
  return (
    document.id === template.id &&
    document.label === template.label &&
    JSON.stringify(document.children) === JSON.stringify(template.children)
  )
}

export function toConfiguration(state: BuilderState): BuilderConfiguration {
  const template = createDocument(state.selectedComponent)
  const nested = !sameBelowRoot(state.document, template)
  return {
    component: state.selectedComponent,
    props: nested ? {} : { ...state.document.props },
    text: nested || state.document.text === template.text ? undefined : state.document.text,
    platform: state.platform,
    viewportWidth: state.viewportWidth,
    document: nested ? state.document : undefined,
  }
}

function compact(node: ConfigNode): Record<string, unknown> {
  const out: Record<string, unknown> = { id: node.id, component: node.component, label: node.label }
  if (Object.keys(node.props).length > 0) out.props = node.props
  if (node.text != null) out.text = node.text
  if (node.children.length > 0) out.children = node.children.map(compact)
  return out
}

export function configurationToSearch(config: BuilderConfiguration): string {
  const params = new URLSearchParams()
  params.set('component', config.component)
  if (config.text != null) params.set('text', config.text)
  if (config.platform) params.set('platform', config.platform)
  if (config.viewportWidth) params.set('viewport', String(config.viewportWidth))
  for (const [key, value] of Object.entries(config.props)) {
    if (reserved.has(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
  }
  if (config.document) params.set('doc', JSON.stringify(compact(config.document)))
  return params.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses an untrusted `doc` tree. Unknown components, duplicate ids, or an oversized tree reject it. */
function parseDocument(raw: string, component: string): ConfigNode | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  const ids = new Set<string>()
  const read = (value: unknown, depth: number): ConfigNode | null => {
    if (depth > MAX_DEPTH || ids.size >= MAX_NODES || !isRecord(value)) return null
    const { id, component: name, label, props, text, children } = value
    if (typeof id !== 'string' || id === '' || ids.has(id)) return null
    if (typeof name !== 'string' || !Object.hasOwn(componentRegistry, name)) return null
    if (children !== undefined && !Array.isArray(children)) return null
    ids.add(id)
    const meta = getMeta(name)
    const source = isRecord(props) ? props : {}
    const node: ConfigNode = {
      id,
      component: name,
      label: typeof label === 'string' && label !== '' ? label : meta.name,
      props: readProps(meta, (key) => (Object.hasOwn(source, key) ? source[key] : undefined)),
      children: [],
    }
    if (typeof text === 'string') node.text = text
    for (const child of children ?? []) {
      const parsed = read(child, depth + 1)
      if (!parsed) return null
      node.children.push(parsed)
    }
    return node
  }
  const root = read(data, 0)
  return root?.component === component ? root : null
}

export function configurationFromSearch(search: string): BuilderConfiguration | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawComponent = params.get('component')
  if (!rawComponent) return null
  const component = matchComponent(rawComponent)
  if (!component) return null
  const platformValue = params.get('platform')
  const platform =
    platformValue === 'web' || platformValue === 'android' || platformValue === 'ios'
      ? platformValue
      : undefined
  const viewportRaw = params.get('viewport')
  const viewportWidth = viewportRaw ? Number(viewportRaw) : undefined
  const docRaw = params.get('doc')
  const document = docRaw ? parseDocument(docRaw, component) : null
  if (document) return { component, props: {}, platform, viewportWidth, document }
  return {
    component,
    props: readProps(getMeta(component), (key) => params.get(key) ?? undefined),
    text: params.get('text') ?? undefined,
    platform,
    viewportWidth,
  }
}

export function applyConfiguration(state: BuilderState, config: BuilderConfiguration): BuilderState {
  let next = config.document
    ? builderReducer(state, { type: 'apply-document', document: config.document, component: config.component })
    : builderReducer(state, { type: 'select-component', component: config.component })
  const rootId = next.document.id
  for (const [key, value] of Object.entries(config.props)) {
    next = builderReducer(next, { type: 'set-prop', id: rootId, key, value })
  }
  if (config.text != null) {
    next = builderReducer(next, { type: 'set-text', id: rootId, text: config.text })
  }
  if (config.platform) next = builderReducer(next, { type: 'set-platform', platform: config.platform })
  if (config.viewportWidth) next = builderReducer(next, { type: 'set-width', width: config.viewportWidth })
  return { ...next, past: [], future: [], historyKey: null }
}

export function stateFromLocation(search: string, base: BuilderState): BuilderState {
  const config = configurationFromSearch(search)
  if (!config) return base
  return applyConfiguration(base, config)
}

export function shareUrl(state: BuilderState, location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}?${configurationToSearch(toConfiguration(state))}`
}
