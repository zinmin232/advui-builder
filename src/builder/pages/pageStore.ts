import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import { compactTree, readTree, type TreeLimits } from '../shareConfig'

/** The list of saved pages. Each page's tree is stored under its own key, so a save writes one page. */
const INDEX_KEY = 'advui-builder.pages.v1'
const PAGE_KEY = 'advui-builder.page.v1.'
const UNTITLED = 'Untitled page'
const ID_PATTERN = /^[\w-]{1,64}$/
const NAME_LIMIT = 80

/**
 * Saved pages are the user's own work, so they are read generously: a layer this version can't show (a component
 * renamed upstream) is dropped with its children, and the rest of the page opens.
 */
const pageLimits: TreeLimits = { nodes: 5000, depth: 64, lenient: true }

export type PageStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface SavedPage {
  id: string
  name: string
  /** When the page last changed, in milliseconds since the epoch. */
  updatedAt: number
}

export interface PageIndex {
  /** The page Page mode opens. */
  current: string | null
  pages: SavedPage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A page name as typed, tidied: trimmed, single spaces, at most 80 characters. Null when nothing is left. */
export function pageName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ').slice(0, NAME_LIMIT).trim()
  return name === '' ? null : name
}

/** Most recently changed first. */
export function pagesByRecency(pages: readonly SavedPage[]): SavedPage[] {
  return [...pages].sort((left, right) => right.updatedAt - left.updatedAt)
}

export function sanitizePageIndex(value: unknown): PageIndex {
  if (!isRecord(value) || !Array.isArray(value.pages)) return { current: null, pages: [] }
  const ids = new Set<string>()
  const pages: SavedPage[] = []
  for (const item of value.pages) {
    if (!isRecord(item) || typeof item.id !== 'string' || !ID_PATTERN.test(item.id) || ids.has(item.id)) continue
    ids.add(item.id)
    const updatedAt = typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : 0
    pages.push({ id: item.id, name: pageName(item.name) ?? UNTITLED, updatedAt })
  }
  const current = typeof value.current === 'string' && ids.has(value.current) ? value.current : null
  return { current: current ?? pagesByRecency(pages)[0]?.id ?? null, pages }
}

export function loadPageIndex(storage: PageStorage | null): PageIndex {
  try {
    const raw = storage?.getItem(INDEX_KEY)
    return raw ? sanitizePageIndex(JSON.parse(raw)) : { current: null, pages: [] }
  } catch {
    return { current: null, pages: [] }
  }
}

/** False when the browser refused the write (storage full or blocked). */
export function savePageIndex(storage: PageStorage | null, index: PageIndex): boolean {
  return write(storage, INDEX_KEY, index)
}

/** The page's tree, or null when it was never saved or can't be read as a page. */
export function loadPageDocument(registry: BuilderRegistry, storage: PageStorage | null, id: string): ConfigNode | null {
  if (!registry.hasPage) return null
  try {
    const raw = storage?.getItem(PAGE_KEY + id)
    return raw ? readTree(registry, JSON.parse(raw), registry.createPage().component, pageLimits) : null
  } catch {
    return null
  }
}

/** False when the browser refused the write (storage full or blocked). */
export function savePageDocument(storage: PageStorage | null, id: string, document: ConfigNode): boolean {
  return write(storage, PAGE_KEY + id, compactTree(document))
}

export function removePageDocument(storage: PageStorage | null, id: string): void {
  try {
    storage?.removeItem(PAGE_KEY + id)
  } catch {
    // Blocked storage keeps nothing to remove.
  }
}

function write(storage: PageStorage | null, key: string, value: unknown): boolean {
  if (!storage) return false
  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** `base`, or `base 2`, `base 3`… when a page already has that name. */
export function uniqueName(base: string, pages: readonly SavedPage[]): string {
  const taken = new Set(pages.map((page) => page.name))
  if (!taken.has(base)) return base
  let index = 2
  while (taken.has(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}

export function untitledName(pages: readonly SavedPage[]): string {
  return uniqueName(UNTITLED, pages)
}

export function createPageId(pages: readonly SavedPage[], now = Date.now()): string {
  const taken = new Set(pages.map((page) => page.id))
  let id = ''
  do {
    id = `page-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  } while (taken.has(id))
  return id
}

/** Adds a page and makes it the current one. */
export function addPage(index: PageIndex, name: string, now = Date.now()): { index: PageIndex; page: SavedPage } {
  const page: SavedPage = { id: createPageId(index.pages, now), name: uniqueName(name, index.pages), updatedAt: now }
  return { index: { current: page.id, pages: [page, ...index.pages] }, page }
}

/** Marks a page as just changed and current. A page missing from the list is added back as untitled. */
export function touchPage(index: PageIndex, id: string, now = Date.now()): PageIndex {
  if (!index.pages.some((page) => page.id === id)) {
    return { current: id, pages: [{ id, name: untitledName(index.pages), updatedAt: now }, ...index.pages] }
  }
  return { current: id, pages: index.pages.map((page) => (page.id === id ? { ...page, updatedAt: now } : page)) }
}

export function renamePage(index: PageIndex, id: string, name: string): PageIndex {
  const next = pageName(name)
  const page = index.pages.find((item) => item.id === id)
  if (!next || !page || page.name === next) return index
  return { ...index, pages: index.pages.map((item) => (item.id === id ? { ...item, name: next } : item)) }
}

/** Removes a page. When it was the current one, the most recently changed page left takes over. */
export function removePage(index: PageIndex, id: string): PageIndex {
  const pages = index.pages.filter((page) => page.id !== id)
  const current = index.current === id ? (pagesByRecency(pages)[0]?.id ?? null) : index.current
  return { current, pages }
}
