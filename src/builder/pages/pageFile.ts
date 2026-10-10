import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import { compactTree } from '../shareConfig'
import { pageName, readPageTree, sanitizePageSettings, type PageSettings, type SavedPage } from './pageStore'

/** Marks a JSON file as a builder page, so an import can tell it from any other JSON. */
const FORMAT = 'advui-builder.page'
const VERSION = 1
const NOT_A_PAGE = 'This file isn’t an AdvUI Builder page.'

/** Larger than any page the builder keeps (5,000 layers), small enough to read at once. */
export const PAGE_FILE_LIMIT = 5_000_000

export interface PageFile {
  name: string
  settings: PageSettings
  document: ConfigNode
}

export type PageFileResult = { ok: true; page: PageFile } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** ASCII letters and digits, accents folded (`Café` → `Cafe`). */
function words(text: string): string[] {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[A-Za-z0-9]+/g) ?? []
}

/** Words as a component name: `pricing table` → `PricingTable`. Null when no letters or digits are left. */
export function pascalCase(text: string): string | null {
  const name = words(text)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('')
  if (!name) return null
  return (/^\d/.test(name) ? `Page${name}` : name).slice(0, 64)
}

/** The component a page exports when none is set: `Home` → `HomePage`, `Landing page` → `LandingPage`. */
export function componentName(name: string): string {
  const parts = words(name)
  if (!parts.some((word) => word.toLowerCase() === 'page')) parts.push('Page')
  return pascalCase(parts.join(' ')) ?? 'Page'
}

export function exportName(page: SavedPage | null): string {
  return page?.settings?.component ?? componentName(page?.name ?? '')
}

/** `Home page` → `home-page.page.json`. */
export function pageFileName(name: string): string {
  const slug = words(name).join('-').toLowerCase().slice(0, 60)
  return `${slug || 'page'}.page.json`
}

export function pageFileText(page: SavedPage, document: ConfigNode): string {
  const settings = page.settings ?? {}
  const file = { format: FORMAT, version: VERSION, name: page.name, settings, document: compactTree(document) }
  return `${JSON.stringify(file, null, 2)}\n`
}

/** Reads a page file as leniently as a saved page: layers this version can't show are dropped. */
export function readPageFile(registry: BuilderRegistry, text: string): PageFileResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: NOT_A_PAGE }
  }
  if (!isRecord(data) || data.format !== FORMAT || typeof data.version !== 'number') {
    return { ok: false, error: NOT_A_PAGE }
  }
  if (data.version > VERSION) return { ok: false, error: 'This page file comes from a newer version of the builder.' }
  const document = readPageTree(registry, data.document)
  if (!document) return { ok: false, error: 'The page in this file can’t be read.' }
  return {
    ok: true,
    page: { name: pageName(data.name) ?? 'Imported page', settings: sanitizePageSettings(data.settings), document },
  }
}
