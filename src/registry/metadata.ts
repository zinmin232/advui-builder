import type { AdvuiPlatform } from './advuiMetaTypes'

export type PlatformId = 'web' | 'android' | 'ios'

export type PropType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'spacing'
  | 'radius'
  | 'typography'
  | 'icon'
  | 'object'
  | 'array'

export type PropGroup = 'component' | 'appearance' | 'layout' | 'typography' | 'advanced'

export interface PropOption {
  label: string
  value: string
}

export interface PropMetadata {
  key: string
  type: PropType
  label: string
  description?: string
  group: PropGroup
  defaultValue?: unknown
  options?: PropOption[]
  platforms?: PlatformId[]
  min?: number
  max?: number
  step?: number
  required?: boolean
  /** Editor writes `ConfigNode.text` instead of a component prop. */
  textContent?: boolean
  /** Typography editor writes these real AdvUI props (size, weight, tone). */
  fields?: string[]
}

export interface PlatformMetadata {
  supported: boolean
  notes?: string[]
}

export interface ExampleMetadata {
  name: string
  title: string
  description?: string
}

/**
 * A node in a starter tree or an item template. Missing ids are allocated;
 * a missing label is the part name (`Card.Header` → `Header`).
 */
export interface TemplateNode {
  id?: string
  component: string
  label?: string
  props?: Record<string, unknown>
  text?: string
  children?: TemplateNode[]
}

/**
 * How a host grows by one repeatable part (a Select option, a tab). In labels,
 * text and string props, `{n}` is the item number, `{value}` the item value and
 * `{host}` the host id.
 */
export interface ItemTemplate {
  /** Shown as "Add {noun} to …". */
  noun: string
  /** The part being counted: `{n}` is one more than how many the host holds. */
  part: string
  /** Each item gets the value `${valuePrefix}-{n}`, skipping values already in use. */
  valuePrefix?: string
  /**
   * Added in order; the first one is selected. `into` adds the node inside the
   * host's child of that component, which is created when missing.
   */
  nodes: Array<TemplateNode & { into?: string }>
}

export interface ComponentMetadata {
  name: string
  slug: string
  category: string
  categoryId: string
  description: string
  keywords: string[]
  /** Shown in the component sidebar. Compound parts are registry entries too. */
  sidebar: boolean
  importName: string
  jsxTag: string
  defaultText?: string
  props: PropMetadata[]
  platforms: Record<PlatformId, PlatformMetadata>
  examples: ExampleMetadata[]
  /** Always applied at render time. Not an inspector field. */
  staticProps?: Record<string, string | number | boolean>
  /** Starter tree opened from the sidebar. Without one, the bare component opens. */
  template?: TemplateNode
  /** Other layers can be inserted or dropped inside it. */
  acceptsChildren?: boolean
  /** When set, only these components may go inside. */
  accepts?: string[]
  /**
   * When set, it may only go inside these components. Compound parts without it may only go where the
   * templates put them (`Card.Title` inside `Card.Header`).
   */
  parents?: string[]
  /** Most children it can hold. */
  maxChildren?: number
  /** The repeatable part that "Add item" appends. */
  item?: ItemTemplate
  /** Draws nothing of its own (a Spacer), so the canvas outlines it. The outline does not change its size. */
  invisible?: boolean
}

export interface ConfigNode {
  id: string
  component: string
  label: string
  props: Record<string, unknown>
  text?: string
  children: ConfigNode[]
}

export interface SelectionContext {
  component: string
  element: string
  path: string[]
  ids: string[]
  props: Record<string, unknown>
}

const platformOrder: PlatformId[] = ['web', 'android', 'ios']

export function toBuilderPlatform(platform: AdvuiPlatform): PlatformId {
  if (platform === 'ios') return 'ios'
  if (platform === 'android') return 'android'
  return 'web'
}

export function emptyPlatforms(): Record<PlatformId, PlatformMetadata> {
  return {
    web: { supported: false },
    android: { supported: false },
    ios: { supported: false },
  }
}

export function platformList(): PlatformId[] {
  return platformOrder
}
