import type { BreakpointMetadata } from './metadata'

/**
 * Responsive props take a plain value or a mobile-first map such as `{ base: 'column', md: 'row' }`: a value for
 * the smallest screens (`base`) and from each breakpoint up. A breakpoint without a value takes the nearest one
 * below it.
 */
export type ResponsiveMap = Record<string, unknown>

export const BASE = 'base'

export function isResponsiveMap(value: unknown): value is ResponsiveMap {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `base` and then every breakpoint name, smallest first: the order values cascade in. */
export function breakpointKeys(breakpoints: readonly BreakpointMetadata[]): string[] {
  return [BASE, ...breakpoints.map((breakpoint) => breakpoint.name)]
}

/** The breakpoint a screen of this width is in: the largest one it reaches, or `base` below them all. */
export function breakpointAt(breakpoints: readonly BreakpointMetadata[], width: number): string {
  let current = BASE
  for (const breakpoint of breakpoints) if (width >= breakpoint.minWidth) current = breakpoint.name
  return current
}

/** The value given for exactly this key. A plain value counts as `base`. */
export function ownValue(value: unknown, key: string): unknown {
  if (isResponsiveMap(value)) return value[key]
  return key === BASE ? value : undefined
}

/** The value that applies at `key`: the nearest one given at or below it. */
export function valueAt(value: unknown, key: string, keys: readonly string[]): unknown {
  let current: unknown
  for (const each of keys) {
    current = ownValue(value, each) ?? current
    if (each === key) break
  }
  return current
}

/**
 * `value` with `next` at `key` (`undefined` clears it). The map keeps breakpoint order, and a map left with only
 * `base` becomes a plain value again.
 */
export function withValueAt(value: unknown, key: string, next: unknown, keys: readonly string[]): unknown {
  if (key === BASE && !isResponsiveMap(value)) return next
  const merged: ResponsiveMap = { ...(isResponsiveMap(value) ? value : value === undefined ? {} : { [BASE]: value }) }
  if (next === undefined) delete merged[key]
  else merged[key] = next
  const ordered: ResponsiveMap = {}
  for (const each of keys) if (merged[each] !== undefined) ordered[each] = merged[each]
  const given = Object.keys(ordered)
  if (given.length === 0) return undefined
  if (given.length === 1 && given[0] === BASE) return ordered[BASE]
  return ordered
}

/** Whether breakpoint `key` is in a range: from `above` (inclusive) up to `below` (exclusive). */
export function inRange(key: string, keys: readonly string[], range: { above?: unknown; below?: unknown }): boolean {
  const at = keys.indexOf(key)
  const from = typeof range.above === 'string' ? keys.indexOf(range.above) : -1
  const to = typeof range.below === 'string' ? keys.indexOf(range.below) : -1
  return (from < 0 || at >= from) && (to < 0 || at < to)
}

/**
 * The value a component should get to look as it does on a screen at breakpoint `key`, without media queries:
 * the value that applies there, or an empty map below the first breakpoint of a map without `base`, which the
 * component treats as it would the whole map there.
 */
export function valueForScreen(value: unknown, key: string, keys: readonly string[]): unknown {
  if (!isResponsiveMap(value)) return value
  return valueAt(value, key, keys) ?? {}
}
