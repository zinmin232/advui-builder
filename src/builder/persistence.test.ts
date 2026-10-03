import { DARK_CANVAS, LIGHT_CANVAS } from './canvasTheme'
import { defaultPreferences, loadPreferences, pushRecent, savePreferences } from './persistence'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

describe('persistence', () => {
  it('stores sidebar, panel sizes, and recent components', () => {
    const storage = memory()
    savePreferences(
      {
        ...defaultPreferences,
        sidebarCollapsed: true,
        sidebarWidth: 900,
        inspectorWidth: 100,
        codePanelHeight: 10,
        recent: pushRecent(['Button'], 'Card'),
        favorites: ['Input'],
      },
      storage,
    )
    const loaded = loadPreferences(storage)
    expect(loaded.sidebarCollapsed).toBe(true)
    expect(loaded.sidebarWidth).toBe(420)
    expect(loaded.inspectorWidth).toBe(260)
    expect(loaded.codePanelHeight).toBe(96)
    expect(loaded.recent).toEqual(['Card', 'Button'])
    expect(loaded.favorites).toEqual(['Input'])
  })

  it('opens in dark and keeps an explicit light theme', () => {
    const storage = memory()
    expect(loadPreferences(storage).theme).toBe('dark')
    expect(loadPreferences(storage).background).toBe(DARK_CANVAS)

    storage.setItem(
      'advui-builder.preferences.v1',
      JSON.stringify({ ...defaultPreferences, theme: 'light', background: '#F5F5F5' }),
    )
    expect(loadPreferences(storage).theme).toBe('dark')

    storage.setItem(
      'advui-builder.preferences.v1',
      JSON.stringify({ ...defaultPreferences, theme: 'light', background: LIGHT_CANVAS }),
    )
    const light = loadPreferences(storage)
    expect(light.theme).toBe('light')
    expect(light.background).toBe(LIGHT_CANVAS)
  })

  it('falls back when storage is empty or invalid', () => {
    const storage = memory()
    expect(loadPreferences(storage).lastComponent).toBe('Button')
    storage.setItem('advui-builder.preferences.v1', '{')
    expect(loadPreferences(storage).platform).toBe('web')
    storage.setItem('advui-builder.preferences.v1', JSON.stringify({ zoom: 9, viewportWidth: 99999 }))
    expect(loadPreferences(storage).zoom).toBe(1.5)
    expect(loadPreferences(storage).viewportWidth).toBe(1440)
  })
})
