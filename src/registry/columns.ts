/** Layout presets split a row into columns whose spans add up to this, as in a 12-column grid. */
export const GRID_COLUMNS = 12

/** The presets the sidebar offers. Other splits are typed in as custom spans. */
export const COLUMN_PRESETS: readonly number[][] = [[12], [6, 6], [8, 4], [4, 8], [4, 4, 4], [3, 3, 3, 3]]

/** Whole numbers from 1 to 12 that add up to 12. */
export function isValidSpans(spans: readonly number[]): boolean {
  return (
    spans.length > 0 &&
    spans.every((span) => Number.isInteger(span) && span >= 1 && span <= GRID_COLUMNS) &&
    spans.reduce((sum, span) => sum + span, 0) === GRID_COLUMNS
  )
}

/** Reads typed spans (`3 9`, `4, 4, 4`). Null unless they are valid. */
export function parseSpans(text: string): number[] | null {
  const parts = text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) return null
  const spans = parts.map(Number)
  return isValidSpans(spans) ? spans : null
}
