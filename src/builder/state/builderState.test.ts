import { advuiRegistry } from '../../registry/componentRegistry'
import type { ConfigNode } from '../../registry/metadata'
import { DARK_CANVAS, LIGHT_CANVAS } from '../canvasTheme'
import {
  clampWidth,
  clampZoom,
  createBuilderReducer,
  createBuilderState,
  pageDocument,
  WIDTH_PRESETS,
  type BuilderAction,
  type BuilderState,
} from './builderState'

const builderReducer = createBuilderReducer(advuiRegistry)

function allIds(node: ConfigNode): string[] {
  return [node.id, ...node.children.flatMap(allIds)]
}

describe('builder state', () => {
  it('stores a property override and reset restores the component defaults only', () => {
    const start = builderReducer(createBuilderState(advuiRegistry, 'Button', { background: '#111111' }), {
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
    const start = createBuilderState(advuiRegistry, 'Button')
    const next = builderReducer(start, { type: 'set-background', background: '#F5F5F5' })
    expect(next.background).toBe('#F5F5F5')
    expect(next.document).toBe(start.document)
  })

  it('switches platform, filters nothing in state, and updates the viewport', () => {
    const image = createBuilderState(advuiRegistry, 'Image')
    const android = builderReducer(image, { type: 'set-platform', platform: 'android' })
    expect(android.platform).toBe('android')
    expect(android.viewportWidth).toBe(390)
    const ios = builderReducer(android, { type: 'set-platform', platform: 'ios' })
    expect(ios.viewportWidth).toBe(393)
    const web = builderReducer(ios, { type: 'set-platform', platform: 'web' })
    expect(web.viewportWidth).toBe(1024)
  })

  it('defaults to dark and swaps the dotted canvas with the theme', () => {
    const start = createBuilderState(advuiRegistry)
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
      const sized = builderReducer(createBuilderState(advuiRegistry), { type: 'set-width', width: preset })
      expect(sized.viewportWidth).toBe(preset)
    }
    expect(clampZoom(4)).toBe(1.5)
    expect(clampZoom(0.1)).toBe(0.5)
  })

  it('inserts a component into the selected layer and selects it', () => {
    const card = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-image' })
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
    let state = createBuilderState(advuiRegistry, 'Stack')
    state = builderReducer(state, { type: 'insert', component: 'Card' })
    state = builderReducer(state, { type: 'select', id: 'stack' })
    state = builderReducer(state, { type: 'insert', component: 'Card' })
    const second = state.document.children.at(-1)!
    const button = second.children.at(-1)!.children[0]
    state = builderReducer(state, { type: 'place', id: button.id, targetId: 'stack', position: 'inside' })
    expect(state.document.children.at(-1)?.id).toBe(button.id)
    state = builderReducer(state, { type: 'select', id: second.id })
    state = builderReducer(state, { type: 'remove' })
    state = builderReducer(state, { type: 'insert', component: 'Card' })

    const ids = allIds(state.document)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('adds a tab with a trigger and a panel that share a new value', () => {
    const next = builderReducer(createBuilderState(advuiRegistry, 'Tabs'), { type: 'add-item' })
    const [list, ...panels] = next.document.children
    expect(list.children.map((trigger) => trigger.props.value)).toEqual(['account', 'password', 'tab-3'])
    expect(panels.map((panel) => panel.props.value)).toEqual(['account', 'password', 'tab-3'])
    expect(next.selectedId).toBe(list.children[2].id)
    const ids = allIds(next.document)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('adds a select option from a selected option, but not from a layer inside a tab panel', () => {
    const pear = createBuilderState(advuiRegistry, 'Select', { selectedId: 'select-pear' })
    const select = builderReducer(pear, { type: 'add-item' })
    const added = select.document.children.at(-1)
    expect(added).toMatchObject({ component: 'Select.Item', props: { value: 'option-4' }, text: 'Option 4' })
    expect(select.selectedId).toBe(added?.id)

    const inPanel = createBuilderState(advuiRegistry, 'Tabs', { selectedId: 'tabs-account-text' })
    expect(builderReducer(inPanel, { type: 'add-item' })).toBe(inPanel)
  })

  it('adds a radio option with a matching label, a list item, and a menu item', () => {
    const radio = builderReducer(createBuilderState(advuiRegistry, 'RadioGroup'), { type: 'add-item' })
    const [item, label] = radio.document.children.slice(-2)
    expect(item).toMatchObject({
      component: 'RadioGroup.Item',
      label: 'Option 3',
      props: { value: 'option-3', id: 'radio-group-option-3' },
    })
    expect(label).toMatchObject({ component: 'Label', props: { htmlFor: 'radio-group-option-3' }, text: 'Option 3' })
    expect(radio.selectedId).toBe(item.id)

    const list = builderReducer(createBuilderState(advuiRegistry, 'List'), { type: 'add-item' })
    expect(list.document.children.at(-1)).toMatchObject({ component: 'List.Item', props: { title: 'Item 3' } })

    const menu = builderReducer(createBuilderState(advuiRegistry, 'DropdownMenu', { selectedId: 'dropdown-edit' }), {
      type: 'add-item',
    })
    const content = menu.document.children.find((child) => child.id === 'dropdown-content')
    expect(content?.children.at(-1)).toMatchObject({ component: 'DropdownMenu.Item', text: 'Item 4' })
  })

  it('drops a cleared optional prop but keeps an empty required one', () => {
    const input = createBuilderState(advuiRegistry, 'Input')
    expect(input.document.props.width).toBe('280px')
    const cleared = builderReducer(input, { type: 'set-prop', id: 'input', key: 'width', value: '' })
    expect(cleared.document.props).not.toHaveProperty('width')

    const image = createBuilderState(advuiRegistry, 'Image')
    const decorative = builderReducer(image, { type: 'set-prop', id: 'image', key: 'alt', value: '' })
    expect(decorative.document.props.alt).toBe('')
    expect(builderReducer(image, { type: 'set-prop', id: 'image', key: 'alt', value: undefined })).toBe(image)
  })

  it('leaves the document unchanged when the selection cannot hold children', () => {
    const button = createBuilderState(advuiRegistry, 'Button')
    expect(builderReducer(button, { type: 'insert', component: 'Text' })).toBe(button)
  })

  it('removes the selected component and selects its parent', () => {
    const start = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })
    const next = builderReducer(start, { type: 'remove' })
    const footer = next.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children).toEqual([])
    expect(next.selectedId).toBe('card-footer')
    const root = createBuilderState(advuiRegistry, 'Card')
    expect(builderReducer(root, { type: 'remove' })).toBe(root)
  })

  it('moves the selected layer among its siblings', () => {
    const card = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-content' })
    const up = builderReducer(card, { type: 'move', direction: 'up' })
    expect(up.document.children.map((child) => child.id)).toEqual(['card-content', 'card-header', 'card-footer'])
    expect(up.selectedId).toBe('card-content')

    const down = builderReducer(up, { type: 'move', direction: 'down' })
    expect(down.document.children.map((child) => child.id)).toEqual(['card-header', 'card-content', 'card-footer'])

    const top = builderReducer(card, { type: 'select', id: 'card-header' })
    expect(builderReducer(top, { type: 'move', direction: 'up' })).toBe(top)
  })

  it('undoes a replaced canvas, a delete, and an insert', () => {
    const card = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })
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
    let state = createBuilderState(advuiRegistry, 'Button')
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'A' })
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'AB' })
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'ABC' })
    const undone = builderReducer(state, { type: 'undo' })
    expect(undone.document.text).toBe('Click Me')
    expect(builderReducer(undone, { type: 'undo' })).toBe(undone)

    state = createBuilderState(advuiRegistry, 'Button')
    state = builderReducer(state, { type: 'set-prop', id: 'button', key: 'variant', value: 'secondary' })
    state = builderReducer(state, { type: 'set-prop', id: 'button', key: 'size', value: 'lg' })
    const once = builderReducer(state, { type: 'undo' })
    expect(once.document.props).toEqual({ variant: 'secondary' })
    const edited = builderReducer(once, { type: 'set-prop', id: 'button', key: 'variant', value: 'outline' })
    expect(builderReducer(edited, { type: 'redo' })).toBe(edited)
  })

  it('leaves theme and viewport changes out of undo', () => {
    const start = createBuilderState(advuiRegistry, 'Button')
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
    const start = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })
    const copied = builderReducer(start, { type: 'duplicate' })
    const footer = copied.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children.map((child) => child.text)).toEqual(['Continue', 'Continue'])
    expect(copied.selectedId).toBe('button')
    expect(copied.selectedComponent).toBe('Card')

    const undone = builderReducer(copied, { type: 'undo' })
    expect(undone.selectedId).toBe('card-button')
    expect(undone.document.children.find((child) => child.id === 'card-footer')?.children).toHaveLength(1)

    const root = createBuilderState(advuiRegistry, 'Button')
    expect(builderReducer(root, { type: 'duplicate' })).toBe(root)
  })

  it('moves a layer into another container and undo puts it back', () => {
    const start = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-image' })
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

describe('page mode', () => {
  const ids = (node: ConfigNode) => node.children.map((child) => child.component)

  it('opens an empty page and keeps each mode\'s document when switching back and forth', () => {
    let state = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })
    state = builderReducer(state, { type: 'set-prop', id: 'card-button', key: 'variant', value: 'secondary' })
    state = builderReducer(state, { type: 'set-mode', mode: 'page' })
    expect(state.mode).toBe('page')
    expect(state.document).toMatchObject({ id: 'page', component: 'Stack', label: 'Page', children: [] })
    expect(state.selectedId).toBe('page')

    state = builderReducer(state, { type: 'open', component: 'Button' })
    expect(ids(state.document)).toEqual(['Button'])
    state = builderReducer(state, { type: 'set-mode', mode: 'component' })
    expect(state.document.id).toBe('card')
    expect(state.selectedId).toBe('card-button')
    expect(state.document.children.at(-1)?.children[0].props).toEqual({ variant: 'secondary' })

    state = builderReducer(state, { type: 'set-mode', mode: 'page' })
    expect(ids(state.document)).toEqual(['Button'])
    expect(builderReducer(state, { type: 'set-mode', mode: 'page' })).toBe(state)
  })

  it('adds sidebar components to the selected container, or to the page', () => {
    let state = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Card' })
    const card = state.document.children[0]
    expect(state.selectedId).toBe(card.id)

    const content = card.children.find((child) => child.component === 'Card.Content')!
    state = builderReducer(state, { type: 'select', id: content.id })
    state = builderReducer(state, { type: 'open', component: 'Badge' })
    const contentAfter = state.document.children[0].children.find((child) => child.id === content.id)!
    expect(ids(contentAfter)).toEqual(['Image', 'Badge'])

    // A Button cannot hold children and the page is its parent, so the next one lands on the page.
    state = builderReducer(state, { type: 'select', id: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Button' })
    state = builderReducer(state, { type: 'open', component: 'Text' })
    expect(ids(state.document)).toEqual(['Card', 'Button', 'Text'])
    expect(state.selectedComponent).toBe('Button')
  })

  it('resets to an empty page, and undo brings the page back', () => {
    let state = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Card' })
    state = builderReducer(state, { type: 'reset' })
    expect(state.document.children).toEqual([])
    state = builderReducer(state, { type: 'undo' })
    expect(ids(state.document)).toEqual(['Card'])
  })

  it('parks the page when a component is opened directly, and undo returns to the page', () => {
    let state = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Badge' })
    state = builderReducer(state, { type: 'select-component', component: 'Input' })
    expect(state.mode).toBe('component')
    expect(state.document.component).toBe('Input')
    const back = builderReducer(state, { type: 'undo' })
    expect(back.mode).toBe('page')
    expect(ids(back.document)).toEqual(['Badge'])
    expect(ids(builderReducer(state, { type: 'set-mode', mode: 'page' }).document)).toEqual(['Badge'])
  })

  it('loads a saved page over the open one, parks a component, and starts a new undo history', () => {
    const saved = builderReducer(createBuilderState(advuiRegistry, 'Button', { mode: 'page' }), {
      type: 'open',
      component: 'Card',
    }).document
    let state = createBuilderState(advuiRegistry, 'Input', { pageId: 'page-a' })
    state = builderReducer(state, { type: 'set-prop', id: 'input', key: 'placeholder', value: 'Email' })
    state = builderReducer(state, { type: 'load-page', id: 'page-b', document: saved })
    expect(state).toMatchObject({ mode: 'page', pageId: 'page-b', selectedId: 'page', past: [], future: [] })
    expect(state.document).toBe(saved)
    expect(pageDocument(state)).toBe(saved)

    // The component edit was parked, not lost, and the page stays the saved one behind Component mode.
    const component = builderReducer(state, { type: 'set-mode', mode: 'component' })
    expect(component.document.props).toMatchObject({ placeholder: 'Email' })
    expect(pageDocument(component)).toBe(saved)
    expect(builderReducer(state, { type: 'undo' })).toBe(state)
  })
})

describe('layout presets', () => {
  it('adds a row of columns to the page or the selected container, and undo removes it', () => {
    const page = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    const added = builderReducer(page, { type: 'insert-columns', spans: [8, 4] })
    const row = added.document.children[0]
    expect(row).toMatchObject({ component: 'Grid', label: 'Columns 8 4', props: { columns: 12 } })
    expect(row.children.map((column) => [column.component, column.props.span])).toEqual([
      ['Grid.Item', { base: 12, md: 8 }],
      ['Grid.Item', { base: 12, md: 4 }],
    ])
    expect(added.selectedId).toBe(row.id)

    const nested = builderReducer({ ...added, selectedId: row.children[1].id }, { type: 'insert-columns', spans: [6, 6] })
    expect(nested.document.children[0].children[1].children[0].label).toBe('Columns 6 6')
    const ids = allIds(nested.document)
    expect(new Set(ids).size).toBe(ids.length)
    expect(builderReducer(added, { type: 'undo' }).document.children).toEqual([])
  })

  it('ignores spans that do not add up to 12, and drops a row only where a grid may go', () => {
    const page = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    expect(builderReducer(page, { type: 'insert-columns', spans: [6, 5] })).toBe(page)
    const card = builderReducer(page, { type: 'insert', component: 'Card' })
    const inside: BuilderAction = { type: 'insert-columns-at', spans: [6, 6], targetId: 'button', position: 'inside' }
    expect(builderReducer(card, inside)).toBe(card)

    const beside = builderReducer(card, { ...inside, spans: [4, 4, 4], position: 'before' })
    const footer = beside.document.children[0].children.find((child) => child.component === 'Card.Footer')!
    expect(footer.children.map((child) => child.component)).toEqual(['Grid', 'Button'])
    expect(footer.children[0].children).toHaveLength(3)
  })
})

describe('drop rules', () => {
  type Position = 'before' | 'after' | 'inside'
  const insertAt = (state: BuilderState, component: string, targetId: string, position: Position) =>
    builderReducer(state, { type: 'insert-at', component, targetId, position })
  const place = (state: BuilderState, id: string, targetId: string, position: Position) =>
    builderReducer(state, { type: 'place', id, targetId, position })

  it('inserts a dragged component before, after, or inside a layer, and selects it', () => {
    const card = createBuilderState(advuiRegistry, 'Card')
    const before = insertAt(card, 'Badge', 'card-content', 'before')
    expect(before.document.children.map((child) => child.component)).toEqual([
      'Card.Header',
      'Badge',
      'Card.Content',
      'Card.Footer',
    ])
    expect(before.selectedId).toBe(before.document.children[1].id)

    const after = insertAt(card, 'Badge', 'card-button', 'after')
    const footer = after.document.children.find((child) => child.id === 'card-footer')
    expect(footer?.children.map((child) => child.component)).toEqual(['Button', 'Badge'])

    const inside = insertAt(card, 'Text', 'card-content', 'inside')
    const content = inside.document.children.find((child) => child.id === 'card-content')
    expect(content?.children.map((child) => child.component)).toEqual(['Image', 'Text'])

    expect(builderReducer(inside, { type: 'undo' }).document).toBe(card.document)
  })

  it('refuses drops into non-containers, beside the root, and parts outside their family', () => {
    const card = createBuilderState(advuiRegistry, 'Card')
    expect(insertAt(card, 'Badge', 'card-button', 'inside')).toBe(card)
    expect(insertAt(card, 'Badge', 'card', 'before')).toBe(card)
    // Card.Title lives in Card.Header in the template, so it may not move into Card.Content.
    expect(place(card, 'card-title', 'card-content', 'inside')).toBe(card)
    expect(place(card, 'card-title', 'card-image', 'after')).toBe(card)

    const stack = createBuilderState(advuiRegistry, 'Stack')
    expect(insertAt(stack, 'Badge', 'stack', 'inside').document.children).toHaveLength(3)
  })

  it('still reorders parts among their own siblings and duplicates them', () => {
    const select = createBuilderState(advuiRegistry, 'Select', { selectedId: 'select-pear' })
    const moved = place(select, 'select-pear', 'select-apple', 'before')
    expect(moved.document.children.map((child) => child.id)).toEqual(['select-pear', 'select-apple', 'select-orange'])
    const copied = builderReducer(select, { type: 'duplicate' })
    expect(copied.document.children).toHaveLength(4)
    // Select holds only its options, so other layers cannot be dropped into it.
    expect(insertAt(select, 'Badge', 'select-pear', 'after')).toBe(select)
  })

  it('keeps parts that read a component’s context inside it when their layer moves', () => {
    const radio = createBuilderState(advuiRegistry, 'RadioGroup')
    const row = insertAt(radio, 'HStack', 'radio-group', 'inside')
    const rowId = row.selectedId
    const moved = place(row, 'radio-monthly', rowId, 'inside')
    expect(moved.document.children.find((child) => child.id === rowId)?.children.at(-1)?.id).toBe('radio-monthly')

    // Moved into a Box outside the group, the stack would take the radio item out of its RadioGroup.
    const page = builderReducer(createBuilderState(advuiRegistry, 'Button', { mode: 'page' }), {
      type: 'apply-document',
      component: 'Button',
      document: {
        id: 'page',
        component: 'Stack',
        label: 'Page',
        props: {},
        children: [moved.document, { id: 'outside', component: 'Box', label: 'Box', props: {}, children: [] }],
      },
    })
    expect(place(page, rowId, 'outside', 'inside')).toBe(page)
    expect(place(page, 'radio-yearly-label', 'outside', 'inside').document.children[1].children).toHaveLength(1)
  })
})
