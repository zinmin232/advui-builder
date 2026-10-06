import corePackage from '@advui/core/package.json'
import { platformNote, propsForPlatform } from './adaptMeta'
import { advuiRegistry } from './componentRegistry'
import type { ConfigNode } from './metadata'
import { advuiMetaVersion } from './sourceMeta'
import { generateCode } from '../builder/code/codeGenerator'
import { createBuilderReducer, createBuilderState } from '../builder/state/builderState'

const builderReducer = createBuilderReducer(advuiRegistry)

function starterCode(component: string): string {
  return generateCode(advuiRegistry.createDocument(component), { registry: advuiRegistry })
}

describe('AdvUI metadata snapshot', () => {
  it('was taken from the installed @advui/core version', () => {
    expect(advuiMetaVersion, 'Run `pnpm sync-meta` after changing the @advui/core version').toBe(corePackage.version)
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
    for (const [component, selectedId] of [
      ['Select', 'select'],
      ['RadioGroup', 'radio-group'],
      ['Tabs', 'tabs'],
      ['List', 'list'],
      ['DropdownMenu', 'dropdown-content'],
    ]) {
      check(builderReducer(createBuilderState(advuiRegistry, component, { selectedId }), { type: 'add-item' }).document)
    }
    expect(unknown, 'A metadata sync dropped these props; add them back as registry extraProps').toEqual([])
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
    const layout = ['AspectRatio', 'Container', 'Grid', 'ScrollArea', 'Stack', 'HStack', 'VStack', 'Box', 'Center', 'Wrap']
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
    expect(advuiRegistry.acceptsChildren('Select')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Tabs')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Tabs.Content')).toBe(true)
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
    for (const name of ['RadioGroup', 'PasswordInput', 'NumberInput', 'Progress']) {
      expect(advuiRegistry.acceptsChildren(name)).toBe(false)
    }

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
    expect(advuiRegistry.acceptsChildren('Alert')).toBe(false)
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
    expect(advuiRegistry.acceptsChildren('AlertDialog')).toBe(false)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Content')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Header')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Footer')).toBe(true)
    expect(advuiRegistry.acceptsChildren('AlertDialog.Title')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Toast')).toBe(false)
    expect(advuiRegistry.acceptsChildren('Tooltip')).toBe(false)
    expect(advuiRegistry.acceptsChildren('DropdownMenu')).toBe(false)
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
})
