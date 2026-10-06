/**
 * The fields of AdvUI's `ComponentMeta` schema (`packages/ui/src/meta/types.ts`
 * in https://github.com/zinmin232/advui) that the Builder reads.
 *
 * The published `@advui/core` package leaves out `*.meta.ts`, so
 * `scripts/sync-meta.mjs` copies them into `sourceMeta.ts` from the git tag that
 * matches the installed version. When AdvUI publishes metadata, import it instead.
 */

export type ComponentStatus = 'stable' | 'beta' | 'experimental' | 'deprecated' | 'planned'
export type AdvuiPlatform = 'web' | 'ios' | 'android'

export type CategoryId =
  | 'foundations'
  | 'buttons'
  | 'forms'
  | 'layout'
  | 'navigation'
  | 'feedback'
  | 'overlay'
  | 'data-display'
  | 'media'
  | 'advanced'
  | 'charts'

export interface PropDoc {
  name: string
  type: string
  default?: string
  required?: boolean
  description: string
  /** Closed list of allowed values, in display order, without quotes (0.8.0). */
  options?: string[]
  /** Also takes a mobile-first map `{ base, md, … }` of the same value. */
  responsive?: boolean
  /** The value is a token of this theme scale, such as `$4` for `space`. */
  token?: 'space' | 'size' | 'color' | 'radius' | 'zIndex'
  min?: number
  max?: number
  step?: number
  /** Only when the prop works on some platforms, not all. */
  platforms?: AdvuiPlatform[]
}

/** What may go inside a part: any elements, text only, nothing, or only these parts. */
export interface ChildRules {
  accepts: 'any' | 'text' | 'none' | string[]
  min?: number
  max?: number
}

export interface PartDoc {
  name: string
  /** Hooks, functions and types are documented as parts too, but never placed in a tree. */
  kind?: 'component' | 'hook' | 'function' | 'type'
  description?: string
  props: PropDoc[]
  children?: ChildRules
  /** Must be a direct child of one of these parts. */
  parents?: string[]
  /** Must sit somewhere inside this component or part. */
  within?: string
}

export interface ExampleMeta {
  name: string
  title: string
  description?: string
}

export type PlaygroundControl =
  | { prop: string; type: 'select'; options: string[]; default: string }
  | { prop: string; type: 'boolean'; default: boolean }
  | { prop: string; type: 'text'; default: string }
  | { prop: string; type: 'number'; default: number; min?: number; max?: number; step?: number }

export interface ComponentMeta {
  name: string
  slug: string
  category: CategoryId
  description: string
  status: ComponentStatus
  since: string
  platforms: AdvuiPlatform[]
  exports: string[]
  keywords?: string[]
  parts: PartDoc[]
  examples: ExampleMeta[]
  playground?: {
    component: string
    controls: PlaygroundControl[]
    children?: string
    staticProps?: Record<string, string | number | boolean>
  }
  platformNotes?: Partial<Record<AdvuiPlatform, string>>
  related?: string[]
}

export const categoryLabels: Record<CategoryId, string> = {
  foundations: 'Foundations',
  buttons: 'Buttons & Actions',
  forms: 'Forms',
  layout: 'Layout',
  navigation: 'Navigation',
  feedback: 'Feedback',
  overlay: 'Overlay',
  'data-display': 'Data Display',
  media: 'Media',
  advanced: 'Advanced',
  charts: 'Charts',
}
