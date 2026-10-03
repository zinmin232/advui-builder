import { advuiRegistry } from '../registry/componentRegistry'
import { createBuilderReducer, createBuilderState } from './state/builderState'
import { applyConfiguration, configurationFromSearch, configurationToSearch, toConfiguration } from './shareConfig'

const builderReducer = createBuilderReducer(advuiRegistry)

describe('shareable configuration', () => {
  it('reads a component and props from a query string', () => {
    const config = configurationFromSearch(advuiRegistry, '?component=button&variant=secondary&size=lg')
    expect(config?.component).toBe('Button')
    const next = applyConfiguration(advuiRegistry, createBuilderState(advuiRegistry, 'Card'), config!)
    expect(next.selectedComponent).toBe('Button')
    expect(next.document.props).toEqual({ variant: 'secondary', size: 'lg' })
    expect(configurationToSearch(toConfiguration(advuiRegistry, next))).toContain('component=Button')
    expect(configurationToSearch(toConfiguration(advuiRegistry, next))).toContain('variant=secondary')
  })

  it('ignores unknown components', () => {
    expect(configurationFromSearch(advuiRegistry, '?component=nope')).toBeNull()
  })

  it('round-trips edits below the root layer', () => {
    let state = createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-content' })
    state = builderReducer(state, { type: 'set-prop', id: 'card-button', key: 'variant', value: 'secondary' })
    state = builderReducer(state, { type: 'insert', component: 'Badge' })
    const search = configurationToSearch(toConfiguration(advuiRegistry, state))
    expect(search).toContain('doc=')

    const config = configurationFromSearch(advuiRegistry, search)!
    const restored = applyConfiguration(advuiRegistry, createBuilderState(advuiRegistry, 'Button'), config)
    expect(restored.selectedComponent).toBe('Card')
    expect(restored.document).toEqual(state.document)
  })

  it('reads link values as their prop type and drops values that do not fit', () => {
    const read = (search: string) => configurationFromSearch(advuiRegistry, search)?.props
    expect(read('?component=input&placeholder=123')).toEqual({ placeholder: '123' })
    expect(read('?component=button&variant=bogus&disabled=true&loading=yes')).toEqual({ disabled: true })
  })

  it('falls back to the template when a shared tree is tampered with', () => {
    const tree = (child: object) =>
      `?component=card&doc=${encodeURIComponent(JSON.stringify({ id: 'card', component: 'Card', label: 'Card', children: [child] }))}`
    const shared = (child: object) => configurationFromSearch(advuiRegistry, tree(child))?.document
    expect(shared({ id: 'x', component: 'script', label: 'x' })).toBeUndefined()
    expect(shared({ id: 'card', component: 'Button', label: 'Dup' })).toBeUndefined()
    expect(shared({ id: 'ok', component: 'Button', label: 'Ok' })?.children).toHaveLength(1)
  })

  it('round-trips a page and falls back to an empty page when its tree is not a page', () => {
    let state = createBuilderState(advuiRegistry, 'Input', { mode: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Card' })
    state = builderReducer(state, { type: 'open', component: 'Badge' })
    const search = configurationToSearch(toConfiguration(advuiRegistry, state))
    expect(search).toContain('mode=page')
    expect(search).toContain('component=Input')

    const config = configurationFromSearch(advuiRegistry, search)!
    const restored = applyConfiguration(advuiRegistry, createBuilderState(advuiRegistry, 'Button'), config)
    expect(restored.mode).toBe('page')
    expect(restored.document).toEqual(state.document)
    expect(restored.selectedComponent).toBe('Input')
    expect(restored.past).toEqual([])

    const card = encodeURIComponent(JSON.stringify({ id: 'card', component: 'Card', label: 'Card' }))
    const wrong = configurationFromSearch(advuiRegistry, `?component=button&mode=page&doc=${card}`)!
    expect(wrong.document).toBeUndefined()
    const empty = applyConfiguration(advuiRegistry, createBuilderState(advuiRegistry), wrong)
    expect(empty.mode).toBe('page')
    expect(empty.document.children).toEqual([])
  })
})
