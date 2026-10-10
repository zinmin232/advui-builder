export const DARK_CANVAS = '#1A1C20'
export const LIGHT_CANVAS = '#F3F4F6'
const LEGACY_CANVAS = '#F5F5F5'

export function canvasForTheme(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? DARK_CANVAS : LIGHT_CANVAS
}

export function isThemeCanvas(color: string): boolean {
  const value = color.toLowerCase()
  return (
    value === DARK_CANVAS.toLowerCase() || value === LIGHT_CANVAS.toLowerCase() || value === LEGACY_CANVAS.toLowerCase()
  )
}
