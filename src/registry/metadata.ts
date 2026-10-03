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
