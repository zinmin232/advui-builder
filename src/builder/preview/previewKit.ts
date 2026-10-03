import type { ComponentType, ReactNode } from 'react'
import type { ConfigNode, PlatformId } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'

export interface PreviewContext {
  platform: PlatformId
  registry: BuilderRegistry
}

/**
 * Draws ConfigNodes with a library's real components. It pairs with a registry
 * and is loaded on demand, so the panels appear before the component library.
 */
export interface PreviewKit {
  /** Wraps the preview in the library's providers (theme, portals). */
  Frame: ComponentType<{ theme: 'light' | 'dark'; children: ReactNode }>
  /** Renders one node. `children` are its children, already rendered inside their selection wrappers. */
  renderNode: (node: ConfigNode, children: ReactNode, context: PreviewContext) => ReactNode
}

export type PreviewLoader = () => Promise<PreviewKit>
