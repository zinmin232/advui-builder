import { advuiRegistry } from '../../registry/componentRegistry'
import type { LayoutAxis } from '../preview/measure'
import { createBuilderReducer, createBuilderState } from '../state/builderState'
import { canDrop } from '../selection/selection'
import { describeSlot, dropPosition, moveSlots, resolveDrop, type Box } from './dropTarget'

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
  const boxes =
    (axes: Record<string, LayoutAxis> = {}) =>
    (id: string) => ({ box, axis: axes[id] ?? 'vertical' })

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

describe('keyboard move slots', () => {
  const card = createBuilderState(advuiRegistry, 'Card').document

  it('lists every allowed place in tree order, starting from where the layer is', () => {
    const slots = moveSlots(advuiRegistry, card, 'card-button')
    const current = slots.filter((slot) => slot.current)
    expect(current).toHaveLength(1)
    expect(describeSlot(current[0], 'card-button')).toBe('Into Footer, where it is now')
    expect(current[0]).toMatchObject({ targetId: 'card-footer', position: 'inside' })
    // Every slot follows the drop rules, and no two land in the same place.
    for (const slot of slots) {
      expect(canDrop(advuiRegistry, card, 'Button', slot.targetId, slot.position, 'card-button')).toBe(true)
    }
    const places = slots.map((slot) => `${slot.parent.id}:${slot.index}`)
    expect(new Set(places).size).toBe(places.length)
    // A Button may go in the card's content, before or after the image.
    expect(slots.map((slot) => describeSlot(slot, 'card-button'))).toEqual(
      expect.arrayContaining(['Before Image in Content', 'After Image, at the end of Content']),
    )
  })

  it('never offers a place inside the moving layer, and nothing for the root', () => {
    const slots = moveSlots(advuiRegistry, card, 'card-header')
    expect(slots.some((slot) => ['card-header', 'card-title', 'card-description'].includes(slot.parent.id))).toBe(false)
    expect(slots.find((slot) => slot.current)).toMatchObject({ parent: { id: 'card' }, index: 0 })
    expect(moveSlots(advuiRegistry, card, 'card')).toEqual([])
  })

  it('places the layer where the slot says', () => {
    const reducer = createBuilderReducer(advuiRegistry)
    const state = createBuilderState(advuiRegistry, 'Card')
    const slot = moveSlots(advuiRegistry, card, 'card-button').find(
      (item) => describeSlot(item, 'card-button') === 'Before Image in Content',
    )
    if (!slot) throw new Error('no slot before the image')
    const moved = reducer(state, { type: 'place', id: 'card-button', targetId: slot.targetId, position: slot.position })
    const content = moved.document.children.find((child) => child.id === 'card-content')
    expect(content?.children.map((child) => child.id)).toEqual(['card-button', 'card-image'])
  })
})
