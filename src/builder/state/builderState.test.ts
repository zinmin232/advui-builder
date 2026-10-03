import type { ConfigNode } from '../../registry/metadata'
import { DARK_CANVAS, LIGHT_CANVAS } from '../canvasTheme'
import { builderReducer, clampWidth, clampZoom, createBuilderState, WIDTH_PRESETS } from './builderState'

function allIds(node: ConfigNode): string[] {
  return [node.id, ...node.children.flatMap(allIds)]
}

describe('builder state', () => {
  it('stores a property override and reset restores the component defaults only', () => {
    const start = builderReducer(createBuilderState('Button', { background: '#111111' }), {
      type: 'set-prop',
      id: 'button',
      key: 'variant',
      value: 'secondary',
    })
    expect(start.document.props).toEqual({ variant: 'secondary' })
    const sized = builderReducer(start, { type: 'set-prop', id: 'button', key: 'size', value: 'lg' })
    expect(sized.document.props).toEqual({ variant: 'secondary', size: 'lg' })
    const back = builderReducer(sized, { type: 'set-prop', id: 'button', key: 'size', value: 'md' })
    expect(back.document.props).toEqual({ variant: 'secondary' })

    const reset = builderReducer(back, { type: 'reset' })
    expect(reset.document.props).toEqual({})
    expect(reset.document.text).toBe('Click Me')
    expect(reset.background).toBe('#111111')
    expect(reset.viewportWidth).toBe(start.viewportWidth)
  })

  it('keeps preview background off the component props', () => {
    const start = createBuilderState('Button')
    const next = builderReducer(start, { type: 'set-background', background: '#F5F5F5' })
    expect(next.background).toBe('#F5F5F5')
    expect(next.document).toBe(start.document)
  })

  it('switches platform, filters nothing in state, and updates the viewport', () => {
    const android = builderReducer(createBuilderState('Image'), { type: 'set-platform', platform: 'android' })
    expect(android.platform).toBe('android')
    expect(android.viewportWidth).toBe(390)
    const ios = builderReducer(android, { type: 'set-platform', platform: 'ios' })
    expect(ios.viewportWidth).toBe(393)
    const web = builderReducer(ios, { type: 'set-platform', platform: 'web' })
    expect(web.viewportWidth).toBe(1024)
  })

  it('defaults to dark and swaps the dotted canvas with the theme', () => {
    const start = createBuilderState()
    expect(start.theme).toBe('dark')
    expect(start.background).toBe(DARK_CANVAS)

    const light = builderReducer(start, { type: 'set-theme', theme: 'light' })
    expect(light.theme).toBe('light')
    expect(light.background).toBe(LIGHT_CANVAS)

    const tinted = builderReducer(light, { type: 'set-background', background: '#010101' })
    const dark = builderReducer(tinted, { type: 'set-theme', theme: 'dark' })
    expect(dark.background).toBe('#010101')
    expect(dark.document).toBe(tinted.document)
  })

  it('clamps the width slider and accepts presets', () => {
    expect(clampWidth(100)).toBe(320)
    expect(clampWidth(2000)).toBe(1440)
    for (const preset of WIDTH_PRESETS) {
      expect(builderReducer(createBuilderState(), { type: 'set-width', width: preset }).viewportWidth).toBe(preset)
    }
    expect(clampZoom(4)).toBe(1.5)
    expect(clampZoom(0.1)).toBe(0.5)
  })

  it('inserts a component into the selected layer and selects it', () => {
    const card = createBuilderState('Card', { selectedId: 'card-image' })
    const next = builderReducer(card, { type: 'insert', component: 'Badge' })
    const content = next.document.children.find((child) => child.id === 'card-content')
    expect(content?.children.map((child) => child.component)).toEqual(['Image', 'Badge'])
    expect(next.selectedId).toBe('badge')
    expect(next.selectedComponent).toBe('Card')

    const again = builderReducer(next, { type: 'insert', component: 'Badge' })
    const updated = again.document.children.find((child) => child.id === 'card-content')
    expect(updated?.children.map((child) => child.id)).toEqual(['card-image', 'badge', 'badge-2'])
    expect(again.selectedId).toBe('badge-2')
  })

  it('gives an inserted component ids that no other layer uses', () => {
    let state = createBuilderState('Stack')
    state = builderReducer(state, { type: 'insert', component: 'Card' })
    state = builderReducer(state, { type: 'select', id: 'stack' })
    state = builderReducer(state, { type: 'insert', component: 'Card' })
    const second = state.document.children.at(-1)!
    state = builderReducer(state, { type: 'place', id: second.children[0].id, targetId: 'stack', position: 'inside' })
    state = builderReducer(state, { type: 'select', id: second.id })
    state = builderReducer(state, { type: 'remove' })
    state = builderReducer(state, { type: 'insert', component: 'Card' })

    const ids = allIds(state.document)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('adds a tab with a trigger and a panel that share a new value', () => {
    const next = builderReducer(createBuilderState('Tabs'), { type: 'add-item' })
    const [list, ...panels] = next.document.children
    expect(list.children.map((trigger) => trigger.props.value)).toEqual(['account', 'password', 'tab-3'])
    expect(panels.map((panel) => panel.props.value)).toEqual(['account', 'password', 'tab-3'])
    expect(next.selectedId).toBe(list.children[2].id)
    const ids = allIds(next.document)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('adds a select option from a selected option, but not from a layer inside a tab panel', () => {
    const select = builderReducer(createBuilderState('Select', { selectedId: 'select-pear' }), { type: 'add-item' })
    const added = select.document.children.at(-1)
    expect(added).toMatchObject({ component: 'Select.Item', props: { value: 'option-4' }, text: 'Option 4' })
    expect(select.selectedId).toBe(added?.id)

    const inPanel = createBuilderState('Tabs', { selectedId: 'tabs-account-text' })
    expect(builderReducer(inPanel, { type: 'add-item' })).toBe(inPanel)
  })

  it('drops a cleared optional prop but keeps an empty required one', () => {
    const input = createBuilderState('Input')
    expect(input.document.props.width).toBe('280px')
    const cleared = builderReducer(input, { type: 'set-prop', id: 'input', key: 'width', value: '' })
    expect(cleared.document.props).not.toHaveProperty('width')

    const image = createBuilderState('Image')
    const decorative = builderReducer(image, { type: 'set-prop', id: 'image', key: 'alt', value: '' })
    expect(decorative.document.props.alt).toBe('')
    expect(builderReducer(image, { type: 'set-prop', id: 'image', key: 'alt', value: undefined })).toBe(image)
  })

  it('leaves the document unchanged when the selection cannot hold children', () => {
    const button = createBuilderState('Button')
    expect(builderReducer(button, { type: 'insert', component: 'Text' })).toBe(button)
  })

  it('removes the selected component and selects its parent', () => {
    const start = createBuilderState('Card', { selectedId: 'card-button' })
    const next = builderReducer(start, { type: 'remove' })
    const footer = next.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children).toEqual([])
    expect(next.selectedId).toBe('card-footer')
    const root = createBuilderState('Card')
    expect(builderReducer(root, { type: 'remove' })).toBe(root)
  })

  it('moves the selected layer among its siblings', () => {
    const card = createBuilderState('Card', { selectedId: 'card-content' })
    const up = builderReducer(card, { type: 'move', direction: 'up' })
    expect(up.document.children.map((child) => child.id)).toEqual(['card-content', 'card-header', 'card-footer'])
    expect(up.selectedId).toBe('card-content')

    const down = builderReducer(up, { type: 'move', direction: 'down' })
    expect(down.document.children.map((child) => child.id)).toEqual(['card-header', 'card-content', 'card-footer'])

    const top = builderReducer(card, { type: 'select', id: 'card-header' })
    expect(builderReducer(top, { type: 'move', direction: 'up' })).toBe(top)
  })

  it('undoes a replaced canvas, a delete, and an insert', () => {
    const card = createBuilderState('Card', { selectedId: 'card-button' })
    const replaced = builderReducer(card, { type: 'select-component', component: 'Stack' })
    const restored = builderReducer(replaced, { type: 'undo' })
    expect(restored.selectedComponent).toBe('Card')
    expect(restored.selectedId).toBe('card-button')
    expect(restored.document.id).toBe('card')

    const removed = builderReducer(card, { type: 'remove' })
    const broughtBack = builderReducer(removed, { type: 'undo' })
    const footer = broughtBack.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children.map((child) => child.id)).toEqual(['card-button'])
    expect(broughtBack.selectedId).toBe('card-button')
    const removedAgain = builderReducer(broughtBack, { type: 'redo' })
    expect(removedAgain.selectedId).toBe('card-footer')
    expect(removedAgain.document.children.find((child) => child.id === 'card-footer')?.children).toEqual([])

    const inserted = builderReducer(card, { type: 'insert', component: 'Badge' })
    const withoutBadge = builderReducer(inserted, { type: 'undo' })
    expect(withoutBadge.selectedId).toBe('card-button')
    expect(withoutBadge.document.children.find((child) => child.id === 'card-footer')?.children).toHaveLength(1)

    const moved = builderReducer(
      builderReducer(card, { type: 'select', id: 'card-content' }),
      { type: 'move', direction: 'up' },
    )
    expect(moved.document.children.map((child) => child.id)[0]).toBe('card-content')
    const unmoved = builderReducer(moved, { type: 'undo' })
    expect(unmoved.document.children.map((child) => child.id)).toEqual(['card-header', 'card-content', 'card-footer'])
  })

  it('groups repeated edits of one field and drops redo after a new edit', () => {
    let state = createBuilderState('Button')
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'A' })
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'AB' })
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'ABC' })
    const undone = builderReducer(state, { type: 'undo' })
    expect(undone.document.text).toBe('Click Me')
    expect(builderReducer(undone, { type: 'undo' })).toBe(undone)

    state = createBuilderState('Button')
    state = builderReducer(state, { type: 'set-prop', id: 'button', key: 'variant', value: 'secondary' })
    state = builderReducer(state, { type: 'set-prop', id: 'button', key: 'size', value: 'lg' })
    const once = builderReducer(state, { type: 'undo' })
    expect(once.document.props).toEqual({ variant: 'secondary' })
    const edited = builderReducer(once, { type: 'set-prop', id: 'button', key: 'variant', value: 'outline' })
    expect(builderReducer(edited, { type: 'redo' })).toBe(edited)
  })

  it('leaves theme and viewport changes out of undo', () => {
    const start = createBuilderState('Button')
    const edited = builderReducer(start, { type: 'set-text', id: 'button', text: 'Save' })
    const themed = builderReducer(edited, { type: 'set-theme', theme: 'light' })
    const undone = builderReducer(themed, { type: 'undo' })
    expect(undone.document.text).toBe('Click Me')
    expect(undone.theme).toBe('light')
    expect(undone.background).toBe(LIGHT_CANVAS)
    const redone = builderReducer(undone, { type: 'redo' })
    expect(redone.document.text).toBe('Save')
    expect(redone.theme).toBe('light')
  })

  it('duplicates the selected layer beside it and undo removes the copy', () => {
    const start = createBuilderState('Card', { selectedId: 'card-button' })
    const copied = builderReducer(start, { type: 'duplicate' })
    const footer = copied.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children.map((child) => child.text)).toEqual(['Continue', 'Continue'])
    expect(copied.selectedId).toBe('button')
    expect(copied.selectedComponent).toBe('Card')

    const undone = builderReducer(copied, { type: 'undo' })
    expect(undone.selectedId).toBe('card-button')
    expect(undone.document.children.find((child) => child.id === 'card-footer')?.children).toHaveLength(1)

    const root = createBuilderState('Button')
    expect(builderReducer(root, { type: 'duplicate' })).toBe(root)
  })

  it('moves a layer into another container and undo puts it back', () => {
    const start = createBuilderState('Card', { selectedId: 'card-image' })
    const moved = builderReducer(start, { type: 'place', id: 'card-button', targetId: 'card-content', position: 'inside' })
    const content = moved.document.children.find((child) => child.id === 'card-content')
    expect(content?.children.map((child) => child.id)).toEqual(['card-image', 'card-button'])
    expect(moved.selectedId).toBe('card-button')

    const undone = builderReducer(moved, { type: 'undo' })
    expect(undone.selectedId).toBe('card-image')
    expect(undone.document.children.find((child) => child.id === 'card-footer')?.children.map((child) => child.id)).toEqual([
      'card-button',
    ])
    expect(builderReducer(start, { type: 'place', id: 'card-content', targetId: 'card-footer', position: 'before' })).toBe(start)
  })
})
