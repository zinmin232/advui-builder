import { DARK_CANVAS } from './canvasTheme'
import type { PlatformId } from '../registry/metadata'
import { clampWidth, clampZoom, type BuilderMode } from './state/builderState'

const KEY = 'advui-builder.preferences.v1'

export interface Preferences {
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  sidebarWidth: number
  inspectorWidth: number
  codePanelHeight: number
  recent: string[]
  favorites: string[]
  background: string
  theme: 'light' | 'dark'
  zoom: number
  viewportWidth: number
  platform: PlatformId
  lastComponent: string
  mode: BuilderMode
}

export const defaultPreferences: Preferences = {
  sidebarCollapsed: false,
  inspectorCollapsed: false,
  sidebarWidth: 260,
  inspectorWidth: 320,
  codePanelHeight: 148,
  recent: [],
  favorites: [],
  background: DARK_CANVAS,
  theme: 'dark',
  zoom: 1,
  viewportWidth: 1024,
  platform: 'web',
  lastComponent: 'Button',
  mode: 'component',
}

function isLegacyDefault(theme: Preferences['theme'] | undefined, background: unknown): boolean {
  return theme !== 'dark' && (typeof background !== 'string' || background.toLowerCase() === '#f5f5f5')
}

/** Light survives only with a non-legacy canvas; everything else opens dark. */
function resolveTheme(theme: Preferences['theme'] | undefined, background: unknown): Preferences['theme'] {
  return theme === 'light' && !isLegacyDefault(theme, background) ? 'light' : 'dark'
}

function resolveCanvas(background: unknown, theme: Preferences['theme'] | undefined): string {
  return typeof background === 'string' && !isLegacyDefault(theme, background) ? background : DARK_CANVAS
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function clampSidebarWidth(width: number): number {
  return clamp(width, 200, 420, defaultPreferences.sidebarWidth)
}

export function clampInspectorWidth(width: number): number {
  return clamp(width, 260, 480, defaultPreferences.inspectorWidth)
}

export function clampCodeHeight(height: number): number {
  return clamp(height, 96, 420, defaultPreferences.codePanelHeight)
}

export function pushRecent(recent: string[], name: string): string[] {
  return [name, ...recent.filter((item) => item !== name)].slice(0, 8)
}

export function sanitizePreferences(value: unknown): Preferences {
  const source = value && typeof value === 'object' ? (value as Partial<Preferences>) : {}
  const platform: PlatformId =
    source.platform === 'android' || source.platform === 'ios' || source.platform === 'web' ? source.platform : 'web'
  return {
    sidebarCollapsed: Boolean(source.sidebarCollapsed),
    inspectorCollapsed: Boolean(source.inspectorCollapsed),
    sidebarWidth: clampSidebarWidth(source.sidebarWidth ?? defaultPreferences.sidebarWidth),
    inspectorWidth: clampInspectorWidth(source.inspectorWidth ?? defaultPreferences.inspectorWidth),
    codePanelHeight: clampCodeHeight(source.codePanelHeight ?? defaultPreferences.codePanelHeight),
    recent: Array.isArray(source.recent) ? source.recent.filter((item) => typeof item === 'string').slice(0, 8) : [],
    favorites: Array.isArray(source.favorites) ? source.favorites.filter((item) => typeof item === 'string') : [],
    background: resolveCanvas(source.background, source.theme),
    theme: resolveTheme(source.theme, source.background),
    zoom: typeof source.zoom === 'number' ? clampZoom(source.zoom) : 1,
    viewportWidth: typeof source.viewportWidth === 'number' ? clampWidth(source.viewportWidth) : 1024,
    platform,
    lastComponent: typeof source.lastComponent === 'string' ? source.lastComponent : 'Button',
    mode: source.mode === 'page' ? 'page' : 'component',
  }
}

export function loadPreferences(storage: Pick<Storage, 'getItem'> | null = browserStorage()): Preferences {
  if (!storage) return { ...defaultPreferences }
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return { ...defaultPreferences }
    return sanitizePreferences(JSON.parse(raw))
  } catch {
    return { ...defaultPreferences }
  }
}

export function savePreferences(
  preferences: Preferences,
  storage: Pick<Storage, 'setItem'> | null = browserStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(KEY, JSON.stringify(sanitizePreferences(preferences)))
  } catch {
    // Storage is full (saved pages share it) or blocked. Preferences are a convenience; carry on without them.
  }
}

/** The browser's localStorage, or null where it is blocked. */
export function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}
