import { advuiRegistry } from '../../registry/componentRegistry'
import { createBuilderReducer, createBuilderState } from '../state/builderState'
import { componentName, exportName, pageFileName, pageFileText, pascalCase, readPageFile } from './pageFile'

const builderReducer = createBuilderReducer(advuiRegistry)

describe('page files', () => {
  it('names the exported component and the file after the page', () => {
    expect(componentName('Home')).toBe('HomePage')
    expect(componentName('Landing page')).toBe('LandingPage')
    expect(componentName('Shared page 2')).toBe('SharedPage2')
    expect(componentName('Café menu')).toBe('CafeMenuPage')
    expect(componentName('2026 launch')).toBe('Page2026LaunchPage')
    expect(componentName('ဗမာ')).toBe('Page')
    expect(pascalCase('pricing table')).toBe('PricingTable')
    expect(pascalCase('myHome')).toBe('MyHome')
    expect(pascalCase('  ')).toBeNull()
    expect(exportName({ id: 'a', name: 'Home', updatedAt: 0, settings: { component: 'Start' } })).toBe('Start')
    expect(exportName(null)).toBe('Page')
    expect(pageFileName('Home page')).toBe('home-page.page.json')
    expect(pageFileName('ဗမာ')).toBe('page.page.json')
  })

  it('reads back the page, its name and its settings', () => {
    let state = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    state = builderReducer(state, { type: 'insert-block', block: 'pricing' })
    const page = { id: 'page-a', name: 'Pricing', updatedAt: 1, settings: { title: 'Plans' } }
    const result = readPageFile(advuiRegistry, pageFileText(page, state.document))
    expect(result).toEqual({
      ok: true,
      page: { name: 'Pricing', settings: { title: 'Plans' }, document: state.document },
    })
  })

  it('refuses files that are not pages and drops layers this version cannot show', () => {
    const notAPage = { ok: false, error: 'This file isn’t an AdvUI Builder page.' }
    expect(readPageFile(advuiRegistry, '{')).toEqual(notAPage)
    expect(readPageFile(advuiRegistry, '[]')).toEqual(notAPage)
    expect(readPageFile(advuiRegistry, JSON.stringify({ format: 'other', version: 1 }))).toEqual(notAPage)
    const file = (fields: object) => JSON.stringify({ format: 'advui-builder.page', version: 1, ...fields })
    expect(readPageFile(advuiRegistry, file({ version: 2 }))).toEqual({
      ok: false,
      error: 'This page file comes from a newer version of the builder.',
    })
    expect(readPageFile(advuiRegistry, file({ document: { id: 'card', component: 'Card', label: 'Card' } }))).toEqual({
      ok: false,
      error: 'The page in this file can’t be read.',
    })

    const read = readPageFile(
      advuiRegistry,
      file({
        name: '  ',
        settings: { component: 'not valid', title: '  Hello  ', extra: true },
        document: {
          id: 'page',
          component: 'Stack',
          label: 'Page',
          children: [
            { id: 'old', component: 'Retired', label: 'Old' },
            { id: 'badge', component: 'Badge', label: 'Badge', text: 'Kept' },
          ],
        },
      }),
    )
    expect(read.ok && read.page.name).toBe('Imported page')
    expect(read.ok && read.page.settings).toEqual({ title: 'Hello' })
    expect(read.ok && read.page.document.children.map((child) => child.id)).toEqual(['badge'])
  })
})
