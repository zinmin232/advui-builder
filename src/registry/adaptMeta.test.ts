import { platformNote, propsForPlatform } from './adaptMeta'
import { advuiRegistry } from './componentRegistry'
import type { ConfigNode } from './metadata'
import { generateCode } from '../builder/code/codeGenerator'
import { createBuilderReducer, createBuilderState } from '../builder/state/builderState'

const builderReducer = createBuilderReducer(advuiRegistry)

function starterCode(component: string): string {
  return generateCode(advuiRegistry.createDocument(component), { registry: advuiRegistry })
}

describe('AdvUI metadata', () => {
  it('marks responsive props', () => {
    expect(advuiRegistry.get('HStack').props.find((prop) => prop.key === 'direction')?.responsive).toBe(true)
    expect(advuiRegistry.get('Grid').props.find((prop) => prop.key === 'columns')).toMatchObject({
      type: 'number',
      responsive: true,
      min: 1,
      max: 12,
    })
    expect(advuiRegistry.get('HStack').props.find((prop) => prop.key === 'gap')?.responsive).toBeUndefined()
  })

  it('writes a responsive value as an object literal', () => {
    const stack = advuiRegistry.createDocument('Stack')
    stack.props.direction = { base: 'column', md: 'row' }
    expect(generateCode(stack, { registry: advuiRegistry })).toContain('direction={{ base: "column", md: "row" }}')
  })

  it('still describes every prop the starter templates and added items set', () => {
    const unknown: string[] = []
    const check = (node: ConfigNode) => {
      const meta = advuiRegistry.get(node.component)
      const known = new Set([...meta.props.map((prop) => prop.key), ...Object.keys(meta.staticProps ?? {})])
      for (const key of Object.keys(node.props)) if (!known.has(key)) unknown.push(`${node.component}.${key}`)
      node.children.forEach(check)
    }
    for (const { name } of advuiRegistry.sidebarEntries()) check(advuiRegistry.createDocument(name))
    check(advuiRegistry.createColumns([8, 4]))
    for (const block of advuiRegistry.blocks) check(advuiRegistry.createBlock(block.id))
    for (const [component, selectedId] of [
      ['Select', 'select'],
      ['RadioGroup', 'radio-group'],
      ['Tabs', 'tabs'],
      ['List', 'list'],
      ['DropdownMenu', 'dropdown-content'],
    ]) {
      check(builderReducer(createBuilderState(advuiRegistry, component, { selectedId }), { type: 'add-item' }).document)
    }
    expect(unknown, 'An AdvUI upgrade dropped these props; add them back as registry extraProps').toEqual([])
  })
})

describe('platform metadata', () => {
  it('filters web-only properties and swaps notes with the platform', () => {
    const image = advuiRegistry.get('Image')
    expect(propsForPlatform(image, 'web').map((prop) => prop.key)).toContain('loading')
    expect(propsForPlatform(image, 'android').map((prop) => prop.key)).not.toContain('loading')
    expect(propsForPlatform(image, 'ios').map((prop) => prop.key)).not.toContain('loading')
    expect(platformNote(image, 'web')).toMatch(/object-fit/)
    expect(platformNote(image, 'android')).toMatch(/HTTPS/)
    expect(platformNote(image, 'ios')).toMatch(/resizeMode/)
  })

  it('hides the notes section source when a component has none', () => {
    expect(platformNote(advuiRegistry.get('Card'), 'web')).toBeNull()
    expect(platformNote(advuiRegistry.get('Button'), 'android')).toMatch(/native/)
    expect(platformNote(advuiRegistry.get('Button'), 'web')).toMatch(/Hover/)
  })

  it('hides the native keyboard control on web', () => {
    const input = advuiRegistry.get('Input')
    expect(propsForPlatform(input, 'web').map((prop) => prop.key)).not.toContain('keyboardType')
    expect(propsForPlatform(input, 'ios').map((prop) => prop.key)).toContain('keyboardType')
  })

  it('lists the layout components and gives them a starter document', () => {
    const layout = [
      'AspectRatio',
      'Container',
      'Grid',
      'ScrollArea',
      'Stack',
      'HStack',
      'VStack',
      'Box',
      'Center',
      'Wrap',
      'AutoGrid',
      'Section',
      'Sticky',
      'Show',
      'Hide',
    ]
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining([...layout, 'Spacer']))
    for (const name of layout) {
      expect(advuiRegistry.get(name).categoryId).toBe('layout')
      expect(advuiRegistry.acceptsChildren(name)).toBe(true)
      expect(advuiRegistry.createDocument(name).children.length).toBeGreaterThan(0)
    }
    expect(advuiRegistry.get('Grid').props.find((prop) => prop.key === 'columns')?.defaultValue).toBe(1)
    expect(starterCode('Grid')).toContain('<Grid\n  columns={2}\n>')
    expect(starterCode('Stack')).toContain('gap={12}')
    expect(starterCode('ScrollArea')).toContain('aria-label="Notes"')
    expect(starterCode('Show')).toContain('<Show\n  above="md"\n>')
    expect(starterCode('Hide')).toContain("import { Hide, Text } from '@advui/core'")
    expect(starterCode('AutoGrid')).toContain('minChildWidth={160}')
    expect(starterCode('Section')).toContain('background="muted"')
  })

  it('edits each stack with the short flex props, with that stack’s defaults', () => {
    const hStack = advuiRegistry.get('HStack')
    const keys = hStack.props.map((prop) => prop.key)
    expect(keys).toEqual(expect.arrayContaining(['direction', 'wrap', 'align', 'distribute', 'gap']))
    expect(keys).not.toContain('flexDirection')
    expect(hStack.props.find((prop) => prop.key === 'align')).toMatchObject({
      type: 'select',
      defaultValue: 'center',
      options: expect.arrayContaining([{ label: 'Baseline', value: 'baseline' }]),
    })
    expect(advuiRegistry.get('VStack').props.find((prop) => prop.key === 'direction')?.defaultValue).toBe('column')
    expect(starterCode('HStack')).toContain("import { Button, HStack, Spacer, Text } from '@advui/core'")
  })

  it('writes a layout preset as a 12-column Grid whose items stack below md', () => {
    expect(generateCode(advuiRegistry.createColumns([8, 4]), { registry: advuiRegistry })).toBe(
      [
        "import { Grid } from '@advui/core'",
        '',
        '<Grid',
        '  columns={12}',
        '>',
        '  <Grid.Item span={{ base: 12, md: 8 }} />',
        '  <Grid.Item span={{ base: 12, md: 4 }} />',
        '</Grid>',
        '',
      ].join('\n'),
    )
    expect(advuiRegistry.createColumns([12]).children[0].props).toEqual({ span: 12 })

    const span = advuiRegistry.get('Grid.Item').props.find((prop) => prop.key === 'span')
    expect(span).toMatchObject({ type: 'number', defaultValue: 1, min: 1, max: 12, responsive: true })
    const grid = advuiRegistry.createDocument('Grid')
    expect(advuiRegistry.canPlace('Grid.Item', [grid])).toBe(true)
    expect(advuiRegistry.canPlace('Grid.Item', [advuiRegistry.createDocument('Stack')])).toBe(false)
  })

  it('puts a Spacer beside the selected layer, and marks only the Spacer as invisible', () => {
    expect(advuiRegistry.acceptsChildren('Spacer')).toBe(false)
    const state = builderReducer(createBuilderState(advuiRegistry, 'HStack', { selectedId: 'hstack-text' }), {
      type: 'insert',
      component: 'Spacer',
    })
    expect(state.document.children.map((child) => child.component)).toEqual(['Text', 'Spacer', 'Button', 'Spacer'])
    expect(generateCode(state.document, { registry: advuiRegistry })).toMatch(/\n {2}<Spacer \/>\n<\/HStack>\n$/)
    const invisible = advuiRegistry.sidebarEntries().filter((entry) => entry.invisible).map((entry) => entry.name)
    expect(invisible).toEqual(['Spacer'])
  })

  it('lists the form controls and separator', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Label', 'Textarea', 'Checkbox', 'Switch', 'Separator']))
    for (const name of ['Label', 'Textarea', 'Checkbox', 'Switch']) {
      expect(advuiRegistry.get(name).categoryId).toBe('forms')
      expect(advuiRegistry.acceptsChildren(name)).toBe(false)
    }
    expect(advuiRegistry.get('Separator').categoryId).toBe('layout')
    expect(advuiRegistry.acceptsChildren('Separator')).toBe(false)
    expect(starterCode('Label')).toContain('<Label required>Email address</Label>')
    expect(starterCode('Checkbox')).toContain('defaultChecked')
    expect(starterCode('Switch')).toContain('defaultChecked')
    expect(starterCode('Textarea')).toContain('rows={4}')
    expect(starterCode('Textarea')).toContain('placeholder="Write a message"')
    expect(starterCode('Separator')).toContain('width="100%"')
    expect(starterCode('Separator')).not.toContain('orientation')
  })

  it('lists select, tabs, avatar, and slider', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Select', 'Tabs', 'Avatar', 'Slider']))
    expect(advuiRegistry.get('Select').categoryId).toBe('forms')
    expect(advuiRegistry.get('Slider').categoryId).toBe('forms')
    expect(advuiRegistry.get('Avatar').categoryId).toBe('data-display')
    expect(advuiRegistry.get('Tabs').categoryId).toBe('navigation')
    expect(advuiRegistry.acceptsAny('Select')).toBe(false)
    expect(advuiRegistry.acceptsAny('Tabs')).toBe(false)
    expect(advuiRegistry.acceptsAny('Tabs.Content')).toBe(true)
    // Avatar takes only Avatar.Image and Avatar.Fallback, which the builder does not register.
    expect(advuiRegistry.acceptsChildren('Avatar')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Slider')).toBe(false)

    const select = starterCode('Select')
    expect(select).toContain('placeholder="Choose a fruit"')
    expect(select).toContain('defaultValue="apple"')
    expect(select).toContain('aria-label="Fruit"')
    expect(select).toContain('<Select.Item value="pear">Pear</Select.Item>')
    expect(select).not.toContain('size=')

    const tabs = starterCode('Tabs')
    expect(tabs).toContain('defaultValue="account"')
    expect(tabs).toContain('<Tabs.Trigger value="account">Account</Tabs.Trigger>')
    expect(tabs).toContain('<Tabs.Content\n    value="password"\n  >')
    expect(tabs).toContain('Password details')
    expect(tabs).not.toContain('variant')

    expect(starterCode('Avatar')).toContain('alt="Ada Lovelace"')
    expect(starterCode('Avatar')).toContain('size="lg"')
    const slider = starterCode('Slider')
    expect(slider).toContain('defaultValue={40}')
    expect(slider).toContain('aria-label="Volume"')
    expect(slider).toContain('width="280px"')
    expect(slider).not.toContain('min=')
  })

  it('lists radio, password, number, and progress', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['RadioGroup', 'PasswordInput', 'NumberInput', 'Progress']))
    expect(advuiRegistry.get('RadioGroup').categoryId).toBe('forms')
    expect(advuiRegistry.get('PasswordInput').categoryId).toBe('forms')
    expect(advuiRegistry.get('NumberInput').categoryId).toBe('forms')
    expect(advuiRegistry.get('Progress').categoryId).toBe('feedback')
    for (const name of ['PasswordInput', 'NumberInput', 'Progress']) {
      expect(advuiRegistry.acceptsChildren(name)).toBe(false)
    }
    // Labels and stacks may sit among the radio items.
    expect(advuiRegistry.acceptsAny('RadioGroup')).toBe(true)

    const radio = starterCode('RadioGroup')
    expect(radio).toContain('defaultValue="monthly"')
    expect(radio).toContain('aria-label="Billing"')
    expect(radio).toContain('value="yearly"')
    expect(radio).toContain('id="plan-yearly"')
    expect(radio).toContain('<Label htmlFor="plan-monthly">Monthly</Label>')
    expect(radio).not.toContain('size=')

    const password = starterCode('PasswordInput')
    expect(password).toContain('placeholder="Enter your password"')
    expect(password).toContain('aria-label="Password"')
    expect(password).toContain('width="280px"')
    expect(password).not.toContain('defaultVisible')

    const number = starterCode('NumberInput')
    expect(number).toContain('defaultValue={2}')
    expect(number).toContain('min={1}')
    expect(number).toContain('max={10}')
    expect(number).toContain('aria-label="Quantity"')
    expect(number).not.toContain('step=')

    const progress = starterCode('Progress')
    expect(progress).toContain('value={60}')
    expect(progress).toContain('label="Upload progress"')
    expect(progress).toContain('width="280px"')
    expect(progress).not.toContain('tone')
    expect(progress).not.toContain('max=')
  })

  it('lists spinner, skeleton, alert, and empty state', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Spinner', 'Skeleton', 'Alert', 'EmptyState']))
    for (const name of ['Spinner', 'Skeleton', 'Alert', 'EmptyState']) {
      expect(advuiRegistry.get(name).categoryId).toBe('feedback')
    }
    expect(advuiRegistry.acceptsChildren('Spinner')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Skeleton')).toBe(false)
    expect(advuiRegistry.acceptsAny('Alert')).toBe(true)
    expect(advuiRegistry.acceptsChildren('Alert.Title')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Alert.Description')).toBe(false)
    expect(advuiRegistry.acceptsChildren('EmptyState')).toBe(true)

    const spinner = starterCode('Spinner')
    expect(spinner).toContain('<Spinner size="lg" />')
    expect(spinner).not.toContain('label=')

    const skeleton = starterCode('Skeleton')
    expect(skeleton).toContain('width="240px"')
    expect(skeleton).toContain('height="16px"')
    expect(skeleton).not.toContain('circle')

    const alert = starterCode('Alert')
    expect(alert).toContain('variant="warning"')
    expect(alert).toContain('<Alert.Title>Check your connection</Alert.Title>')
    expect(alert).toContain('<Alert.Description>The last save did not finish. Try again.</Alert.Description>')

    const empty = starterCode('EmptyState')
    expect(empty).toContain('title="No messages"')
    expect(empty).toContain('description="When someone writes to you, it shows up here."')
    expect(empty).toContain('bordered')
    expect(empty).toContain('<Button>Create one</Button>')
    expect(empty).not.toContain('tone=')
  })

  it('lists search, chip, list, and pagination', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Search', 'Chip', 'List', 'Pagination']))
    expect(advuiRegistry.get('Search').categoryId).toBe('forms')
    expect(advuiRegistry.get('Chip').categoryId).toBe('data-display')
    expect(advuiRegistry.get('List').categoryId).toBe('data-display')
    expect(advuiRegistry.get('Pagination').categoryId).toBe('navigation')
    expect(advuiRegistry.acceptsChildren('Search')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Chip')).toBe(false)
    expect(advuiRegistry.acceptsChildren('List')).toBe(true)
    expect(advuiRegistry.acceptsChildren('List.Item')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Pagination')).toBe(false)

    const search = starterCode('Search')
    expect(search).toContain('defaultValue="messages"')
    expect(search).toContain('placeholder="Search messages"')
    expect(search).not.toContain('value=')
    expect(search).not.toContain('aria-label=')

    const chip = starterCode('Chip')
    expect(chip).toContain('<Chip defaultSelected>Inbox</Chip>')

    const list = starterCode('List')
    expect(list).toContain('variant="outline"')
    expect(list).toContain('divided')
    expect(list).toContain('width="320px"')
    expect(list).toContain('title="Inbox"')
    expect(list).toContain('description="3 new messages"')
    expect(list).toContain('title="Drafts"')

    const pagination = starterCode('Pagination')
    expect(pagination).toContain('count={10}')
    expect(pagination).toContain('defaultPage={3}')
    expect(pagination).not.toContain('page=')
    expect(pagination).not.toContain('variant=')
  })

  it('lists alert dialog, toast, tooltip, and dropdown menu', () => {
    const names = advuiRegistry.sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['AlertDialog', 'Toast', 'Tooltip', 'DropdownMenu']))
    for (const name of ['AlertDialog', 'Toast', 'Tooltip', 'DropdownMenu']) {
      expect(advuiRegistry.get(name).categoryId).toBe('overlay')
    }
    expect(advuiRegistry.acceptsAny('AlertDialog')).toBe(false)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Trigger')).toBe(false)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Content')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Header')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Footer')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Title')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Toast')).toBe(false)
    // Tooltip clones the one element it wraps.
    expect(advuiRegistry.get('Tooltip').maxChildren).toBe(1)
    expect(advuiRegistry.acceptsAny('DropdownMenu')).toBe(false)
    expect(advuiRegistry.acceptsAny('DropdownMenu.Content')).toBe(false)
    expect(advuiRegistry.acceptsChildren('DropdownMenu.Content')).toBe(true)
    expect(advuiRegistry.acceptsChildren('DropdownMenu.Item')).toBe(false)

    const dialog = starterCode('AlertDialog')
    expect(dialog).toContain('import { AlertDialog, Button } from \'@advui/core\'')
    expect(dialog).toContain('defaultOpen')
    expect(dialog).toContain('<AlertDialog')
    expect(dialog).toContain('<AlertDialog.Trigger>Delete project</AlertDialog.Trigger>')
    expect(dialog).toContain('<AlertDialog.Title>Delete this project?</AlertDialog.Title>')
    expect(dialog).toContain('This removes the project and its files. You cannot undo it.')
    expect(dialog).toContain('asChild')
    expect(dialog).toContain('<Button variant="outline">Cancel</Button>')
    expect(dialog).toContain('<Button variant="destructive">Delete</Button>')
    expect(dialog).not.toContain('size=')
    expect(dialog).not.toContain('open=')

    const toastCode = starterCode('Toast')
    expect(toastCode).toContain('import { Button, toast } from \'@advui/core\'')
    expect(toastCode).toContain(
      'toast.success("Changes saved", { description: "Your profile is up to date." })',
    )
    expect(toastCode).toContain('Show toast')
    expect(toastCode).not.toContain('duration')
    expect(toastCode).not.toContain('<Toast')

    const changed = builderReducer(
      builderReducer(createBuilderState(advuiRegistry, 'Toast'), {
        type: 'set-prop',
        id: 'toast',
        key: 'type',
        value: 'error',
      }),
      { type: 'set-prop', id: 'toast', key: 'description', value: '' },
    )
    const errorToast = generateCode(changed.document, { registry: advuiRegistry })
    expect(errorToast).toContain('toast.error("Changes saved")')
    expect(errorToast).not.toContain('description')

    const hint = starterCode('Tooltip')
    expect(hint).toContain('content="Saves your changes"')
    expect(hint).toContain('defaultOpen')
    expect(hint).toContain('<Button>Save</Button>')
    expect(hint).not.toContain('delay=')
    expect(hint).not.toContain('side=')
    expect(hint).not.toContain('open=')

    const menu = starterCode('DropdownMenu')
    expect(menu).toContain('import { Button, DropdownMenu } from \'@advui/core\'')
    expect(menu).toContain('<DropdownMenu')
    expect(menu).toContain('defaultOpen')
    expect(menu).toContain('<Button>Actions</Button>')
    expect(menu).toContain('<DropdownMenu.Label>Account</DropdownMenu.Label>')
    expect(menu).toContain('shortcut="⌘E"')
    expect(menu).toContain('<DropdownMenu.Item>Duplicate</DropdownMenu.Item>')
    expect(menu).toContain('<DropdownMenu.Separator />')
    expect(menu).toContain('<DropdownMenu.Item destructive>Delete</DropdownMenu.Item>')
    expect(menu).not.toContain('side=')
    expect(menu).not.toContain('align=')
    expect(menu).not.toContain('minWidth=')
    expect(menu).not.toContain('open=')
  })

  it('takes drop rules from AdvUI’s child rules', () => {
    const tabs = advuiRegistry.createDocument('Tabs')
    const list = tabs.children[0]
    const panel = tabs.children[1]
    expect(advuiRegistry.get('Tabs.Trigger').within).toBe('Tabs.List')
    expect(advuiRegistry.canPlace('Tabs.Trigger', [tabs, list])).toBe(true)
    expect(advuiRegistry.canPlace('Tabs.Trigger', [tabs, panel])).toBe(false)
    expect(advuiRegistry.canPlace('Button', [tabs, list])).toBe(false)

    // RadioGroup.Item reads its group's context, so it may sit in a stack inside the group, but not outside it.
    const radio = advuiRegistry.createDocument('RadioGroup')
    const row = advuiRegistry.createDocument('HStack')
    expect(advuiRegistry.canPlace('RadioGroup.Item', [radio, row])).toBe(true)
    expect(advuiRegistry.canPlace('RadioGroup.Item', [row])).toBe(false)

    expect(advuiRegistry.get('List.Item').parents).toEqual(['List'])
    expect(advuiRegistry.get('ScrollArea').maxChildren).toBe(1)
    expect(advuiRegistry.createDocument('ScrollArea').children).toHaveLength(1)
  })

  it('adds to the nearest layer that takes any component, past hosts that hold only their parts', () => {
    const page = builderReducer(createBuilderState(advuiRegistry, 'Button', { mode: 'page' }), {
      type: 'insert',
      component: 'Tabs',
    })
    const trigger = page.document.children[0].children[0].children[0]
    expect(trigger.component).toBe('Tabs.Trigger')
    const state = builderReducer({ ...page, selectedId: trigger.id }, { type: 'insert', component: 'Button' })
    expect(state.document.children.map((child) => child.component)).toEqual(['Tabs', 'Button'])
    // The Tabs list between the trigger and the Tabs does not stop "add item" from finding the Tabs.
    const added = builderReducer({ ...page, selectedId: trigger.id }, { type: 'add-item' })
    expect(added.document.children[0].children[0].children).toHaveLength(3)
  })
})

describe('blocks', () => {
  /** Every layer of a tree, with the layers above it (the root first). */
  const layers = (node: ConfigNode, path: ConfigNode[] = []): [ConfigNode, ConfigNode[]][] => [
    [node, path],
    ...node.children.flatMap((child) => layers(child, [...path, node])),
  ]

  it('lists the ready-made page parts in sidebar order', () => {
    expect(advuiRegistry.blocks.map((block) => block.name)).toEqual(['Navbar', 'Hero', 'Pricing', 'Login', 'Footer'])
    expect(advuiRegistry.searchBlocks('sign in').map((block) => block.id)).toEqual(['login'])
    expect(advuiRegistry.searchBlocks('').length).toBe(5)
  })

  it('builds every block within the drop rules, so each one can go on a page', () => {
    const page = advuiRegistry.createPage()
    for (const block of advuiRegistry.blocks) {
      const tree = advuiRegistry.createBlock(block.id)
      expect(advuiRegistry.canPlace(tree.component, [page]), block.id).toBe(true)
      for (const [node, path] of layers(tree).slice(1)) {
        // Placed into its parent as if it were not there yet, so capacity (`maxChildren`) counts the others.
        const parent = path.at(-1)!
        const without = { ...parent, children: parent.children.filter((child) => child !== node) }
        const at = [page, ...path.slice(0, -1), without]
        expect(advuiRegistry.canPlace(node.component, at), `${block.id}: ${node.label}`).toBe(true)
      }
    }
  })

  it('writes responsive layout into the code', () => {
    const code = (id: string) => generateCode(advuiRegistry.createBlock(id), { registry: advuiRegistry })
    expect(code('pricing')).toContain('columns={{ base: 1, md: 3 }}')
    expect(code('login')).toContain('span={{ base: 12, md: 6, lg: 4 }}')
    expect(code('navbar')).toMatch(/<Show\s+above="md"\s*>/)
    expect(code('footer')).toContain('direction={{ base: "column", md: "row" }}')
    expect(code('hero').split('\n')[0]).toBe(
      "import { Badge, Button, Center, HStack, Section, Text, VStack } from '@advui/core'",
    )
  })

  it('adds a block to the page or the selected container, and undo removes it', () => {
    const page = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    const added = builderReducer(page, { type: 'insert-block', block: 'hero' })
    const hero = added.document.children[0]
    expect(hero).toMatchObject({ component: 'Section', label: 'Hero' })
    expect(added.selectedId).toBe(hero.id)
    expect(builderReducer(added, { type: 'undo' }).document.children).toEqual([])
    expect(builderReducer(page, { type: 'insert-block', block: 'nope' })).toBe(page)

    // A clicked block goes below the section that holds the selection, not inside the block added last.
    const stacked = builderReducer(added, { type: 'insert-block', block: 'pricing' })
    const headline = layers(stacked.document).find(([node]) => node.label === 'Headline')![0]
    const below = builderReducer({ ...stacked, selectedId: headline.id }, { type: 'insert-block', block: 'footer' })
    expect(below.document.children.map((child) => child.label)).toEqual(['Hero', 'Footer', 'Pricing'])
    // Outside Page mode it goes inside the selected container, like a component.
    const stack = builderReducer(createBuilderState(advuiRegistry, 'VStack'), { type: 'insert-block', block: 'login' })
    expect(stack.document.children.at(-1)).toMatchObject({ component: 'Grid', label: 'Login' })

    const twice = builderReducer(builderReducer(page, { type: 'insert-block-at', block: 'footer', targetId: 'page', position: 'inside' }), {
      type: 'insert-block-at',
      block: 'navbar',
      targetId: 'vstack',
      position: 'before',
    })
    expect(twice.document.children.map((child) => child.label)).toEqual(['Navbar', 'Footer'])
    const ids = layers(twice.document).map(([node]) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    // A block is no text: a Button cannot hold one.
    const button = builderReducer(page, { type: 'insert', component: 'Button' })
    expect(builderReducer(button, { type: 'insert-block-at', block: 'hero', targetId: 'button', position: 'inside' })).toBe(button)
  })
})
