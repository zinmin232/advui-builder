import { generateCode } from '../builder/code/codeGenerator'
import { createBuilderReducer, createBuilderState } from '../builder/state/builderState'
import { acmeLibrary, meta } from '../test/acmeLibrary'
import type { ComponentMetadata } from './metadata'
import { createRegistry, resolveProps, type BlockDefinition } from './registry'

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

  it('offers Page mode only with a page template whose root accepts children', () => {
    expect(registry.hasPage).toBe(false)
    expect(() => registry.createPage()).toThrow(/no page template/)
    const withPage = createRegistry({ ...acmeLibrary, page: { id: 'page', component: 'Panel', label: 'Page' } })
    expect(withPage.hasPage).toBe(true)
    expect(withPage.createPage()).toMatchObject({ id: 'page', component: 'Panel', label: 'Page', children: [] })
    expect(() => createRegistry({ ...acmeLibrary, page: { component: 'Tag' } })).toThrow(/must accept children/)
    const pageless = createBuilderReducer(registry)
    const start = createBuilderState(registry)
    expect(pageless(start, { type: 'set-mode', mode: 'page' })).toBe(start)
    expect(createBuilderState(registry, 'Tag', { mode: 'page' }).mode).toBe('component')
  })

  it('offers layout presets only with a columns builder whose row and columns accept children', () => {
    expect(registry.hasColumns).toBe(false)
    expect(() => registry.createColumns([6, 6])).toThrow(/no layout presets/)
    const columns = (spans: number[]) => ({
      component: 'Panel',
      label: `Row ${spans.join(' ')}`,
      children: spans.map((span) => ({ component: 'Panel', label: 'Column', props: { span } })),
    })
    const withColumns = createRegistry({ ...acmeLibrary, columns })
    expect(withColumns.hasColumns).toBe(true)
    const row = withColumns.createColumns([8, 4])
    expect(row).toMatchObject({ id: 'panel', label: 'Row 8 4' })
    expect(row.children.map((child) => [child.id, child.props.span])).toEqual([['panel-2', 8], ['panel-3', 4]])
    expect(() => withColumns.createColumns([6, 5])).toThrow(/add up to 12/)
    expect(() => createRegistry({ ...acmeLibrary, columns: (spans) => ({ ...columns(spans), component: 'Tag' }) }))
      .toThrow(/Columns Tag must accept children/)
    expect(() => createRegistry({ ...acmeLibrary, columns: () => ({ component: 'Grid' }) })).toThrow(/unknown component Grid/)
  })

  it('offers blocks from the registry, and rejects unknown components and duplicate ids', () => {
    expect(registry.blocks).toEqual([])
    const banner = { id: 'banner', name: 'Banner', description: 'A tagged panel.', keywords: ['promo'], template: {
      component: 'Panel',
      label: 'Banner',
      children: [{ component: 'Tag', text: 'New' }, { component: 'Tag', text: 'Sale' }],
    } }
    const withBlocks = createRegistry({ ...acmeLibrary, blocks: [banner] })
    expect(withBlocks.blocks).toEqual([{ id: 'banner', name: 'Banner', description: 'A tagged panel.', component: 'Panel' }])
    expect(withBlocks.searchBlocks('PROMO').map((block) => block.id)).toEqual(['banner'])
    expect(withBlocks.searchBlocks('menu')).toEqual([])
    const tree = withBlocks.createBlock('banner')
    expect(tree).toMatchObject({ id: 'panel', label: 'Banner' })
    expect(tree.children.map((child) => [child.id, child.text])).toEqual([['tag', 'New'], ['tag-2', 'Sale']])
    expect(withBlocks.createBlock('banner')).not.toBe(tree)
    expect(() => withBlocks.createBlock('nope')).toThrow(/Unknown block/)

    const define = (blocks: BlockDefinition[]) => () => createRegistry({ ...acmeLibrary, blocks })
    expect(define([banner, banner])).toThrow(/registered twice/)
    expect(define([{ ...banner, template: { component: 'Panel', children: [{ component: 'Gone' }] } }]))
      .toThrow(/Block banner template uses unknown component Gone/)
  })

  it('writes icon props with the library’s icon element, or as plain names without one', () => {
    const badge = meta('Badge', {
      props: [{ key: 'icon', type: 'icon', label: 'Icon', group: 'component', options: [{ label: 'star', value: 'star' }] }],
    })
    const node = { id: 'badge', component: 'Badge', label: 'Badge', props: { icon: 'star' }, children: [] }
    const withIcons = createRegistry({
      importSource: '@acme/ui',
      components: [badge],
      icons: { importName: 'Glyph', nameProp: 'shape' },
    })
    expect(registry.icons).toBeNull()
    expect(generateCode(node, { registry: withIcons })).toBe(
      "import { Badge, Glyph } from '@acme/ui'\n\n<Badge icon={<Glyph shape=\"star\" />} />\n",
    )
    const plain = createRegistry({ importSource: '@acme/ui', components: [badge] })
    expect(generateCode(node, { registry: plain })).toContain('<Badge icon="star" />')
  })

  it('applies accepts, parents, within, capacity, and template placement rules', () => {
    const rules = createRegistry({
      importSource: '@acme/ui',
      components: [
        meta('Row', { acceptsChildren: true, accepts: ['Cell'], maxChildren: 2 }),
        meta('Cell', { acceptsChildren: true }),
        meta('Note', { parents: ['Cell'] }),
        meta('Box', { acceptsChildren: true, template: { component: 'Box', children: [{ component: 'Box.Slot' }] } }),
        meta('Box.Slot'),
        meta('Box.Hint', { within: 'Box' }),
        meta('Badge', { acceptsChildren: true, accepts: ['Badge.Icon'] }),
      ],
    })
    const node = (component: string, count = 0) => ({
      id: component.toLowerCase(),
      component,
      label: component,
      props: {},
      children: Array.from({ length: count }, (_, index) => ({
        id: `child-${index}`,
        component: 'Cell',
        label: 'Cell',
        props: {},
        children: [],
      })),
    })
    expect(rules.canPlace('Cell', [node('Row')])).toBe(true)
    expect(rules.canPlace('Note', [node('Row')])).toBe(false)
    expect(rules.canPlace('Cell', [node('Row', 2)])).toBe(false)
    expect(rules.canPlace('Cell', [node('Row', 1)], true)).toBe(true)
    expect(rules.canPlace('Cell', [node('Row', 2)], true)).toBe(false)
    expect(rules.canPlace('Note', [node('Cell')])).toBe(true)
    expect(rules.canPlace('Note', [node('Box')])).toBe(false)
    expect(rules.canPlace('Box.Slot', [node('Box')])).toBe(true)
    expect(rules.canPlace('Box.Slot', [node('Cell')])).toBe(false)
    expect(rules.canPlace('Cell', [node('Note')])).toBe(false)
    expect(rules.canPlace('Cell', [])).toBe(false)
    // `within` looks at every ancestor, not only the parent, and replaces the template placement.
    expect(rules.canPlace('Box.Hint', [node('Box'), node('Cell')])).toBe(true)
    expect(rules.canPlace('Box.Hint', [node('Row'), node('Cell')])).toBe(false)

    expect(rules.acceptsAny('Cell')).toBe(true)
    expect(rules.acceptsAny('Row')).toBe(false)
    expect(rules.acceptsChildren('Row')).toBe(true)
    // Every part Badge lists is missing from this registry, so it holds nothing here.
    expect(rules.acceptsChildren('Badge')).toBe(false)
  })

  it('checks breakpoints, and resolves responsive props for the preview breakpoint only', () => {
    const tile = meta('Tile', {
      props: [
        { key: 'columns', type: 'number', label: 'Columns', group: 'component', responsive: true, defaultValue: 1 },
        { key: 'cells', type: 'number', label: 'Cells', group: 'component' },
      ],
    })
    const sized = createRegistry({
      importSource: '@acme/ui',
      components: [tile],
      breakpoints: [
        { name: 'md', minWidth: 768 },
        { name: 'lg', minWidth: 1024 },
      ],
    })
    expect(sized.breakpoints.map((breakpoint) => breakpoint.name)).toEqual(['md', 'lg'])
    expect(createRegistry(acmeLibrary).breakpoints).toEqual([])
    const props = { columns: { base: 1, lg: 3 }, cells: 2 }
    const screen = { breakpoint: 'md', keys: ['base', 'md', 'lg'] }
    expect(resolveProps(tile, props, 'web', screen)).toEqual({ columns: 1, cells: 2 })
    expect(resolveProps(tile, props, 'web', { ...screen, breakpoint: 'lg' })).toEqual({ columns: 3, cells: 2 })
    // Without a screen (code, other callers) the map passes through for the component to resolve.
    expect(resolveProps(tile, props, 'web')).toEqual(props)

    const define = (breakpoints: { name: string; minWidth: number }[]) => () =>
      createRegistry({ importSource: '@acme/ui', components: [tile], breakpoints })
    expect(define([{ name: 'lg', minWidth: 1024 }, { name: 'md', minWidth: 768 }])).toThrow(/smallest first/)
    expect(define([{ name: 'base', minWidth: 300 }])).toThrow(/unique/)
  })
})
