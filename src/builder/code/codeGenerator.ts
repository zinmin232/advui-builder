import { isSameValue } from '../../registry/adaptMeta'
import type { ConfigNode, PlatformId } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'

export interface CodeOptions {
  registry: BuilderRegistry
  platform?: PlatformId
}

function collectImports(registry: BuilderRegistry, node: ConfigNode, into = new Set<string>()): Set<string> {
  if (node.component === 'Toast') {
    into.add('Button')
    into.add('toast')
  } else {
    into.add(registry.get(node.component).importName)
  }
  for (const child of node.children) collectImports(registry, child, into)
  return into
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/** Text that JSX would reject (`{`, `<`, `>`), decode (`&amp;`) or trim is emitted as a string expression. */
function jsxText(text: string): string {
  const unsafe = /[{}<>\r\n]|&(#\d+|#x[\da-f]+|[a-z][a-z\d]*);/i.test(text) || text !== text.trim()
  return unsafe ? `{${JSON.stringify(text)}}` : text
}

/** An object literal such as a responsive map: `{ base: "column", md: "row" }`. Other values are JSON. */
function formatExpression(value: unknown): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return JSON.stringify(value)
  const entries = Object.entries(value).map(([key, item]) => {
    const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
    return `${name}: ${formatExpression(item)}`
  })
  return entries.length ? `{ ${entries.join(', ')} }` : '{}'
}

function formatAttr(key: string, value: unknown): string {
  if (typeof value === 'boolean') return value ? key : `${key}={false}`
  if (typeof value === 'number') return `${key}={${value}}`
  if (typeof value === 'string') return `${key}="${escapeAttr(value)}"`
  return `${key}={${formatExpression(value)}}`
}

function emittedAttrs(registry: BuilderRegistry, node: ConfigNode, platform: PlatformId): string[] {
  const meta = registry.get(node.component)
  const attrs: string[] = []
  const seen = new Set<string>()

  for (const prop of meta.props) {
    if (prop.textContent || prop.type === 'typography') continue
    if (prop.platforms && !prop.platforms.includes(platform)) continue
    const value = node.props[prop.key]
    if (value === undefined) continue
    if (!prop.required && isSameValue(value, prop.defaultValue)) continue
    attrs.push(formatAttr(prop.key, value))
    seen.add(prop.key)
  }

  for (const [key, value] of Object.entries(meta.staticProps ?? {})) {
    if (seen.has(key) || node.props[key] !== undefined) continue
    attrs.push(formatAttr(key, value))
  }

  return attrs
}

function renderToastCall(node: ConfigNode, indent: number): string {
  const pad = '  '.repeat(indent)
  const title = typeof node.props.title === 'string' ? node.props.title : 'Changes saved'
  const description = typeof node.props.description === 'string' ? node.props.description : ''
  const type = typeof node.props.type === 'string' ? node.props.type : 'success'
  const duration = typeof node.props.duration === 'number' ? node.props.duration : undefined
  const label = jsxText(node.text || 'Show toast')
  const method = type === 'default' ? 'toast' : `toast.${type}`
  const fields: string[] = []
  if (description) fields.push(`description: ${JSON.stringify(description)}`)
  if (duration != null && duration !== 4000) fields.push(`duration: ${duration}`)
  const args = fields.length ? `${JSON.stringify(title)}, { ${fields.join(', ')} }` : JSON.stringify(title)
  return `${pad}<Button onPress={() => ${method}(${args})}>\n${pad}  ${label}\n${pad}</Button>`
}

function renderNode(registry: BuilderRegistry, node: ConfigNode, indent: number, platform: PlatformId): string {
  if (node.component === 'Toast') return renderToastCall(node, indent)
  const pad = '  '.repeat(indent)
  const tag = registry.get(node.component).jsxTag
  const attrs = emittedAttrs(registry, node, platform)
  const text = node.text ?? ''
  const children = node.children.map((child) => renderNode(registry, child, indent + 1, platform))
  const hasElements = children.length > 0
  const multiline = attrs.length >= 2 || hasElements || text.length > 48

  if (!text && !hasElements) {
    if (attrs.length === 0) return `${pad}<${tag} />`
    if (attrs.length === 1) return `${pad}<${tag} ${attrs[0]} />`
    return `${pad}<${tag}\n${attrs.map((attr) => `${pad}  ${attr}`).join('\n')}\n${pad}/>`
  }

  if (!multiline && !hasElements) {
    const attr = attrs.length ? ` ${attrs.join(' ')}` : ''
    return `${pad}<${tag}${attr}>${jsxText(text)}</${tag}>`
  }

  const open =
    attrs.length === 0
      ? `${pad}<${tag}>`
      : `${pad}<${tag}\n${attrs.map((attr) => `${pad}  ${attr}`).join('\n')}\n${pad}>`
  const body = [...(text ? [`${pad}  ${jsxText(text)}`] : []), ...children]
  return `${open}\n${body.join('\n')}\n${pad}</${tag}>`
}

/** TSX for a tree, importing from the registry's package. Props equal to their metadata default are left out. */
export function generateCode(root: ConfigNode, { registry, platform = 'web' }: CodeOptions): string {
  const names = [...collectImports(registry, root)].sort()
  const jsx = renderNode(registry, root, 0, platform)
  return `import { ${names.join(', ')} } from '${registry.importSource}'\n\n${jsx}\n`
}
