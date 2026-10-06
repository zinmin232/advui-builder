// @vitest-environment node
// The theme brings in Tamagui, which reads `window.matchMedia` when a window exists; jsdom has none.
import { breakpoints } from '@advui/theme'
import { advuiRegistry } from './componentRegistry'

describe('AdvUI breakpoints', () => {
  it('match the AdvUI theme, which keys responsive props', () => {
    expect(Object.fromEntries(advuiRegistry.breakpoints.map((item) => [item.name, item.minWidth]))).toEqual(breakpoints)
  })
})
