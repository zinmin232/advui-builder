import { createContext, useContext } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'

export interface CanvasMode {
  /** The preview runs as the real page: clicks reach the components, and the builder draws nothing over them. */
  interactive: boolean
  /** Opens the inline text editor on a layer (a double-click). */
  editText: (id: string) => void
}

export const CanvasModeContext = createContext<CanvasMode>({ interactive: false, editText: () => {} })

export function useCanvasMode(): CanvasMode {
  return useContext(CanvasModeContext)
}

/** A layer whose text the canvas can edit in place: it has a text prop and no child layers. */
export function canEditText(registry: BuilderRegistry, node: ConfigNode): boolean {
  return (
    node.children.length === 0 &&
    registry.has(node.component) &&
    registry.get(node.component).props.some((prop) => prop.textContent)
  )
}
