/**
 * Regenerates src/registry/sourceMeta.ts from AdvUI's `*.meta.ts` files at the
 * git tag that matches the installed @advui/core version. The published package
 * leaves those files out, so the Builder keeps a generated snapshot.
 *
 *   pnpm sync-meta           rewrite the snapshot
 *   pnpm sync-meta --check   exit 1 when the snapshot does not match upstream
 *
 * Meta files are parsed, never executed: each one is a single
 * `export default defineMeta({...})` object literal of plain data, which may
 * use the file's own `const`s and one-expression helper functions.
 * Set GITHUB_TOKEN to raise the GitHub API rate limit.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const REPO = 'zinmin232/advui'
const META_PATH = /^packages\/ui\/src\/components\/.+\.meta\.ts$/
const OUTPUT = fileURLToPath(new URL('../src/registry/sourceMeta.ts', import.meta.url))
const WIDTH = 100

/** AdvUI components the Builder uses, by slug. Add a slug to bring a component in. */
const SLUGS = [
  'button',
  'card',
  'input',
  'badge',
  'image',
  'typography',
  'aspect-ratio',
  'container',
  'grid',
  'scroll-area',
  'stack',
  'wrap',
  'label',
  'textarea',
  'checkbox',
  'switch',
  'separator',
  'select',
  'tabs',
  'avatar',
  'slider',
  'radio-group',
  'password-input',
  'number-input',
  'progress',
  'spinner',
  'skeleton',
  'alert',
  'empty-state',
  'search',
  'chip',
  'list',
  'pagination',
  'alert-dialog',
  'toast',
  'tooltip',
  'dropdown-menu',
]

/** Fields the Builder reads; the rest (usage, files, accessibility...) is left out. Mirrors advuiMetaTypes.ts. */
const FIELDS = [
  'name',
  'slug',
  'category',
  'description',
  'status',
  'since',
  'platforms',
  'exports',
  'keywords',
  'parts',
  'examples',
  'playground',
  'platformNotes',
  'related',
]

async function request(url, as) {
  const headers = { 'User-Agent': 'advui-builder-sync-meta' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
  return as === 'json' ? response.json() : response.text()
}

async function fetchMetaFiles(tag) {
  const tree = await request(`https://api.github.com/repos/${REPO}/git/trees/${tag}?recursive=1`, 'json')
  if (tree.truncated) throw new Error(`The ${tag} file tree is too large to list in one request.`)
  const paths = tree.tree.filter((entry) => entry.type === 'blob' && META_PATH.test(entry.path)).map((entry) => entry.path)
  if (paths.length === 0) throw new Error(`No *.meta.ts files under packages/ui/src/components at ${tag}.`)
  return Promise.all(
    paths.map(async (path) => ({
      path,
      source: await request(`https://raw.githubusercontent.com/${REPO}/${tag}/${path}`, 'text'),
    })),
  )
}

function fail(file, node, message) {
  const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
  return new Error(`${file.fileName}:${line + 1}: ${message}`)
}

function unwrap(node) {
  return ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
    ? unwrap(node.expression)
    : node
}

/**
 * A helper the meta file declares to repeat a prop list, such as
 * `function stackProps({ direction }) { return [...] }` or `(verb) => [...]`.
 * Its body must be one data expression; calling it evaluates that expression
 * with the arguments bound, the same way as the rest of the file.
 */
class Helper {
  constructor(fn, file, scope) {
    this.fn = fn
    this.file = file
    this.scope = scope
  }

  call(args, at) {
    const { fn, file } = this
    let body = fn.body
    if (ts.isBlock(body)) {
      const [only, extra] = body.statements
      if (!only || extra || !ts.isReturnStatement(only) || !only.expression) {
        throw fail(file, at, 'a helper must be a single `return` of plain data')
      }
      body = only.expression
    }
    const local = new Map(this.scope)
    fn.parameters.forEach((parameter, index) => {
      const value = args[index] ?? (parameter.initializer ? literal(parameter.initializer, file, local) : undefined)
      bind(parameter.name, value, file, local)
    })
    return literal(body, file, local)
  }
}

function bind(name, value, file, scope) {
  if (ts.isIdentifier(name)) {
    scope.set(name.text, value)
    return
  }
  if (!ts.isObjectBindingPattern(name)) throw fail(file, name, 'only plain and `{ a, b }` parameters are supported')
  for (const element of name.elements) {
    const key = (element.propertyName ?? element.name).getText(file)
    let item = value?.[key]
    if (item === undefined && element.initializer) item = literal(element.initializer, file, scope)
    bind(element.name, item, file, scope)
  }
}

/**
 * Converts a data-only expression (literals, arrays, objects, template
 * strings) to a value. Names resolve to the file's own `const`s and helpers.
 */
function literal(node, file, scope = new Map()) {
  const value = (child) => literal(child, file, scope)
  node = unwrap(node)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.reduce((text, span) => `${text}${value(span.expression)}${span.literal.text}`, node.head.text)
  }
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text)
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (ts.isIdentifier(node)) {
    if (node.text === 'undefined') return undefined
    const bound = scope.get(node.text)
    if (!scope.has(node.text) || bound instanceof Helper) throw fail(file, node, `unknown value \`${node.text}\``)
    return bound
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.flatMap((element) => (ts.isSpreadElement(element) ? value(element.expression) : [value(element)]))
  }
  if (ts.isObjectLiteralExpression(node)) {
    const object = {}
    const set = (name, item) => {
      if (item !== undefined) object[name] = item
    }
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) Object.assign(object, value(property.expression))
      else if (ts.isShorthandPropertyAssignment(property)) set(property.name.text, value(property.name))
      else if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        set(property.name.text, value(property.initializer))
      } else throw fail(file, property, 'only plain `key: value` properties are supported')
    }
    return object
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const helper = scope.get(node.expression.text)
    if (helper instanceof Helper) return helper.call(node.arguments.map(value), node)
  }
  throw fail(file, node, `unsupported syntax: ${node.getText(file).slice(0, 60)}`)
}

/** The file's top-level `const`s and helper functions, by name. Imports and types are skipped. */
function fileScope(file) {
  const scope = new Map()
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      scope.set(statement.name.text, new Helper(statement, file, scope))
    } else if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue
        const init = unwrap(declaration.initializer)
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          scope.set(declaration.name.text, new Helper(init, file, scope))
          continue
        }
        try {
          scope.set(declaration.name.text, literal(init, file, scope))
        } catch {
          // Not data. The meta object can't use it, and reports it as unknown if it tries.
        }
      }
    }
  }
  return scope
}

function parseMeta(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const exported = file.statements.find(ts.isExportAssignment)
  const call = exported?.expression
  if (!call || !ts.isCallExpression(call) || call.expression.getText(file) !== 'defineMeta' || !call.arguments[0]) {
    throw new Error(`${path}: expected \`export default defineMeta({...})\``)
  }
  return literal(call.arguments[0], file, fileScope(file))
}

function pick(meta) {
  return Object.fromEntries(FIELDS.filter((field) => meta[field] !== undefined).map((field) => [field, meta[field]]))
}

function exportName(slug) {
  return `${slug.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())}Meta`
}

function quote(text) {
  if (text.includes("'") && !text.includes('"')) return JSON.stringify(text)
  return `'${JSON.stringify(text).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'")}'`
}

function key(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name)
}

function entriesOf(value) {
  return Array.isArray(value)
    ? value.map((item) => ['', item])
    : Object.entries(value).map(([name, item]) => [`${key(name)}: `, item])
}

function flat(value) {
  if (typeof value === 'string') return quote(value)
  if (value === null || typeof value !== 'object') return String(value)
  const inline = entriesOf(value).map(([prefix, item]) => `${prefix}${flat(item)}`).join(', ')
  if (Array.isArray(value)) return `[${inline}]`
  return inline ? `{ ${inline} }` : '{}'
}

/** Prints a value as a TypeScript literal: one line when it fits, otherwise one entry per line. */
function print(value, indent, used) {
  const one = flat(value)
  if (value === null || typeof value !== 'object' || used + one.length + 1 <= WIDTH) return one
  const inner = `${indent}  `
  const lines = entriesOf(value).map(
    ([prefix, item]) => `${inner}${prefix}${print(item, inner, inner.length + prefix.length)},`,
  )
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']
  return `${open}\n${lines.join('\n')}\n${indent}${close}`
}

function render(version, metas) {
  const blocks = metas.map(({ slug, meta }) => {
    const head = `export const ${exportName(slug)}: ComponentMeta = `
    return `${head}${print(pick(meta), '', head.length)}\n`
  })
  return [
    `// Generated by scripts/sync-meta.mjs from ${REPO}@v${version}. Do not edit by hand:`,
    '// run `pnpm sync-meta` after upgrading @advui/core.',
    "import type { ComponentMeta } from './advuiMetaTypes'",
    '',
    '/** The @advui/core version these snapshots were taken from. */',
    `export const advuiMetaVersion = '${version}'`,
    '',
    blocks.join('\n'),
  ].join('\n')
}

async function main() {
  const check = process.argv.includes('--check')
  const { version } = createRequire(import.meta.url)('@advui/core/package.json')
  const tag = `v${version}`
  console.log(`Reading AdvUI metadata at ${REPO}@${tag}...`)

  const bySlug = new Map()
  for (const { path, source } of await fetchMetaFiles(tag)) {
    const meta = parseMeta(path, source)
    bySlug.set(meta.slug, meta)
  }
  const missing = SLUGS.filter((slug) => !bySlug.has(slug))
  if (missing.length > 0) throw new Error(`Not in AdvUI ${tag}: ${missing.join(', ')}. Update SLUGS in scripts/sync-meta.mjs.`)

  const existing = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : ''
  const eol = existing.includes('\r\n') ? '\r\n' : '\n'
  const next = render(version, SLUGS.map((slug) => ({ slug, meta: bySlug.get(slug) }))).replace(/\n/g, eol)

  if (check) {
    if (existing === next) {
      console.log(`sourceMeta.ts matches AdvUI ${tag}.`)
      return
    }
    console.error(`sourceMeta.ts is out of date with AdvUI ${tag}. Run \`pnpm sync-meta\`.`)
    process.exitCode = 1
    return
  }
  writeFileSync(OUTPUT, next)
  console.log(`Wrote ${SLUGS.length} components to src/registry/sourceMeta.ts${existing === next ? ' (no changes)' : ''}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
