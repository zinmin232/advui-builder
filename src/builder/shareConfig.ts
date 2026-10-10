import type { ComponentMetadata, ConfigNode, PlatformId, PropMetadata } from '../registry/metadata'
import type { BuilderRegistry } from '../registry/registry'
import { breakpointKeys, isResponsiveMap } from '../registry/responsive'
import type { BuilderState } from './state/builderState'
import { createBuilderReducer, storesValue } from './state/builderState'

/**
 * Shareable configuration. Root-only edits stay readable
 * (`?component=button&variant=secondary`); any edit below the root
 * carries the whole tree in `doc`. A page (`mode=page`) always carries `doc`.
 */
export interface BuilderConfiguration {
  component: string
  /** Set for a page. `component` is then the component Component mode returns to. */
  mode?: 'page'
  props: Record<string, unknown>
  text?: string
  platform?: PlatformId
  viewportWidth?: number
  /** Full tree, set when nested layers differ from the component template. */
  document?: ConfigNode
}

const reserved = new Set(['component', 'mode', 'text', 'platform', 'viewport', 'doc'])

/** How much of an untrusted tree to read. */
export interface TreeLimits {
  nodes: number
  depth: number
  /** Drop a broken layer (an unknown component, a duplicate id) with its children, instead of the whole tree. */
  lenient?: boolean
}

const linkLimits: TreeLimits = { nodes: 500, depth: 24 }

/**
 * Props a link or tree may set: real component props, not the content or typography editors. A link parameter
 * can't set a prop whose name the link itself uses.
 */
function shareableProps(meta: ComponentMetadata, parameters: boolean): PropMetadata[] {
  return meta.props.filter(
    (prop) => !prop.textContent && prop.type !== 'typography' && !(parameters && reserved.has(prop.key)),
  )
}

/**
 * Reads a link or tree value as the prop's own type. Anything else is dropped. A responsive prop also takes a map
 * keyed by `keys` (`base` and the breakpoints), which only a tree can hold.
 */
function typedValue(prop: PropMetadata, value: unknown, keys: readonly string[]): unknown {
  if (prop.responsive && prop.type !== 'object' && isResponsiveMap(value)) {
    const map: Record<string, unknown> = {}
    for (const key of keys) {
      const typed = typedValue({ ...prop, responsive: false }, value[key], keys)
      if (typed !== undefined) map[key] = typed
    }
    return Object.keys(map).length > 0 ? map : undefined
  }
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
    case 'object':
      return isRecord(value) ? value : undefined
    case 'array':
      return Array.isArray(value) ? value : undefined
    default:
      return undefined
  }
}

function readProps(
  registry: BuilderRegistry,
  meta: ComponentMetadata,
  read: (key: string) => unknown,
  parameters = false,
): Record<string, unknown> {
  const keys = breakpointKeys(registry.breakpoints)
  const props: Record<string, unknown> = {}
  for (const prop of shareableProps(meta, parameters)) {
    const value = typedValue(prop, read(prop.key), keys)
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

export function toConfiguration(registry: BuilderRegistry, state: BuilderState): BuilderConfiguration {
  if (state.mode === 'page') {
    return {
      component: state.selectedComponent,
      mode: 'page',
      props: {},
      platform: state.platform,
      viewportWidth: state.viewportWidth,
      document: state.document,
    }
  }
  const template = registry.createDocument(state.selectedComponent)
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

/** A tree without empty `props` and `children`, as links and saved pages store it. `readTree` reads it back. */
export function compactTree(node: ConfigNode): Record<string, unknown> {
  const out: Record<string, unknown> = { id: node.id, component: node.component, label: node.label }
  if (Object.keys(node.props).length > 0) out.props = node.props
  if (node.text != null) out.text = node.text
  if (node.children.length > 0) out.children = node.children.map(compactTree)
  return out
}

export function configurationToSearch(config: BuilderConfiguration): string {
  const params = new URLSearchParams()
  params.set('component', config.component)
  if (config.mode) params.set('mode', config.mode)
  if (config.text != null) params.set('text', config.text)
  if (config.platform) params.set('platform', config.platform)
  if (config.viewportWidth) params.set('viewport', String(config.viewportWidth))
  for (const [key, value] of Object.entries(config.props)) {
    if (reserved.has(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
  }
  if (config.document) params.set('doc', JSON.stringify(compactTree(config.document)))
  return params.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads an untrusted tree whose root must be `component`. Unknown components, duplicate ids, or a tree past the
 * limits reject it; with `lenient`, only the broken layers are dropped. Props are read as their own type.
 */
export function readTree(
  registry: BuilderRegistry,
  data: unknown,
  component: string,
  limits: TreeLimits = linkLimits,
): ConfigNode | null {
  const ids = new Set<string>()
  const read = (value: unknown, depth: number): ConfigNode | null => {
    if (depth > limits.depth || ids.size >= limits.nodes || !isRecord(value)) return null
    const { id, component: name, label, props, text, children } = value
    if (typeof id !== 'string' || id === '' || ids.has(id)) return null
    if (typeof name !== 'string' || !registry.has(name)) return null
    if (children !== undefined && !Array.isArray(children) && !limits.lenient) return null
    ids.add(id)
    const meta = registry.get(name)
    const source = isRecord(props) ? props : {}
    const node: ConfigNode = {
      id,
      component: name,
      label: typeof label === 'string' && label !== '' ? label : meta.name,
      props: readProps(registry, meta, (key) => (Object.hasOwn(source, key) ? source[key] : undefined)),
      children: [],
    }
    if (typeof text === 'string') node.text = text
    for (const child of Array.isArray(children) ? children : []) {
      const parsed = read(child, depth + 1)
      if (parsed) node.children.push(parsed)
      else if (!limits.lenient) return null
    }
    return node
  }
  const root = read(data, 0)
  return root?.component === component ? root : null
}

function parseDocument(registry: BuilderRegistry, raw: string, component: string): ConfigNode | null {
  try {
    return readTree(registry, JSON.parse(raw), component)
  } catch {
    return null
  }
}

export function configurationFromSearch(registry: BuilderRegistry, search: string): BuilderConfiguration | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const rawComponent = params.get('component')
  if (!rawComponent) return null
  const component = registry.match(rawComponent)
  if (!component) return null
  const platformValue = params.get('platform')
  const platform =
    platformValue === 'web' || platformValue === 'android' || platformValue === 'ios' ? platformValue : undefined
  const viewportRaw = params.get('viewport')
  const viewportWidth = viewportRaw ? Number(viewportRaw) : undefined
  const docRaw = params.get('doc')
  if (params.get('mode') === 'page' && registry.hasPage) {
    const page = docRaw ? parseDocument(registry, docRaw, registry.createPage().component) : null
    return { component, mode: 'page', props: {}, platform, viewportWidth, document: page ?? undefined }
  }
  const document = docRaw ? parseDocument(registry, docRaw, component) : null
  if (document) return { component, props: {}, platform, viewportWidth, document }
  return {
    component,
    props: readProps(registry, registry.get(component), (key) => params.get(key) ?? undefined, true),
    text: params.get('text') ?? undefined,
    platform,
    viewportWidth,
  }
}

export function applyConfiguration(
  registry: BuilderRegistry,
  state: BuilderState,
  config: BuilderConfiguration,
): BuilderState {
  const builderReducer = createBuilderReducer(registry)
  let next = builderReducer(state, { type: 'select-component', component: config.component })
  // A page opens on top of its component, so switching to Component mode shows that component.
  if (config.mode === 'page') next = builderReducer(next, { type: 'set-mode', mode: 'page' })
  if (config.document) {
    next = builderReducer(next, { type: 'apply-document', document: config.document, component: config.component })
  }
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

export function stateFromLocation(registry: BuilderRegistry, search: string, base: BuilderState): BuilderState {
  const config = configurationFromSearch(registry, search)
  if (!config) return base
  return applyConfiguration(registry, base, config)
}

export function shareUrl(
  registry: BuilderRegistry,
  state: BuilderState,
  location: Pick<Location, 'origin' | 'pathname'>,
): string {
  return `${location.origin}${location.pathname}?${configurationToSearch(toConfiguration(registry, state))}`
}
