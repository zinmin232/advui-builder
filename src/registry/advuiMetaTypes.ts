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
}

export interface PartDoc {
  name: string
  description?: string
  props: PropDoc[]
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
