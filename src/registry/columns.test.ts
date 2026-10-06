import { isValidSpans, parseSpans } from './columns'

describe('column spans', () => {
  it('reads typed spans that add up to 12', () => {
    expect(parseSpans('3 9')).toEqual([3, 9])
    expect(parseSpans(' 4, 4,4 ')).toEqual([4, 4, 4])
    expect(parseSpans('12')).toEqual([12])
  })

  it('rejects spans that are not whole numbers from 1 to 12 filling the row', () => {
    for (const text of ['', '6 5', '6 7', '0 12', '1.5 10.5', '-3 15', 'a b', '6 6 x']) {
      expect(parseSpans(text), text).toBeNull()
    }
    expect(isValidSpans([])).toBe(false)
    expect(isValidSpans([13, -1])).toBe(false)
  })
})
