import type { ComponentMetadata, ConfigNode, ItemTemplate, PlatformId, TemplateNode } from './metadata'

/**
 * Everything the Builder knows about a component library. The Builder core never
 * imports a library directly: the app hands a registry to `BuilderProvider`.
 */
export interface RegistryDefinition {
  /** Package the generated code imports from. */
  importSource: string
  /** Every component and compound part. Sidebar entries are listed in this order. */
  components: ComponentMetadata[]
}

export interface BuilderRegistry {
  readonly importSource: string
  /** First sidebar entry. Opens when nothing else is chosen. */
  readonly defaultComponent: string
  has(component: string): boolean
  /** Throws for an unknown component. */
  get(component: string): ComponentMetadata
  sidebarEntries(): ComponentMetadata[]
  search(query: string, categoryId?: string): ComponentMetadata[]
  /** The sidebar component a name or slug points to, ignoring case (`button`, `radio-group`). */
  match(name: string): string | null
  /** A fresh starter tree. Ids are the same every time for a given template. */
  createDocument(component: string): ConfigNode
  acceptsChildren(component: string): boolean
  itemNoun(component: string): string | null
  /** Appends one item to a host. `idFor` hands out unused ids. Returns the new host and the node to select. */
  addItem(host: ConfigNode, idFor: (component: string) => string): { node: ConfigNode; selectedId: string } | null
}

/** The next id for a component that is not in `used`: `card-header`, then `card-header-2`. */
export function nextId(used: Set<string>, component: string): string {
  const base = component.toLowerCase().replace(/\./g, '-')
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

function allocator(used: Set<string>): (component: string) => string {
  return (component) => {
    const id = nextId(used, component)
    used.add(id)
    return id
  }
}

/** `Card.Header` → `Header`. */
function partName(component: string): string {
  return component.slice(component.lastIndexOf('.') + 1)
}

function templateIds(node: TemplateNode, into = new Set<string>()): Set<string> {
  if (node.id) into.add(node.id)
  node.children?.forEach((child) => templateIds(child, into))
  return into
}

function fillProps(props: Record<string, unknown>, fill: (text: string) => string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    out[key] = typeof value === 'string' ? fill(value) : structuredClone(value)
  }
  return out
}

function instantiate(
  spec: TemplateNode,
  idFor: (component: string) => string,
  fill: (text: string) => string,
): ConfigNode {
  const node: ConfigNode = {
    id: spec.id ?? idFor(spec.component),
    component: spec.component,
    label: fill(spec.label ?? partName(spec.component)),
    props: fillProps(spec.props ?? {}, fill),
    children: (spec.children ?? []).map((child) => instantiate(child, idFor, fill)),
  }
  if (spec.text != null) node.text = fill(spec.text)
  return node
}

const keep = (text: string) => text

/**
 * Builds a registry from component metadata. Fails fast when a template or item
 * names a component the registry does not have.
 */
export function createRegistry(definition: RegistryDefinition): BuilderRegistry {
  const byName = new Map<string, ComponentMetadata>()
  for (const meta of definition.components) {
    if (byName.has(meta.name)) throw new Error(`Component registered twice: ${meta.name}`)
    byName.set(meta.name, meta)
  }

  const get = (component: string): ComponentMetadata => {
    const meta = byName.get(component)
    if (!meta) throw new Error(`Unknown component: ${component}`)
    return meta
  }

  const checkTemplate = (owner: string, node: TemplateNode) => {
    if (!byName.has(node.component)) throw new Error(`${owner} template uses unknown component ${node.component}`)
    node.children?.forEach((child) => checkTemplate(owner, child))
  }
  const checkItem = (owner: string, item: ItemTemplate) => {
    for (const name of [item.part, ...item.nodes.flatMap((node) => (node.into ? [node.into] : []))]) {
      if (!byName.has(name)) throw new Error(`${owner} item uses unknown component ${name}`)
    }
    item.nodes.forEach((node) => checkTemplate(owner, node))
  }
  for (const meta of byName.values()) {
    if (meta.template) checkTemplate(meta.name, meta.template)
    if (meta.item) checkItem(meta.name, meta.item)
  }

  const sidebar = definition.components.filter((meta) => meta.sidebar)
  if (sidebar.length === 0) throw new Error('A registry needs at least one sidebar component')

  return {
    importSource: definition.importSource,
    defaultComponent: sidebar[0].name,
    has: (component) => byName.has(component),
    get,
    sidebarEntries: () => sidebar,
    search(query, categoryId = 'all') {
      const normalized = query.trim().toLowerCase()
      return sidebar.filter((entry) => {
        if (categoryId !== 'all' && entry.categoryId !== categoryId) return false
        if (!normalized) return true
        const haystack = [entry.name, entry.description, entry.category, ...entry.keywords].join(' ').toLowerCase()
        return haystack.includes(normalized)
      })
    },
    match(name) {
      const needle = name.toLowerCase()
      return sidebar.find((entry) => entry.name.toLowerCase() === needle || entry.slug === needle)?.name ?? null
    },
    createDocument(component) {
      const meta = get(component)
      const template = meta.template ?? { component, label: meta.name, text: meta.defaultText }
      return instantiate(template, allocator(templateIds(template)), keep)
    },
    acceptsChildren: (component) => byName.get(component)?.acceptsChildren === true,
    itemNoun: (component) => byName.get(component)?.item?.noun ?? null,
    addItem(host, idFor) {
      const item = byName.get(host.component)?.item
      if (!item) return null
      const containers = new Set(item.nodes.flatMap((node) => (node.into ? [node.into] : [])))
      const pool = [
        ...host.children,
        ...host.children.filter((child) => containers.has(child.component)).flatMap((child) => child.children),
      ]
      let n = pool.filter((child) => child.component === item.part).length + 1
      if (item.valuePrefix) {
        const taken = new Set(pool.map((child) => child.props.value))
        while (taken.has(`${item.valuePrefix}-${n}`)) n += 1
      }
      const value = item.valuePrefix ? `${item.valuePrefix}-${n}` : String(n)
      const fill = (text: string) =>
        text.replaceAll('{n}', String(n)).replaceAll('{value}', value).replaceAll('{host}', host.id)

      let children = host.children
      let selectedId: string | null = null
      for (const { into, ...spec } of item.nodes) {
        const added = instantiate(spec, idFor, fill)
        selectedId ??= added.id
        if (!into) {
          children = [...children, added]
          continue
        }
        const index = children.findIndex((child) => child.component === into)
        children =
          index >= 0
            ? children.map((child, at) => (at === index ? { ...child, children: [...child.children, added] } : child))
            : [{ ...instantiate({ component: into }, idFor, fill), children: [added] }, ...children]
      }
      return selectedId ? { node: { ...host, children }, selectedId } : null
    },
  }
}

/** Props passed to the rendered component: stored values over metadata defaults, filtered by platform. */
export function resolveProps(
  meta: ComponentMetadata,
  props: Record<string, unknown>,
  platform: PlatformId,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const prop of meta.props) {
    if (prop.textContent || prop.type === 'typography') continue
    if (prop.platforms && !prop.platforms.includes(platform)) continue
    const value = props[prop.key] !== undefined ? props[prop.key] : prop.defaultValue
    if (value !== undefined) resolved[prop.key] = value
  }
  return resolved
}
