import type { ConfigNode } from '../registry/metadata'
import type { BuilderRegistry } from '../registry/registry'
import { compactTree, readTree, type TreeLimits } from './shareConfig'

/** A copied layer travels as JSON under this type. The plain-text copy is its TSX, for pasting into code. */
export const LAYER_MIME = 'application/x-advui-builder-layer'
const FORMAT = 'advui-builder.layer'
const VERSION = 1
const limits: TreeLimits = { nodes: 5000, depth: 64 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function layerClipboardData(node: ConfigNode): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, tree: compactTree(node) })
}

/** The copied layer, or null when the data isn't one this registry can show whole. Read strictly. */
export function readLayerClipboard(registry: BuilderRegistry, text: string): ConfigNode | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return null
  }
  if (!isRecord(data) || data.format !== FORMAT || data.version !== VERSION || !isRecord(data.tree)) return null
  const component = data.tree.component
  return typeof component === 'string' ? readTree(registry, data.tree, component, limits) : null
}
