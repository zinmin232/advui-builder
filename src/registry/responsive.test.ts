import { breakpointAt, breakpointKeys, inRange, valueAt, valueForScreen, withValueAt } from './responsive'

const breakpoints = [
  { name: 'sm', minWidth: 640 },
  { name: 'md', minWidth: 768 },
  { name: 'lg', minWidth: 1024 },
]
const keys = breakpointKeys(breakpoints)

describe('responsive values', () => {
  it('finds the breakpoint a width falls in', () => {
    expect(keys).toEqual(['base', 'sm', 'md', 'lg'])
    expect(breakpointAt(breakpoints, 375)).toBe('base')
    expect(breakpointAt(breakpoints, 768)).toBe('md')
    expect(breakpointAt(breakpoints, 1440)).toBe('lg')
    expect(breakpointAt([], 1440)).toBe('base')
  })

  it('cascades values up from the nearest breakpoint below', () => {
    const value = { base: 'column', md: 'row' }
    expect(valueAt(value, 'base', keys)).toBe('column')
    expect(valueAt(value, 'sm', keys)).toBe('column')
    expect(valueAt(value, 'lg', keys)).toBe('row')
    expect(valueAt('row', 'lg', keys)).toBe('row')
    expect(valueAt({ md: 8 }, 'sm', keys)).toBeUndefined()
  })

  it('sets one breakpoint, keeps breakpoint order, and folds a lone base back into a plain value', () => {
    expect(withValueAt('column', 'md', 'row', keys)).toEqual({ base: 'column', md: 'row' })
    expect(withValueAt(undefined, 'md', 8, keys)).toEqual({ md: 8 })
    expect(Object.keys(withValueAt({ lg: 3 } as unknown, 'sm', 1, keys) as object)).toEqual(['sm', 'lg'])
    expect(withValueAt({ base: 'column', md: 'row' }, 'md', undefined, keys)).toBe('column')
    expect(withValueAt({ md: 8 }, 'md', undefined, keys)).toBeUndefined()
    expect(withValueAt('column', 'base', 'row', keys)).toBe('row')
  })

  it('tells whether a breakpoint is within an above / below range', () => {
    expect(inRange('md', keys, { above: 'md' })).toBe(true)
    expect(inRange('sm', keys, { above: 'md' })).toBe(false)
    expect(inRange('sm', keys, { below: 'md' })).toBe(true)
    expect(inRange('md', keys, { below: 'md' })).toBe(false)
    expect(inRange('md', keys, { above: 'sm', below: 'lg' })).toBe(true)
    expect(inRange('lg', keys, { above: 'sm', below: 'lg' })).toBe(false)
    expect(inRange('base', keys, {})).toBe(true)
  })

  it('gives the preview the value for its breakpoint, or an empty map below a map without base', () => {
    expect(valueForScreen({ base: 1, lg: 3 }, 'md', keys)).toBe(1)
    expect(valueForScreen({ base: 1, lg: 3 }, 'lg', keys)).toBe(3)
    expect(valueForScreen({ md: 8 }, 'base', keys)).toEqual({})
    expect(valueForScreen(4, 'base', keys)).toBe(4)
  })
})
