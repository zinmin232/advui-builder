import { advuiRegistry } from '../../registry/componentRegistry'
import type { LayoutAxis } from '../preview/measure'
import { dropPosition, resolveDrop, type Box } from './dropTarget'

const box: Box = { top: 100, left: 0, width: 200, height: 100 }
const layer = (overrides: Partial<{ container: boolean; empty: boolean; root: boolean; axis: LayoutAxis }> = {}) => ({
  container: false,
  empty: false,
  root: false,
  axis: 'vertical' as LayoutAxis,
  ...overrides,
})

describe('drop position', () => {
  it('splits a leaf layer into before and after along its parent axis', () => {
    expect(dropPosition(box, { x: 100, y: 110 }, layer())).toBe('before')
    expect(dropPosition(box, { x: 100, y: 190 }, layer())).toBe('after')
    expect(dropPosition(box, { x: 20, y: 190 }, layer({ axis: 'horizontal' }))).toBe('before')
    expect(dropPosition(box, { x: 180, y: 110 }, layer({ axis: 'horizontal' }))).toBe('after')
  })

  it('gives containers an inside zone in the middle, and empty containers and the root are all inside', () => {
    expect(dropPosition(box, { x: 100, y: 150 }, layer({ container: true }))).toBe('inside')
    expect(dropPosition(box, { x: 100, y: 105 }, layer({ container: true }))).toBe('before')
    expect(dropPosition(box, { x: 100, y: 195 }, layer({ container: true }))).toBe('after')
    expect(dropPosition(box, { x: 100, y: 105 }, layer({ container: true, empty: true }))).toBe('inside')
    expect(dropPosition(box, { x: 100, y: 105 }, layer({ root: true }))).toBe('inside')
  })
})

describe('resolve drop', () => {
  const card = advuiRegistry.createDocument('Card')
  // Every layer gets the same box, so only the pointer position and the rules decide.
  const boxes = (axes: Record<string, LayoutAxis> = {}) => (id: string) => ({ box, axis: axes[id] ?? 'vertical' })

  it('drops beside the layer under the pointer when its parent accepts the component', () => {
    const footerRow = boxes({ 'card-button': 'horizontal' })
    const badge = { component: 'Badge' }
    expect(resolveDrop(advuiRegistry, card, 'card-button', { x: 10, y: 150 }, badge, footerRow)).toEqual({
      id: 'card-button',
      position: 'before',
      axis: 'horizontal',
    })
    expect(resolveDrop(advuiRegistry, card, 'card-title', { x: 10, y: 190 }, badge, boxes())).toEqual({
      id: 'card-title',
      position: 'after',
      axis: 'vertical',
    })
  })

  it('walks up to the nearest layer that accepts the component', () => {
    // Before the Image would put a Card.Title in Card.Content, which the template rules refuse.
    const title = { component: 'Card.Title', movingId: 'card-title' }
    expect(resolveDrop(advuiRegistry, card, 'card-image', { x: 10, y: 110 }, title, boxes())).toBeNull()
    // A Badge over the middle of the footer goes inside it.
    const badge = { component: 'Badge' }
    expect(resolveDrop(advuiRegistry, card, 'card-footer', { x: 10, y: 150 }, badge, boxes())).toEqual({
      id: 'card-footer',
      position: 'inside',
      axis: 'vertical',
    })
  })

  it('puts a column beside an empty column, since it cannot go inside one', () => {
    const row = advuiRegistry.createColumns([8, 4])
    const [first, second] = row.children
    const column = { component: 'Grid.Item', movingId: second.id }
    const flow = boxes({ [first.id]: 'horizontal' })
    expect(resolveDrop(advuiRegistry, row, first.id, { x: 10, y: 150 }, column, flow)).toEqual({
      id: first.id,
      position: 'before',
      axis: 'horizontal',
    })
    // Other components still drop into the empty column.
    expect(resolveDrop(advuiRegistry, row, first.id, { x: 10, y: 150 }, { component: 'Badge' }, flow)).toMatchObject({
      id: first.id,
      position: 'inside',
    })
  })

  it('never drops a layer onto itself or into its own children', () => {
    const footer = { component: 'Card.Footer', movingId: 'card-footer' }
    expect(resolveDrop(advuiRegistry, card, 'card-button', { x: 10, y: 110 }, footer, boxes())).toBeNull()
    expect(resolveDrop(advuiRegistry, card, 'card-footer', { x: 10, y: 110 }, footer, boxes())).toBeNull()
  })
})
