import { advuiRegistry } from '../registry/componentRegistry'
import { layerClipboardData, readLayerClipboard } from './layerClipboard'

describe('layer clipboard', () => {
  it('reads back a copied layer with its parts, props and text', () => {
    const card = advuiRegistry.createDocument('Card')
    expect(readLayerClipboard(advuiRegistry, layerClipboardData(card))).toEqual(card)
  })

  it('ignores anything that is not a whole layer this registry can show', () => {
    const badge = { id: 'badge', component: 'Badge' }
    const copy = (fields: object) => JSON.stringify({ format: 'advui-builder.layer', version: 1, tree: badge, ...fields })
    expect(readLayerClipboard(advuiRegistry, 'Plain text')).toBeNull()
    expect(readLayerClipboard(advuiRegistry, copy({ format: 'other' }))).toBeNull()
    expect(readLayerClipboard(advuiRegistry, copy({ version: 2 }))).toBeNull()
    expect(readLayerClipboard(advuiRegistry, copy({ tree: { id: 'x', component: 'Retired' } }))).toBeNull()
    // Unlike a saved page, a paste never drops part of what was copied.
    const broken = { id: 'stack', component: 'Stack', children: [{ id: 'x', component: 'Retired' }] }
    expect(readLayerClipboard(advuiRegistry, copy({ tree: broken }))).toBeNull()
    expect(readLayerClipboard(advuiRegistry, copy({}))?.component).toBe('Badge')
  })
})
