import { generateCode } from '../builder/code/codeGenerator'
import { createBuilderReducer, createBuilderState } from '../builder/state/builderState'
import { acmeLibrary, meta } from '../test/acmeLibrary'
import type { ComponentMetadata } from './metadata'
import { createRegistry } from './registry'

describe('component registry', () => {
  const registry = createRegistry(acmeLibrary)

  it('lists sidebar entries in registration order and finds them by name or slug', () => {
    expect(registry.sidebarEntries().map((entry) => entry.name)).toEqual(['Panel', 'Tag', 'Menu'])
    expect(registry.defaultComponent).toBe('Panel')
    expect(registry.match('menu')).toBe('Menu')
    expect(registry.match('menu-entry')).toBeNull()
    expect(registry.search('tag').map((entry) => entry.name)).toEqual(['Tag'])
    expect(registry.has('Menu.Entry')).toBe(true)
    expect(() => registry.get('Nope')).toThrow(/Unknown component/)
  })

  it('builds starter trees from templates, allocating missing ids and labels', () => {
    expect(registry.createDocument('Panel')).toEqual({
      id: 'panel',
      component: 'Panel',
      label: 'Panel',
      props: {},
      children: [{ id: 'tag', component: 'Tag', label: 'Tag', props: {}, children: [], text: 'Hello' }],
    })
    expect(registry.createDocument('Tag')).toEqual({
      id: 'tag',
      component: 'Tag',
      label: 'Tag',
      props: {},
      children: [],
      text: 'Tag',
    })
    expect(registry.createDocument('Panel')).not.toBe(registry.createDocument('Panel'))
  })

  it('reads containers and item hosts from metadata', () => {
    expect(registry.acceptsChildren('Panel')).toBe(true)
    expect(registry.acceptsChildren('Tag')).toBe(false)
    expect(registry.acceptsChildren('Nope')).toBe(false)
    expect(registry.itemNoun('Menu')).toBe('entry')
    expect(registry.itemNoun('Panel')).toBeNull()
  })

  it('fills item tokens, creates the missing container, and skips values in use', () => {
    const used = new Set(['menu', 'menu-title'])
    const idFor = (component: string) => {
      let id = component.toLowerCase().replace(/\./g, '-')
      for (let index = 2; used.has(id); index += 1) id = `${component.toLowerCase().replace(/\./g, '-')}-${index}`
      used.add(id)
      return id
    }
    const menu = registry.createDocument('Menu')
    const first = registry.addItem(menu, idFor)!
    const [group, title, tag] = first.node.children
    expect(group).toMatchObject({ component: 'Menu.Group', label: 'Group' })
    expect(group.children[0]).toMatchObject({ label: 'Entry 1', props: { value: 'entry-1' }, text: 'Entry 1' })
    expect(title.id).toBe('menu-title')
    expect(tag).toMatchObject({ component: 'Tag', props: { for: 'menu-entry-1' }, text: '#1' })
    expect(first.selectedId).toBe(group.children[0].id)

    const taken = { ...first.node, children: [...first.node.children, { ...tag, props: { value: 'entry-2' } }] }
    const second = registry.addItem(taken, idFor)!
    const entries = second.node.children.find((child) => child.component === 'Menu.Group')!.children
    expect(entries.map((entry) => entry.props.value)).toEqual(['entry-1', 'entry-3'])
    expect(registry.addItem(registry.createDocument('Panel'), idFor)).toBeNull()
  })

  it('rejects templates and items that name unknown components, and duplicate names', () => {
    const broken = (components: ComponentMetadata[]) => () => createRegistry({ importSource: 'x', components })
    expect(broken([meta('A', { template: { component: 'Missing' } })])).toThrow(/unknown component Missing/)
    expect(broken([meta('A', { item: { noun: 'x', part: 'Missing', nodes: [] } })])).toThrow(/unknown component/)
    expect(broken([meta('A'), meta('A')])).toThrow(/registered twice/)
    expect(broken([meta('A.Part')])).toThrow(/sidebar/)
  })

  it('drives the reducer and the code generator without AdvUI', () => {
    const reduce = createBuilderReducer(registry)
    const start = createBuilderState(registry)
    expect(start.selectedComponent).toBe('Panel')
    const inserted = reduce(start, { type: 'insert', component: 'Menu' })
    expect(inserted.document.children.map((child) => child.component)).toEqual(['Tag', 'Menu'])

    const grown = reduce(reduce(inserted, { type: 'select', id: 'menu' }), { type: 'add-item' })
    const code = generateCode(grown.document, { registry })
    expect(code.split('\n')[0]).toBe("import { Menu, Panel, Tag } from '@acme/ui'")
    expect(code).toContain('<Menu.Entry value="entry-1">Entry 1</Menu.Entry>')
    expect(code).toContain('<Tag>Hello</Tag>')
  })
})
