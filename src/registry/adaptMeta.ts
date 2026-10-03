import type { CategoryId, ComponentMeta, PlaygroundControl, PropDoc } from './advuiMetaTypes'
import { categoryLabels } from './advuiMetaTypes'
import {
  emptyPlatforms,
  toBuilderPlatform,
  type ComponentMetadata,
  type ItemTemplate,
  type PlatformId,
  type PropMetadata,
  type PropOption,
  type PropType,
  type TemplateNode,
} from './metadata'

const groupOrder = ['component', 'typography', 'appearance', 'layout', 'advanced'] as const

const labels: Record<string, string> = {
  src: 'Source',
  alt: 'Alt',
  fullWidth: 'Full width',
}

function titleCase(name: string): string {
  if (labels[name]) return labels[name]
  const spaced = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function parseLiteralDefault(raw: string | undefined): unknown {
  if (raw == null) return undefined
  const trimmed = raw.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const quoted = trimmed.match(/^'(.*)'$/)
  if (quoted) return quoted[1]
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  return undefined
}

/** Upstream prose marks code with backticks; the inspector shows plain text. */
function plain(text: string): string
function plain(text: string | undefined): string | undefined
function plain(text: string | undefined): string | undefined {
  return text?.replace(/`([^`]*)`/g, '$1')
}

function unionOptions(type: string): PropOption[] | null {
  const parts = type.split('|').map((part) => part.trim())
  if (parts.length < 2) return null
  const options: PropOption[] = []
  for (const part of parts) {
    // A shorthand like `'2xl' … '6xl'` is not a single literal, so the union is not editable.
    const match = part.match(/^'([^']*)'$/)
    if (!match) return null
    options.push({ label: titleCase(match[1]), value: match[1] })
  }
  return options
}

/**
 * Upstream documents related props in one row (`value / defaultValue`, with
 * types `string / boolean` when they differ). Split them, and when both `x` and
 * `defaultX` exist keep only `defaultX`: the builder sets initial state, and a
 * controlled prop without its handler would freeze the component.
 */
function splitDocs(docs: PropDoc[]): PropDoc[] {
  const split = docs.flatMap((doc) => {
    const names = doc.name.split(' / ').map((name) => name.trim())
    if (names.length === 1) return [doc]
    const each = (value: string | undefined, index: number) => {
      const parts = value?.split(' / ')
      return parts?.length === names.length ? parts[index] : value
    }
    return names.map((name, index) => ({
      ...doc,
      name,
      type: each(doc.type, index) ?? doc.type,
      default: each(doc.default, index),
    }))
  })
  const names = new Set(split.map((doc) => doc.name))
  return split.filter((doc) => !names.has(`default${doc.name.charAt(0).toUpperCase()}${doc.name.slice(1)}`))
}

function editorType(doc: PropDoc): PropType | null {
  if (doc.type.includes('=>') || doc.type.includes('ReactNode') || doc.type.includes('ReactElement')) {
    return null
  }
  // Event handlers and shorthand rows (`$sm / $md …`) have no editor.
  if (!/^[A-Za-z][\w-]*$/.test(doc.name) || /^on[A-Z]/.test(doc.name)) return null
  const options = unionOptions(doc.type)
  if (options) return 'select'
  if (doc.type === 'boolean') return 'boolean'
  if (doc.type === 'number') return 'number'
  if (/^string( \||$)/.test(doc.type)) return 'string'
  return null
}

function propFromDoc(doc: PropDoc): PropMetadata | null {
  const type = editorType(doc)
  if (!type) return null
  const options = type === 'select' ? unionOptions(doc.type) ?? undefined : undefined
  const documented = parseLiteralDefault(doc.default)
  return {
    key: doc.name,
    type,
    label: titleCase(doc.name),
    description: plain(doc.description),
    group: 'component',
    defaultValue: documented === undefined && type === 'boolean' ? false : documented,
    options,
    required: doc.required,
  }
}

/**
 * Playground controls refine the editor (options, range). Their `default` is the
 * demo's starting value, not the component default, so it is not used: code
 * generation drops props equal to the default.
 */
function applyControl(prop: PropMetadata, control: PlaygroundControl): PropMetadata {
  if (control.type === 'select') {
    return {
      ...prop,
      type: 'select',
      options: control.options.map((value) => ({ label: titleCase(value), value })),
    }
  }
  if (control.type === 'boolean') {
    return { ...prop, type: 'boolean', defaultValue: prop.defaultValue ?? false }
  }
  if (control.type === 'number') {
    return { ...prop, type: 'number', min: control.min, max: control.max, step: control.step }
  }
  return { ...prop, type: 'string' }
}

export interface AdaptOptions {
  /** Document a compound part (`Card.Header`) instead of the root. */
  part?: string
  extraProps?: PropMetadata[]
  sidebar?: boolean
  jsxTag?: string
  importName?: string
  textDefault?: string
  /** Props that only apply on some platforms, keyed by prop name. */
  propPlatforms?: Record<string, PlatformId[]>
  /** Always rendered and emitted (an `aria-label`, `asChild`). Not editable, so left out of the inspector. */
  staticProps?: Record<string, string | number | boolean>
  /** Editor tweaks for documented props (a finer step, a range), keyed by prop name. */
  propOverrides?: Record<string, Partial<PropMetadata>>
  /** Sidebar group, when the builder groups a component differently from AdvUI's docs. */
  category?: CategoryId
  /** Starter tree opened from the sidebar. */
  template?: TemplateNode
  /** Other layers can be inserted or dropped inside it. */
  acceptsChildren?: boolean
  /** Drop rules: allowed children, allowed parents, and capacity. See `ComponentMetadata`. */
  accepts?: string[]
  parents?: string[]
  maxChildren?: number
  /** The repeatable part that "Add item" appends. */
  item?: ItemTemplate
}

/**
 * Turn an AdvUI `ComponentMeta` snapshot into builder metadata.
 * Component-specific editors are not created here — only prop types.
 */
export function adaptAdvuiMeta(meta: ComponentMeta, options: AdaptOptions = {}): ComponentMetadata {
  // Upstream names are for people ("Radio Group"); parts and exports use the code name.
  const name =
    options.part ?? [meta.exports[0], meta.name].find((candidate) => meta.parts.some((item) => item.name === candidate)) ?? meta.name
  const part = meta.parts.find((item) => item.name === name)
  // The docs playground demos one component; its controls do not describe the other parts.
  const playground = meta.playground?.component === name ? meta.playground : undefined
  const controls = new Map((playground?.controls ?? []).map((control) => [control.prop, control]))
  const fixed = options.staticProps ?? {}
  const props: PropMetadata[] = []

  const textDefault = options.textDefault ?? playground?.children
  if (textDefault != null) {
    props.push({
      key: 'children',
      type: 'string',
      label: 'Content',
      description: 'Text rendered as the component children.',
      group: 'component',
      textContent: true,
      defaultValue: textDefault,
    })
  }

  for (const doc of splitDocs(part?.props ?? [])) {
    const base = propFromDoc(doc)
    if (!base || props.some((prop) => prop.key === base.key)) continue
    const control = controls.get(doc.name)
    props.push(control ? applyControl(base, control) : base)
  }

  for (const control of playground?.controls ?? []) {
    if (props.some((prop) => prop.key === control.prop)) continue
    const stub: PropMetadata = {
      key: control.prop,
      type: 'string',
      label: titleCase(control.prop),
      group: 'component',
    }
    props.push(applyControl(stub, control))
  }

  for (const extra of options.extraProps ?? []) {
    if (!props.some((prop) => prop.key === extra.key)) props.push(extra)
  }

  for (let index = props.length - 1; index >= 0; index -= 1) {
    const key = props[index].key
    if (Object.hasOwn(fixed, key)) props.splice(index, 1)
    else if (options.propOverrides && Object.hasOwn(options.propOverrides, key)) {
      props[index] = { ...props[index], ...options.propOverrides[key] }
    }
  }

  if (options.propPlatforms) {
    for (const prop of props) {
      const platforms = options.propPlatforms[prop.key]
      if (platforms) prop.platforms = platforms
    }
  }

  const platforms = emptyPlatforms()
  for (const platform of meta.platforms) {
    const id = toBuilderPlatform(platform)
    const note = meta.platformNotes?.[platform]
    platforms[id] = {
      supported: true,
      notes: note ? [plain(note)] : undefined,
    }
  }

  return {
    name,
    slug: meta.slug,
    category: categoryLabels[options.category ?? meta.category],
    categoryId: options.category ?? meta.category,
    description: plain(part?.description || meta.description),
    keywords: meta.keywords ?? [],
    sidebar: options.sidebar ?? options.part == null,
    importName: options.importName ?? meta.exports[0] ?? meta.name,
    jsxTag: options.jsxTag ?? name,
    defaultText: textDefault,
    props,
    platforms,
    staticProps: options.staticProps,
    template: options.template,
    acceptsChildren: options.acceptsChildren,
    accepts: options.accepts,
    parents: options.parents,
    maxChildren: options.maxChildren,
    item: options.item,
    examples: meta.examples.map((example) => ({
      name: example.name,
      title: example.title,
      description: example.description,
    })),
  }
}

export function propsForPlatform(meta: ComponentMetadata, platform: PlatformId): PropMetadata[] {
  return meta.props.filter((prop) => !prop.platforms || prop.platforms.includes(platform))
}

/** Props edited only through a composite editor (typography size / weight / tone). */
export function hiddenPropKeys(props: PropMetadata[]): Set<string> {
  return new Set(props.flatMap((prop) => (prop.type === 'typography' ? (prop.fields ?? []) : [])))
}

export function groupedProps(props: PropMetadata[]): { group: PropMetadata['group']; props: PropMetadata[] }[] {
  const hidden = hiddenPropKeys(props)
  return groupOrder
    .map((group) => ({
      group,
      props: props.filter((prop) => prop.group === group && !hidden.has(prop.key)),
    }))
    .filter((section) => section.props.length > 0)
}

export function platformNote(meta: ComponentMetadata, platform: PlatformId): string | null {
  const entry = meta.platforms[platform]
  if (!entry?.supported) {
    return `${meta.name} is not supported on ${platformLabel(platform)}.`
  }
  const notes = entry.notes?.filter(Boolean) ?? []
  return notes.length ? notes.join('\n') : null
}

export function platformLabel(platform: PlatformId): string {
  if (platform === 'ios') return 'iOS'
  if (platform === 'android') return 'Android'
  return 'Web'
}

export function isSameValue(left: unknown, right: unknown): boolean {
  return Object.is(left, right)
}
