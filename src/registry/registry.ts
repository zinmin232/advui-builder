import { isValidSpans } from './columns'
import type {
  BreakpointMetadata,
  ComponentMetadata,
  ConfigNode,
  ItemTemplate,
  PlatformId,
  TemplateNode,
} from './metadata'
import { BASE, valueForScreen } from './responsive'

/**
 * Everything the Builder knows about a component library. The Builder core never
 * imports a library directly: the app hands a registry to `BuilderProvider`.
 */
export interface RegistryDefinition {
  /** Package the generated code imports from. */
  importSource: string
  /** Every component and compound part. Sidebar entries are listed in this order. */
  components: ComponentMetadata[]
  /** Starter tree for Page mode. Its root must accept children. Without it, only Component mode is offered. */
  page?: TemplateNode
  /**
   * A row for a layout preset, from column spans that add up to 12 (`[8, 4]`). Its root and each column
   * must accept children. Without it, no layout presets are offered.
   */
  columns?: (spans: number[]) => TemplateNode
  /** Min-width breakpoints for responsive props, smallest first. Without them, responsive props take one value. */
  breakpoints?: BreakpointMetadata[]
  /** Ready-made page parts, in sidebar order. Without them, the sidebar has no Blocks group. */
  blocks?: BlockDefinition[]
}

/** A ready-made part of a page (a navbar, a hero) built from the library's own components. */
export interface BlockDefinition {
  /** Unique within the registry: `hero`. */
  id: string
  name: string
  description: string
  keywords?: string[]
  /** Ids may be left out; inserted copies get fresh ones anyway. */
  template: TemplateNode
}

/** A block as the sidebar lists it. `component` is its root, which the drop rules check. */
export interface BlockEntry {
  id: string
  name: string
  description: string
  component: string
}

export interface BuilderRegistry {
  readonly importSource: string
  /** First sidebar entry. Opens when nothing else is chosen. */
  readonly defaultComponent: string
  /** Whether the registry defines a page template, so Page mode can be offered. */
  readonly hasPage: boolean
  /** Whether the registry builds layout presets (`columns`). */
  readonly hasColumns: boolean
  /** Breakpoints for responsive props, smallest first. Empty when the library has none. */
  readonly breakpoints: readonly BreakpointMetadata[]
  /** Ready-made page parts, in sidebar order. Empty when the library defines none. */
  readonly blocks: readonly BlockEntry[]
  /** Blocks whose name, description or keywords contain the query. */
  searchBlocks(query: string): BlockEntry[]
  /** A fresh copy of a block's tree. Throws for an unknown block. */
  createBlock(id: string): ConfigNode
  has(component: string): boolean
  /** Throws for an unknown component. */
  get(component: string): ComponentMetadata
  sidebarEntries(): ComponentMetadata[]
  search(query: string, categoryId?: string): ComponentMetadata[]
  /** The sidebar component a name or slug points to, ignoring case (`button`, `radio-group`). */
  match(name: string): string | null
  /** A fresh starter tree. Ids are the same every time for a given template. */
  createDocument(component: string): ConfigNode
  /** A fresh, empty page. Throws when the registry has no page template. */
  createPage(): ConfigNode
  /** A fresh row for a layout preset. Throws when the registry has no `columns`, or for invalid spans. */
  createColumns(spans: number[]): ConfigNode
  acceptsChildren(component: string): boolean
  /** A container that takes any component, not only listed parts. Sidebar inserts go into the nearest one. */
  acceptsAny(component: string): boolean
  /**
   * Whether one more `component` may go inside the last layer of `path` (the root first): container, `accepts`,
   * `parents`, `within` and `maxChildren` rules. `sibling` checks room only, for a copy of a child the parent
   * already holds.
   */
  canPlace(component: string, path: readonly ConfigNode[], sibling?: boolean): boolean
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

  // A container whose listed children are all missing from this registry can hold nothing here.
  const containers = new Set(
    [...byName.values()]
      .filter((meta) => meta.acceptsChildren && (!meta.accepts || meta.accepts.some((name) => byName.has(name))))
      .map((meta) => meta.name),
  )
  const acceptsAny = (component: string) => containers.has(component) && !byName.get(component)?.accepts

  const page = definition.page
  if (page) {
    checkTemplate('Page', page)
    if (!acceptsAny(page.component)) throw new Error(`Page root ${page.component} must accept children`)
  }

  const columns = definition.columns
  // Every split uses the same components, so one sample row checks the builder.
  const sampleRow = columns?.([6, 6])
  if (sampleRow) {
    checkTemplate('Columns', sampleRow)
    for (const node of [sampleRow, ...(sampleRow.children ?? [])]) {
      if (!containers.has(node.component)) throw new Error(`Columns ${node.component} must accept children`)
    }
  }

  const blocks = definition.blocks ?? []
  const blockById = new Map<string, BlockDefinition>()
  for (const block of blocks) {
    if (blockById.has(block.id)) throw new Error(`Block registered twice: ${block.id}`)
    blockById.set(block.id, block)
    checkTemplate(`Block ${block.id}`, block.template)
  }
  const blockEntries: BlockEntry[] = blocks.map((block) => ({
    id: block.id,
    name: block.name,
    description: block.description,
    component: block.template.component,
  }))

  // Where the templates put each compound part. A part may only be placed there unless it lists `parents` or `within`.
  const templateParents = new Map<string, Set<string>>()
  const record = (parent: string, node: TemplateNode) => {
    if (!byName.get(node.component)?.sidebar) {
      const seen = templateParents.get(node.component) ?? new Set<string>()
      seen.add(parent)
      templateParents.set(node.component, seen)
    }
    node.children?.forEach((child) => record(node.component, child))
  }
  for (const meta of byName.values()) {
    meta.template?.children?.forEach((child) => record(meta.name, child))
    meta.item?.nodes.forEach(({ into, ...node }) => {
      if (into) record(meta.name, { component: into })
      record(into ?? meta.name, node)
    })
  }
  page?.children?.forEach((child) => record(page.component, child))
  sampleRow?.children?.forEach((child) => record(sampleRow.component, child))
  for (const block of blocks) block.template.children?.forEach((child) => record(block.template.component, child))

  const sidebar = definition.components.filter((meta) => meta.sidebar)
  if (sidebar.length === 0) throw new Error('A registry needs at least one sidebar component')

  const breakpoints = definition.breakpoints ?? []
  breakpoints.forEach((breakpoint, index) => {
    const previous = breakpoints[index - 1]
    if (breakpoint.name === BASE || breakpoints.findIndex((item) => item.name === breakpoint.name) !== index) {
      throw new Error(`Breakpoint names must be unique and not "${BASE}": ${breakpoint.name}`)
    }
    if (!(breakpoint.minWidth > (previous?.minWidth ?? 0))) {
      throw new Error(`Breakpoints must be listed smallest first: ${breakpoint.name}`)
    }
  })

  return {
    importSource: definition.importSource,
    defaultComponent: sidebar[0].name,
    hasPage: page != null,
    hasColumns: columns != null,
    breakpoints,
    blocks: blockEntries,
    searchBlocks(query) {
      const normalized = query.trim().toLowerCase()
      return blockEntries.filter((entry) => {
        const block = blockById.get(entry.id)!
        const haystack = [block.name, block.description, ...(block.keywords ?? [])].join(' ').toLowerCase()
        return haystack.includes(normalized)
      })
    },
    createBlock(id) {
      const block = blockById.get(id)
      if (!block) throw new Error(`Unknown block: ${id}`)
      return instantiate(block.template, allocator(templateIds(block.template)), keep)
    },
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
    createPage() {
      if (!page) throw new Error('This registry has no page template')
      return instantiate(page, allocator(templateIds(page)), keep)
    },
    createColumns(spans) {
      if (!columns) throw new Error('This registry has no layout presets')
      if (!isValidSpans(spans)) throw new Error(`Column spans must be whole numbers that add up to 12: ${spans.join(' ')}`)
      const row = columns(spans)
      return instantiate(row, allocator(templateIds(row)), keep)
    },
    acceptsChildren: (component) => containers.has(component),
    acceptsAny,
    canPlace(component, path, sibling = false) {
      const parent = path.at(-1)
      const host = parent && byName.get(parent.component)
      const meta = byName.get(component)
      if (!parent || !host || !meta) return false
      if (host.maxChildren != null && parent.children.length >= host.maxChildren) return false
      if (sibling) return true
      if (!containers.has(host.name)) return false
      if (host.accepts && !host.accepts.includes(component)) return false
      if (meta.within && !path.some((node) => node.component === meta.within)) return false
      const placed = meta.sidebar || meta.within != null
      const parents = meta.parents ?? (placed ? undefined : [...(templateParents.get(component) ?? [])])
      return !parents || parents.includes(parent.component)
    },
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

/** The breakpoint the preview shows, and every breakpoint key smallest first (`base` first). */
export interface PreviewScreen {
  breakpoint: string
  keys: readonly string[]
}

/**
 * Props passed to the rendered component: stored values over metadata defaults, filtered by platform. With a
 * `screen`, responsive maps become the value for that breakpoint, so the preview follows its own width instead of
 * the browser window's media queries.
 */
export function resolveProps(
  meta: ComponentMetadata,
  props: Record<string, unknown>,
  platform: PlatformId,
  screen?: PreviewScreen,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const prop of meta.props) {
    if (prop.textContent || prop.type === 'typography') continue
    if (prop.platforms && !prop.platforms.includes(platform)) continue
    let value = props[prop.key] !== undefined ? props[prop.key] : prop.defaultValue
    if (screen && prop.responsive) value = valueForScreen(value, screen.breakpoint, screen.keys)
    if (value !== undefined) resolved[prop.key] = value
  }
  return resolved
}
