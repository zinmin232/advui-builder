import { builderReducer, createBuilderState } from './state/builderState'
import { applyConfiguration, configurationFromSearch, configurationToSearch, toConfiguration } from './shareConfig'

describe('shareable configuration', () => {
  it('reads a component and props from a query string', () => {
    const config = configurationFromSearch('?component=button&variant=secondary&size=lg')
    expect(config?.component).toBe('Button')
    const next = applyConfiguration(createBuilderState('Card'), config!)
    expect(next.selectedComponent).toBe('Button')
    expect(next.document.props).toEqual({ variant: 'secondary', size: 'lg' })
    expect(configurationToSearch(toConfiguration(next))).toContain('component=Button')
    expect(configurationToSearch(toConfiguration(next))).toContain('variant=secondary')
  })

  it('ignores unknown components', () => {
    expect(configurationFromSearch('?component=nope')).toBeNull()
  })

  it('round-trips edits below the root layer', () => {
    let state = createBuilderState('Card', { selectedId: 'card-content' })
    state = builderReducer(state, { type: 'set-prop', id: 'card-button', key: 'variant', value: 'secondary' })
    state = builderReducer(state, { type: 'insert', component: 'Badge' })
    const search = configurationToSearch(toConfiguration(state))
    expect(search).toContain('doc=')

    const restored = applyConfiguration(createBuilderState('Button'), configurationFromSearch(search)!)
    expect(restored.selectedComponent).toBe('Card')
    expect(restored.document).toEqual(state.document)
  })

  it('reads link values as their prop type and drops values that do not fit', () => {
    expect(configurationFromSearch('?component=input&placeholder=123')?.props).toEqual({ placeholder: '123' })
    expect(configurationFromSearch('?component=button&variant=bogus&disabled=true&loading=yes')?.props).toEqual({
      disabled: true,
    })
  })

  it('falls back to the template when a shared tree is tampered with', () => {
    const tree = (child: object) =>
      `?component=card&doc=${encodeURIComponent(JSON.stringify({ id: 'card', component: 'Card', label: 'Card', children: [child] }))}`
    expect(configurationFromSearch(tree({ id: 'x', component: 'script', label: 'x' }))?.document).toBeUndefined()
    expect(configurationFromSearch(tree({ id: 'card', component: 'Button', label: 'Dup' }))?.document).toBeUndefined()
    expect(configurationFromSearch(tree({ id: 'ok', component: 'Button', label: 'Ok' }))?.document?.children).toHaveLength(1)
  })
})
