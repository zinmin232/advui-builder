import corePackage from '@advui/core/package.json'
import { platformNote, propsForPlatform } from './adaptMeta'
import { acceptsChildren, createDocument, getMeta, sidebarEntries } from './componentRegistry'
import type { ConfigNode } from './metadata'
import { advuiMetaVersion } from './sourceMeta'
import { generateCode } from '../builder/code/codeGenerator'
import { builderReducer, createBuilderState } from '../builder/state/builderState'

describe('AdvUI metadata snapshot', () => {
  it('was taken from the installed @advui/core version', () => {
    expect(advuiMetaVersion, 'Run `pnpm sync-meta` after changing the @advui/core version').toBe(corePackage.version)
  })

  it('still describes every prop the starter templates and added items set', () => {
    const unknown: string[] = []
    const check = (node: ConfigNode) => {
      const meta = getMeta(node.component)
      const known = new Set([...meta.props.map((prop) => prop.key), ...Object.keys(meta.staticProps ?? {})])
      for (const key of Object.keys(node.props)) if (!known.has(key)) unknown.push(`${node.component}.${key}`)
      node.children.forEach(check)
    }
    for (const { name } of sidebarEntries()) check(createDocument(name))
    for (const [component, selectedId] of [
      ['Select', 'select'],
      ['RadioGroup', 'radio-group'],
      ['Tabs', 'tabs'],
      ['List', 'list'],
      ['DropdownMenu', 'dropdown-content'],
    ]) {
      check(builderReducer(createBuilderState(component, { selectedId }), { type: 'add-item' }).document)
    }
    expect(unknown, 'A metadata sync dropped these props; add them back as registry extraProps').toEqual([])
  })
})

describe('platform metadata', () => {
  it('filters web-only properties and swaps notes with the platform', () => {
    const image = getMeta('Image')
    expect(propsForPlatform(image, 'web').map((prop) => prop.key)).toContain('loading')
    expect(propsForPlatform(image, 'android').map((prop) => prop.key)).not.toContain('loading')
    expect(propsForPlatform(image, 'ios').map((prop) => prop.key)).not.toContain('loading')
    expect(platformNote(image, 'web')).toMatch(/object-fit/)
    expect(platformNote(image, 'android')).toMatch(/HTTPS/)
    expect(platformNote(image, 'ios')).toMatch(/resizeMode/)
  })

  it('hides the notes section source when a component has none', () => {
    expect(platformNote(getMeta('Card'), 'web')).toBeNull()
    expect(platformNote(getMeta('Button'), 'android')).toMatch(/native/)
    expect(platformNote(getMeta('Button'), 'web')).toMatch(/Hover/)
  })

  it('hides the native keyboard control on web', () => {
    const input = getMeta('Input')
    expect(propsForPlatform(input, 'web').map((prop) => prop.key)).not.toContain('keyboardType')
    expect(propsForPlatform(input, 'ios').map((prop) => prop.key)).toContain('keyboardType')
  })

  it('lists the layout components and gives them a starter document', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['AspectRatio', 'Container', 'Grid', 'ScrollArea', 'Stack']))
    for (const name of ['AspectRatio', 'Container', 'Grid', 'ScrollArea', 'Stack']) {
      expect(getMeta(name).categoryId).toBe('layout')
      expect(acceptsChildren(name)).toBe(true)
      expect(createDocument(name).children.length).toBeGreaterThan(0)
    }
    expect(getMeta('Grid').props.find((prop) => prop.key === 'columns')?.defaultValue).toBe(1)
    expect(generateCode(createDocument('Grid'))).toContain('<Grid\n  columns={2}\n>')
    expect(generateCode(createDocument('Stack'))).toContain('gap={12}')
    expect(generateCode(createDocument('ScrollArea'))).toContain('aria-label="Notes"')
  })

  it('lists the form controls and separator', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Label', 'Textarea', 'Checkbox', 'Switch', 'Separator']))
    for (const name of ['Label', 'Textarea', 'Checkbox', 'Switch']) {
      expect(getMeta(name).categoryId).toBe('forms')
      expect(acceptsChildren(name)).toBe(false)
    }
    expect(getMeta('Separator').categoryId).toBe('layout')
    expect(acceptsChildren('Separator')).toBe(false)
    expect(generateCode(createDocument('Label'))).toContain('<Label required>Email address</Label>')
    expect(generateCode(createDocument('Checkbox'))).toContain('defaultChecked')
    expect(generateCode(createDocument('Switch'))).toContain('defaultChecked')
    expect(generateCode(createDocument('Textarea'))).toContain('rows={4}')
    expect(generateCode(createDocument('Textarea'))).toContain('placeholder="Write a message"')
    expect(generateCode(createDocument('Separator'))).toContain('width="100%"')
    expect(generateCode(createDocument('Separator'))).not.toContain('orientation')
  })

  it('lists select, tabs, avatar, and slider', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Select', 'Tabs', 'Avatar', 'Slider']))
    expect(getMeta('Select').categoryId).toBe('forms')
    expect(getMeta('Slider').categoryId).toBe('forms')
    expect(getMeta('Avatar').categoryId).toBe('data-display')
    expect(getMeta('Tabs').categoryId).toBe('navigation')
    expect(acceptsChildren('Select')).toBe(false)
    expect(acceptsChildren('Tabs')).toBe(false)
    expect(acceptsChildren('Tabs.Content')).toBe(true)
    expect(acceptsChildren('Avatar')).toBe(false)
    expect(acceptsChildren('Slider')).toBe(false)

    const select = generateCode(createDocument('Select'))
    expect(select).toContain('placeholder="Choose a fruit"')
    expect(select).toContain('defaultValue="apple"')
    expect(select).toContain('aria-label="Fruit"')
    expect(select).toContain('<Select.Item value="pear">Pear</Select.Item>')
    expect(select).not.toContain('size=')

    const tabs = generateCode(createDocument('Tabs'))
    expect(tabs).toContain('defaultValue="account"')
    expect(tabs).toContain('<Tabs.Trigger value="account">Account</Tabs.Trigger>')
    expect(tabs).toContain('<Tabs.Content\n    value="password"\n  >')
    expect(tabs).toContain('Password details')
    expect(tabs).not.toContain('variant')

    expect(generateCode(createDocument('Avatar'))).toContain('alt="Ada Lovelace"')
    expect(generateCode(createDocument('Avatar'))).toContain('size="lg"')
    const slider = generateCode(createDocument('Slider'))
    expect(slider).toContain('defaultValue={40}')
    expect(slider).toContain('aria-label="Volume"')
    expect(slider).toContain('width="280px"')
    expect(slider).not.toContain('min=')
  })

  it('lists radio, password, number, and progress', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['RadioGroup', 'PasswordInput', 'NumberInput', 'Progress']))
    expect(getMeta('RadioGroup').categoryId).toBe('forms')
    expect(getMeta('PasswordInput').categoryId).toBe('forms')
    expect(getMeta('NumberInput').categoryId).toBe('forms')
    expect(getMeta('Progress').categoryId).toBe('feedback')
    for (const name of ['RadioGroup', 'PasswordInput', 'NumberInput', 'Progress']) {
      expect(acceptsChildren(name)).toBe(false)
    }

    const radio = generateCode(createDocument('RadioGroup'))
    expect(radio).toContain('defaultValue="monthly"')
    expect(radio).toContain('aria-label="Billing"')
    expect(radio).toContain('value="yearly"')
    expect(radio).toContain('id="plan-yearly"')
    expect(radio).toContain('<Label htmlFor="plan-monthly">Monthly</Label>')
    expect(radio).not.toContain('size=')

    const password = generateCode(createDocument('PasswordInput'))
    expect(password).toContain('placeholder="Enter your password"')
    expect(password).toContain('aria-label="Password"')
    expect(password).toContain('width="280px"')
    expect(password).not.toContain('defaultVisible')

    const number = generateCode(createDocument('NumberInput'))
    expect(number).toContain('defaultValue={2}')
    expect(number).toContain('min={1}')
    expect(number).toContain('max={10}')
    expect(number).toContain('aria-label="Quantity"')
    expect(number).not.toContain('step=')

    const progress = generateCode(createDocument('Progress'))
    expect(progress).toContain('value={60}')
    expect(progress).toContain('label="Upload progress"')
    expect(progress).toContain('width="280px"')
    expect(progress).not.toContain('tone')
    expect(progress).not.toContain('max=')
  })

  it('lists spinner, skeleton, alert, and empty state', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Spinner', 'Skeleton', 'Alert', 'EmptyState']))
    for (const name of ['Spinner', 'Skeleton', 'Alert', 'EmptyState']) {
      expect(getMeta(name).categoryId).toBe('feedback')
    }
    expect(acceptsChildren('Spinner')).toBe(false)
    expect(acceptsChildren('Skeleton')).toBe(false)
    expect(acceptsChildren('Alert')).toBe(false)
    expect(acceptsChildren('EmptyState')).toBe(true)

    const spinner = generateCode(createDocument('Spinner'))
    expect(spinner).toContain('<Spinner size="lg" />')
    expect(spinner).not.toContain('label=')

    const skeleton = generateCode(createDocument('Skeleton'))
    expect(skeleton).toContain('width="240px"')
    expect(skeleton).toContain('height="16px"')
    expect(skeleton).not.toContain('circle')

    const alert = generateCode(createDocument('Alert'))
    expect(alert).toContain('variant="warning"')
    expect(alert).toContain('<Alert.Title>Check your connection</Alert.Title>')
    expect(alert).toContain('<Alert.Description>The last save did not finish. Try again.</Alert.Description>')

    const empty = generateCode(createDocument('EmptyState'))
    expect(empty).toContain('title="No messages"')
    expect(empty).toContain('description="When someone writes to you, it shows up here."')
    expect(empty).toContain('bordered')
    expect(empty).toContain('<Button>Create one</Button>')
    expect(empty).not.toContain('tone=')
  })

  it('lists search, chip, list, and pagination', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['Search', 'Chip', 'List', 'Pagination']))
    expect(getMeta('Search').categoryId).toBe('forms')
    expect(getMeta('Chip').categoryId).toBe('data-display')
    expect(getMeta('List').categoryId).toBe('data-display')
    expect(getMeta('Pagination').categoryId).toBe('navigation')
    expect(acceptsChildren('Search')).toBe(false)
    expect(acceptsChildren('Chip')).toBe(false)
    expect(acceptsChildren('List')).toBe(true)
    expect(acceptsChildren('List.Item')).toBe(false)
    expect(acceptsChildren('Pagination')).toBe(false)

    const search = generateCode(createDocument('Search'))
    expect(search).toContain('defaultValue="messages"')
    expect(search).toContain('placeholder="Search messages"')
    expect(search).not.toContain('value=')
    expect(search).not.toContain('aria-label=')

    const chip = generateCode(createDocument('Chip'))
    expect(chip).toContain('<Chip defaultSelected>Inbox</Chip>')

    const list = generateCode(createDocument('List'))
    expect(list).toContain('variant="outline"')
    expect(list).toContain('divided')
    expect(list).toContain('width="320px"')
    expect(list).toContain('title="Inbox"')
    expect(list).toContain('description="3 new messages"')
    expect(list).toContain('title="Drafts"')

    const pagination = generateCode(createDocument('Pagination'))
    expect(pagination).toContain('count={10}')
    expect(pagination).toContain('defaultPage={3}')
    expect(pagination).not.toContain('page=')
    expect(pagination).not.toContain('variant=')
  })

  it('lists alert dialog, toast, tooltip, and dropdown menu', () => {
    const names = sidebarEntries().map((entry) => entry.name)
    expect(names).toEqual(expect.arrayContaining(['AlertDialog', 'Toast', 'Tooltip', 'DropdownMenu']))
    for (const name of ['AlertDialog', 'Toast', 'Tooltip', 'DropdownMenu']) {
      expect(getMeta(name).categoryId).toBe('overlay')
    }
    expect(acceptsChildren('AlertDialog')).toBe(false)
    expect(acceptsChildren('AlertDialog.Content')).toBe(true)
    expect(acceptsChildren('AlertDialog.Header')).toBe(true)
    expect(acceptsChildren('AlertDialog.Footer')).toBe(true)
    expect(acceptsChildren('AlertDialog.Title')).toBe(false)
    expect(acceptsChildren('Toast')).toBe(false)
    expect(acceptsChildren('Tooltip')).toBe(false)
    expect(acceptsChildren('DropdownMenu')).toBe(false)
    expect(acceptsChildren('DropdownMenu.Content')).toBe(true)
    expect(acceptsChildren('DropdownMenu.Item')).toBe(false)

    const dialog = generateCode(createDocument('AlertDialog'))
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

    const toastCode = generateCode(createDocument('Toast'))
    expect(toastCode).toContain('import { Button, toast } from \'@advui/core\'')
    expect(toastCode).toContain(
      'toast.success("Changes saved", { description: "Your profile is up to date." })',
    )
    expect(toastCode).toContain('Show toast')
    expect(toastCode).not.toContain('duration')
    expect(toastCode).not.toContain('<Toast')

    const changed = builderReducer(
      builderReducer(createBuilderState('Toast'), {
        type: 'set-prop',
        id: 'toast',
        key: 'type',
        value: 'error',
      }),
      { type: 'set-prop', id: 'toast', key: 'description', value: '' },
    )
    const errorToast = generateCode(changed.document)
    expect(errorToast).toContain('toast.error("Changes saved")')
    expect(errorToast).not.toContain('description')

    const hint = generateCode(createDocument('Tooltip'))
    expect(hint).toContain('content="Saves your changes"')
    expect(hint).toContain('defaultOpen')
    expect(hint).toContain('<Button>Save</Button>')
    expect(hint).not.toContain('delay=')
    expect(hint).not.toContain('side=')
    expect(hint).not.toContain('open=')

    const menu = generateCode(createDocument('DropdownMenu'))
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
