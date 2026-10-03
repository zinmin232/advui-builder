import { adaptAdvuiMeta } from './adaptMeta'
import type { ComponentMetadata, ConfigNode, PlatformId, PropMetadata } from './metadata'
import { alertDialogMeta, alertMeta, avatarMeta, badgeMeta, buttonMeta, cardMeta, chipMeta, dropdownMenuMeta, emptyStateMeta, imageMeta, inputMeta, listMeta, paginationMeta, searchMeta, typographyMeta, toastMeta, tooltipMeta, aspectRatioMeta, checkboxMeta, containerMeta, gridMeta, labelMeta, numberInputMeta, passwordInputMeta, progressMeta, radioGroupMeta, scrollAreaMeta, selectMeta, separatorMeta, skeletonMeta, sliderMeta, spinnerMeta, stackMeta, switchMeta, tabsMeta, textareaMeta } from './sourceMeta'
import {
  backgroundProp,
  borderColorProp,
  colorProp,
  gapProp,
  heightProp,
  opacityProp,
  paddingProp,
  radiusProp,
  typographyProps,
  widthProp,
} from './styleProps'

/*
 * Props below that come from `extraProps` are builder knowledge AdvUI's metadata
 * does not carry in an editable form: types like ReactNode or `number | {...}`,
 * or props a component inherits without documenting. A metadata sync never
 * removes them; the registry tests check every template prop still resolves.
 */
function stringProp(key: string, label: string, description: string, required?: boolean): PropMetadata {
  return { key, type: 'string', label, description, group: 'component', required }
}

function numberProp(key: string, label: string, description: string): PropMetadata {
  return { key, type: 'number', label, description, group: 'component' }
}

function booleanProp(key: string, label: string, description: string): PropMetadata {
  return { key, type: 'boolean', label, description, group: 'component', defaultValue: false }
}

const button = adaptAdvuiMeta(buttonMeta, {
  extraProps: [backgroundProp, colorProp, radiusProp, paddingProp],
})

const card = adaptAdvuiMeta(cardMeta, {
  extraProps: [backgroundProp, borderColorProp, radiusProp, paddingProp],
})

const cardHeader = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Header',
  sidebar: false,
  importName: 'Card',
  extraProps: [gapProp, paddingProp, backgroundProp],
})

const cardTitle = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Title',
  sidebar: false,
  importName: 'Card',
  textDefault: 'Project update',
  extraProps: typographyProps({ size: 'lg', weight: 'semibold' }),
})

const cardDescription = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Description',
  sidebar: false,
  importName: 'Card',
  textDefault: 'A nested surface with selectable parts.',
  extraProps: typographyProps({ size: 'sm', tone: 'muted' }),
})

const cardContent = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Content',
  sidebar: false,
  importName: 'Card',
  extraProps: [gapProp, paddingProp],
})

const cardFooter = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Footer',
  sidebar: false,
  importName: 'Card',
  extraProps: [gapProp, paddingProp],
})

const input = adaptAdvuiMeta(inputMeta, {
  extraProps: [
    widthProp,
    {
      key: 'keyboardType',
      type: 'select',
      label: 'Keyboard',
      description: 'Native keyboard type. Web uses the browser input instead.',
      group: 'advanced',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Email', value: 'email-address' },
        { label: 'Numeric', value: 'numeric' },
        { label: 'Phone', value: 'phone-pad' },
      ],
      platforms: ['android', 'ios'],
    },
  ],
  staticProps: { 'aria-label': 'Email' },
})

const badge = adaptAdvuiMeta(badgeMeta, {
  extraProps: [backgroundProp, radiusProp],
})

const image = adaptAdvuiMeta(imageMeta, {
  propPlatforms: { loading: ['web'] },
  extraProps: [widthProp, heightProp, radiusProp, borderColorProp, opacityProp],
})

const text = adaptAdvuiMeta(typographyMeta, {
  textDefault: 'The quick brown fox jumps over the lazy dog.',
  extraProps: typographyProps({ size: 'base' }),
})

const aspectRatio = adaptAdvuiMeta(aspectRatioMeta, {
  extraProps: [widthProp],
  propOverrides: { ratio: { min: 0.25, max: 4, step: 0.01 } },
})

const container = adaptAdvuiMeta(containerMeta, {
  extraProps: [paddingProp],
})

// Upstream types `columns` as `number | { sm?, md?, … }`; the builder edits the plain number.
const grid = adaptAdvuiMeta(gridMeta, {
  extraProps: [
    {
      key: 'columns',
      type: 'number',
      label: 'Columns',
      description: 'How many equal columns. Children wrap onto the next row.',
      group: 'component',
      defaultValue: 1,
      min: 1,
      max: 6,
      step: 1,
    },
    gapProp,
  ],
})

const scrollArea = adaptAdvuiMeta(scrollAreaMeta, {
  extraProps: [heightProp, widthProp],
})

// Upstream documents Box, Stack and HStack together, with open-ended flex types (`'row' | 'column' | …`).
const stack = adaptAdvuiMeta(stackMeta, {
  part: 'Stack',
  sidebar: true,
  importName: 'Stack',
  extraProps: [
    {
      key: 'flexDirection',
      type: 'select',
      label: 'Flex Direction',
      description: 'Column stacks downward. Row lays children side by side.',
      group: 'component',
      defaultValue: 'column',
      options: [
        { label: 'Column', value: 'column' },
        { label: 'Row', value: 'row' },
      ],
    },
    {
      key: 'alignItems',
      type: 'select',
      label: 'Align Items',
      description: 'Alignment on the cross axis.',
      group: 'component',
      defaultValue: 'stretch',
      options: [
        { label: 'Stretch', value: 'stretch' },
        { label: 'Flex Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'Flex End', value: 'flex-end' },
      ],
    },
    {
      key: 'justifyContent',
      type: 'select',
      label: 'Justify Content',
      description: 'Alignment on the main axis.',
      group: 'component',
      defaultValue: 'flex-start',
      options: [
        { label: 'Flex Start', value: 'flex-start' },
        { label: 'Center', value: 'center' },
        { label: 'Flex End', value: 'flex-end' },
        { label: 'Space Between', value: 'space-between' },
      ],
    },
    gapProp,
    paddingProp,
    widthProp,
  ],
})

const label = adaptAdvuiMeta(labelMeta, { textDefault: 'Email address' })

// Textarea and PasswordInput inherit Input props that their metadata does not repeat.
const textarea = adaptAdvuiMeta(textareaMeta, {
  extraProps: [
    stringProp('placeholder', 'Placeholder', 'Hint text. Pair with a Label for the accessible name.'),
    widthProp,
  ],
  staticProps: { 'aria-label': 'Message' },
})

const checkbox = adaptAdvuiMeta(checkboxMeta, { staticProps: { 'aria-label': 'Agree' } })

const switchControl = adaptAdvuiMeta(switchMeta, { staticProps: { 'aria-label': 'Notifications' } })

// Sidebar groups below differ from AdvUI's docs categories where the builder groups by task.
const separator = adaptAdvuiMeta(separatorMeta, {
  category: 'layout', extraProps: [widthProp] })

const select = adaptAdvuiMeta(selectMeta, { extraProps: [widthProp], staticProps: { 'aria-label': 'Fruit' } })

const selectItem = adaptAdvuiMeta(selectMeta, {
  part: 'Select.Item',
  sidebar: false,
  importName: 'Select',
  extraProps: [booleanProp('disabled', 'Disabled', 'Keeps this option from being chosen.')],
  textDefault: 'Apple',
})

const tabs = adaptAdvuiMeta(tabsMeta, { extraProps: [widthProp] })

const tabsList = adaptAdvuiMeta(tabsMeta, {
  part: 'Tabs.List',
  sidebar: false,
  importName: 'Tabs',
})

const tabsTrigger = adaptAdvuiMeta(tabsMeta, {
  part: 'Tabs.Trigger',
  sidebar: false,
  importName: 'Tabs',
  textDefault: 'Account',
})

const tabsContent = adaptAdvuiMeta(tabsMeta, {
  part: 'Tabs.Content',
  sidebar: false,
  importName: 'Tabs',
})

const avatar = adaptAdvuiMeta(avatarMeta, { category: 'data-display' })

// Upstream types the value as `number | number[]` (range sliders); the builder edits one thumb.
const slider = adaptAdvuiMeta(sliderMeta, {
  extraProps: [numberProp('defaultValue', 'Default Value', 'Starting position of the thumb.'), widthProp],
  staticProps: { 'aria-label': 'Volume' },
})

const radioGroup = adaptAdvuiMeta(radioGroupMeta, { staticProps: { 'aria-label': 'Billing' } })

const radioGroupItem = adaptAdvuiMeta(radioGroupMeta, {
  part: 'RadioGroup.Item',
  sidebar: false,
  importName: 'RadioGroup',
})

const passwordInput = adaptAdvuiMeta(passwordInputMeta, {
  extraProps: [
    stringProp('placeholder', 'Placeholder', 'Hint shown while the field is empty.'),
    booleanProp('invalid', 'Invalid', 'Marks the field as invalid.'),
    booleanProp('disabled', 'Disabled', 'Prevents typing and toggling.'),
    widthProp,
  ],
  staticProps: { 'aria-label': 'Password' },
})

// Upstream types the value as `number | null`.
const numberInput = adaptAdvuiMeta(numberInputMeta, {
  extraProps: [
    numberProp('defaultValue', 'Default Value', 'Starting number. Empty when omitted.'),
    booleanProp('disabled', 'Disabled', 'Prevents typing and stepping.'),
  ],
  staticProps: { 'aria-label': 'Quantity' },
})

const progress = adaptAdvuiMeta(progressMeta, { extraProps: [widthProp] })

const spinner = adaptAdvuiMeta(spinnerMeta)

const skeleton = adaptAdvuiMeta(skeletonMeta, {
  category: 'feedback', extraProps: [widthProp, heightProp] })

const alert = adaptAdvuiMeta(alertMeta, { extraProps: [widthProp] })

const alertTitle = adaptAdvuiMeta(alertMeta, {
  part: 'Alert.Title',
  sidebar: false,
  importName: 'Alert',
  textDefault: 'Check your connection',
})

const alertDescription = adaptAdvuiMeta(alertMeta, {
  part: 'Alert.Description',
  sidebar: false,
  importName: 'Alert',
  textDefault: 'The last save did not finish. Try again.',
})

// Upstream types title and description as ReactNode; the builder edits text.
const emptyState = adaptAdvuiMeta(emptyStateMeta, {
  extraProps: [
    stringProp('title', 'Title', 'Heading for the empty place.', true),
    stringProp('description', 'Description', 'Short explanation under the title.'),
    widthProp,
  ],
})

const search = adaptAdvuiMeta(searchMeta, { category: 'forms' })

const chip = adaptAdvuiMeta(chipMeta, { textDefault: 'Inbox' })

const list = adaptAdvuiMeta(listMeta, { extraProps: [widthProp] })

const listItem = adaptAdvuiMeta(listMeta, {
  part: 'List.Item',
  sidebar: false,
  importName: 'List',
  extraProps: [
    stringProp('title', 'Title', 'Main line of the row.', true),
    stringProp('description', 'Description', 'Muted second line.'),
  ],
})

const pagination = adaptAdvuiMeta(paginationMeta)

const alertDialog = adaptAdvuiMeta(alertDialogMeta, { category: 'overlay' })

const alertDialogTrigger = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Trigger',
  sidebar: false,
  importName: 'AlertDialog',
  textDefault: 'Delete project',
})

const alertDialogContent = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Content',
  sidebar: false,
  importName: 'AlertDialog',
})

const alertDialogHeader = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Header',
  sidebar: false,
  importName: 'AlertDialog',
})

const alertDialogTitle = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Title',
  sidebar: false,
  importName: 'AlertDialog',
  textDefault: 'Delete this project?',
})

const alertDialogDescription = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Description',
  sidebar: false,
  importName: 'AlertDialog',
  textDefault: 'This removes the project and its files. You cannot undo it.',
})

const alertDialogFooter = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Footer',
  sidebar: false,
  importName: 'AlertDialog',
})

const alertDialogCancel = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Cancel',
  sidebar: false,
  importName: 'AlertDialog',
  staticProps: { asChild: true },
})

const alertDialogAction = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Action',
  sidebar: false,
  importName: 'AlertDialog',
  staticProps: { asChild: true },
})

// The builder shows a toast as a button that calls `toast.<type>(title, options)`.
const toast = adaptAdvuiMeta(toastMeta, {
  category: 'overlay',
  textDefault: 'Show toast',
  importName: 'toast',
  extraProps: [
    stringProp('title', 'Title', 'The message.', true),
    stringProp('description', 'Description', 'A second line under the message.'),
    {
      key: 'type',
      type: 'select',
      label: 'Type',
      description: 'Chooses the icon and the toast method.',
      group: 'component',
      defaultValue: 'success',
      options: ['default', 'success', 'error', 'warning', 'info', 'loading'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
      })),
    },
    { ...numberProp('duration', 'Duration', 'How long the message stays, in milliseconds.'), defaultValue: 4000 },
  ],
})

// Upstream types `content` as ReactNode; the builder edits text.
const tooltip = adaptAdvuiMeta(tooltipMeta, {
  extraProps: [
    stringProp('content', 'Content', 'Short supplementary text. Do not put essential information only here.', true),
  ],
})

const dropdownMenu = adaptAdvuiMeta(dropdownMenuMeta, { category: 'overlay' })

const dropdownMenuTrigger = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Trigger',
  sidebar: false,
  importName: 'DropdownMenu',
})

const dropdownMenuContent = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Content',
  sidebar: false,
  importName: 'DropdownMenu',
})

const dropdownMenuLabel = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Label',
  sidebar: false,
  importName: 'DropdownMenu',
  textDefault: 'Account',
})

const dropdownMenuItem = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Item',
  sidebar: false,
  importName: 'DropdownMenu',
  textDefault: 'Edit',
})

const dropdownMenuSeparator = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Separator',
  sidebar: false,
  importName: 'DropdownMenu',
})

export const componentRegistry: Record<string, ComponentMetadata> = {
  Button: button,
  Card: card,
  'Card.Header': cardHeader,
  'Card.Title': cardTitle,
  'Card.Description': cardDescription,
  'Card.Content': cardContent,
  'Card.Footer': cardFooter,
  Input: input,
  Badge: badge,
  Image: image,
  Text: text,
  AspectRatio: aspectRatio,
  Container: container,
  Grid: grid,
  ScrollArea: scrollArea,
  Stack: stack,
  Label: label,
  Textarea: textarea,
  Checkbox: checkbox,
  Switch: switchControl,
  Separator: separator,
  Select: select,
  'Select.Item': selectItem,
  Tabs: tabs,
  'Tabs.List': tabsList,
  'Tabs.Trigger': tabsTrigger,
  'Tabs.Content': tabsContent,
  Avatar: avatar,
  Slider: slider,
  RadioGroup: radioGroup,
  'RadioGroup.Item': radioGroupItem,
  PasswordInput: passwordInput,
  NumberInput: numberInput,
  Progress: progress,
  Spinner: spinner,
  Skeleton: skeleton,
  Alert: alert,
  'Alert.Title': alertTitle,
  'Alert.Description': alertDescription,
  EmptyState: emptyState,
  Search: search,
  Chip: chip,
  List: list,
  'List.Item': listItem,
  Pagination: pagination,
  AlertDialog: alertDialog,
  'AlertDialog.Trigger': alertDialogTrigger,
  'AlertDialog.Content': alertDialogContent,
  'AlertDialog.Header': alertDialogHeader,
  'AlertDialog.Title': alertDialogTitle,
  'AlertDialog.Description': alertDialogDescription,
  'AlertDialog.Footer': alertDialogFooter,
  'AlertDialog.Cancel': alertDialogCancel,
  'AlertDialog.Action': alertDialogAction,
  Toast: toast,
  Tooltip: tooltip,
  DropdownMenu: dropdownMenu,
  'DropdownMenu.Trigger': dropdownMenuTrigger,
  'DropdownMenu.Content': dropdownMenuContent,
  'DropdownMenu.Label': dropdownMenuLabel,
  'DropdownMenu.Item': dropdownMenuItem,
  'DropdownMenu.Separator': dropdownMenuSeparator,
}

const sidebarOrder = [
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Checkbox',
  'Switch',
  'Select',
  'Slider',
  'RadioGroup',
  'PasswordInput',
  'NumberInput',
  'Search',
  'Progress',
  'Spinner',
  'Skeleton',
  'Alert',
  'EmptyState',
  'Card',
  'Chip',
  'List',
  'Avatar',
  'Text',
  'Badge',
  'Image',
  'Tabs',
  'Pagination',
  'AlertDialog',
  'Toast',
  'Tooltip',
  'DropdownMenu',
  'Stack',
  'Grid',
  'Container',
  'AspectRatio',
  'ScrollArea',
  'Separator',
]

export function getMeta(component: string): ComponentMetadata {
  const meta = componentRegistry[component]
  if (!meta) throw new Error(`Unknown AdvUI component: ${component}`)
  return meta
}

export function sidebarEntries(): ComponentMetadata[] {
  return sidebarOrder.map((name) => componentRegistry[name]).filter((entry) => entry.sidebar)
}

export function searchComponents(query: string, categoryId = 'all'): ComponentMetadata[] {
  const normalized = query.trim().toLowerCase()
  return sidebarEntries().filter((entry) => {
    if (categoryId !== 'all' && entry.categoryId !== categoryId) return false
    if (!normalized) return true
    const haystack = [entry.name, entry.description, entry.category, ...entry.keywords]
      .join(' ')
      .toLowerCase()
    return haystack.includes(normalized)
  })
}

export function resolveProps(
  meta: ComponentMetadata,
  props: Record<string, unknown>,
  platform: PlatformId,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const prop of meta.props) {
    if (prop.textContent || prop.type === 'typography') continue
    if (prop.platforms && !prop.platforms.includes(platform)) continue
    const value = props[prop.key] !== undefined ? props[prop.key] : prop.defaultValue
    if (value !== undefined) resolved[prop.key] = value
  }
  return resolved
}

function node(
  id: string,
  component: string,
  label: string,
  props: Record<string, unknown> = {},
  children: ConfigNode[] = [],
  text?: string,
): ConfigNode {
  return { id, component, label, props, children, text }
}

export function createDocument(component: string): ConfigNode {
  switch (component) {
    case 'Button':
      return node('button', 'Button', 'Button', {}, [], 'Click Me')
    case 'Input':
      return node('input', 'Input', 'Input', { width: '280px' })
    case 'Badge':
      return node('badge', 'Badge', 'Badge', {}, [], 'Badge')
    case 'Text':
      return node('text', 'Text', 'Text', {}, [], 'The quick brown fox jumps over the lazy dog.')
    case 'Image':
      return node('image', 'Image', 'Image', {
        src: '/preview-photo.svg',
        alt: 'Abstract preview',
        ratio: 1.78,
        width: '320px',
      })
    case 'Card':
      return node('card', 'Card', 'Card', {}, [
        node('card-header', 'Card.Header', 'Header', {}, [
          node('card-title', 'Card.Title', 'Title', {}, [], 'Project update'),
          node(
            'card-description',
            'Card.Description',
            'Description',
            {},
            [],
            'A nested surface with selectable parts.',
          ),
        ]),
        node('card-content', 'Card.Content', 'Content', {}, [
          node('card-image', 'Image', 'Image', {
            src: '/preview-photo.svg',
            alt: 'Abstract preview',
            ratio: 1.78,
            width: '100%',
          }),
        ]),
        node('card-footer', 'Card.Footer', 'Footer', {}, [
          node('card-button', 'Button', 'Button', {}, [], 'Continue'),
        ]),
      ])
    case 'AspectRatio':
      return node('aspect-ratio', 'AspectRatio', 'Aspect Ratio', { ratio: 1.78, width: '100%' }, [
        node('aspect-image', 'Image', 'Image', {
          src: '/preview-photo.svg',
          alt: 'Abstract preview',
          width: '100%',
          height: '100%',
        }),
      ])
    case 'Container':
      return node('container', 'Container', 'Container', {}, [
        node('container-text', 'Text', 'Text', {}, [], 'Page content sits inside the container.'),
      ])
    case 'Grid':
      return node('grid', 'Grid', 'Grid', { columns: 2 }, [
        node('grid-one', 'Text', 'Text', {}, [], 'One'),
        node('grid-two', 'Text', 'Text', {}, [], 'Two'),
        node('grid-three', 'Badge', 'Badge', {}, [], 'Three'),
        node('grid-four', 'Button', 'Button', {}, [], 'Four'),
      ])
    case 'ScrollArea':
      return node('scroll-area', 'ScrollArea', 'Scroll Area', { height: '120px', 'aria-label': 'Notes' }, [
        node('scroll-one', 'Text', 'Text', {}, [], 'First note. Add components here to fill the scrolling area.'),
        node('scroll-two', 'Text', 'Text', {}, [], 'Second note stays inside the fixed height.'),
        node('scroll-three', 'Text', 'Text', {}, [], 'Third note is reached by scrolling.'),
        node('scroll-four', 'Text', 'Text', {}, [], 'Fourth note sits below the fold.'),
        node('scroll-five', 'Text', 'Text', {}, [], 'Fifth note keeps the list long enough to scroll.'),
        node('scroll-six', 'Button', 'Button', {}, [], 'Action'),
      ])
    case 'Stack':
      return node('stack', 'Stack', 'Stack', { gap: 12 }, [
        node('stack-text', 'Text', 'Text', {}, [], 'First'),
        node('stack-button', 'Button', 'Button', {}, [], 'Second'),
      ])
    case 'Label':
      return node('label', 'Label', 'Label', { required: true }, [], 'Email address')
    case 'Textarea':
      return node('textarea', 'Textarea', 'Textarea', {
        placeholder: 'Write a message',
        rows: 4,
        width: '280px',
      })
    case 'Checkbox':
      return node('checkbox', 'Checkbox', 'Checkbox', { defaultChecked: true })
    case 'Switch':
      return node('switch', 'Switch', 'Switch', { defaultChecked: true })
    case 'Separator':
      return node('separator', 'Separator', 'Separator', { width: '100%' })
    case 'Select':
      return node('select', 'Select', 'Select', {
        defaultValue: 'apple',
        placeholder: 'Choose a fruit',
        width: '280px',
      }, [
        node('select-apple', 'Select.Item', 'Apple', { value: 'apple' }, [], 'Apple'),
        node('select-orange', 'Select.Item', 'Orange', { value: 'orange' }, [], 'Orange'),
        node('select-pear', 'Select.Item', 'Pear', { value: 'pear' }, [], 'Pear'),
      ])
    case 'Tabs':
      return node('tabs', 'Tabs', 'Tabs', { defaultValue: 'account', width: '320px' }, [
        node('tabs-list', 'Tabs.List', 'List', {}, [
          node('tabs-account', 'Tabs.Trigger', 'Account', { value: 'account' }, [], 'Account'),
          node('tabs-password', 'Tabs.Trigger', 'Password', { value: 'password' }, [], 'Password'),
        ]),
        node('tabs-account-panel', 'Tabs.Content', 'Account panel', { value: 'account' }, [
          node('tabs-account-text', 'Text', 'Text', {}, [], 'Account details'),
        ]),
        node('tabs-password-panel', 'Tabs.Content', 'Password panel', { value: 'password' }, [
          node('tabs-password-text', 'Text', 'Text', {}, [], 'Password details'),
        ]),
      ])
    case 'Avatar':
      return node('avatar', 'Avatar', 'Avatar', { alt: 'Ada Lovelace', size: 'lg' })
    case 'Slider':
      return node('slider', 'Slider', 'Slider', { defaultValue: 40, width: '280px' })
    case 'RadioGroup':
      return node('radio-group', 'RadioGroup', 'Radio group', { defaultValue: 'monthly' }, [
        node('radio-monthly', 'RadioGroup.Item', 'Monthly', { value: 'monthly', id: 'plan-monthly' }),
        node('radio-monthly-label', 'Label', 'Monthly', { htmlFor: 'plan-monthly' }, [], 'Monthly'),
        node('radio-yearly', 'RadioGroup.Item', 'Yearly', { value: 'yearly', id: 'plan-yearly' }),
        node('radio-yearly-label', 'Label', 'Yearly', { htmlFor: 'plan-yearly' }, [], 'Yearly'),
      ])
    case 'PasswordInput':
      return node('password-input', 'PasswordInput', 'Password input', {
        placeholder: 'Enter your password',
        width: '280px',
      })
    case 'NumberInput':
      return node('number-input', 'NumberInput', 'Number input', {
        defaultValue: 2,
        min: 1,
        max: 10,
      })
    case 'Progress':
      return node('progress', 'Progress', 'Progress', {
        value: 60,
        label: 'Upload progress',
        width: '280px',
      })
    case 'Spinner':
      return node('spinner', 'Spinner', 'Spinner', { size: 'lg' })
    case 'Skeleton':
      return node('skeleton', 'Skeleton', 'Skeleton', { width: '240px', height: '16px' })
    case 'Alert':
      return node('alert', 'Alert', 'Alert', { variant: 'warning', width: '320px' }, [
        node('alert-title', 'Alert.Title', 'Title', {}, [], 'Check your connection'),
        node(
          'alert-description',
          'Alert.Description',
          'Description',
          {},
          [],
          'The last save did not finish. Try again.',
        ),
      ])
    case 'EmptyState':
      return node(
        'empty-state',
        'EmptyState',
        'Empty state',
        {
          title: 'No messages',
          description: 'When someone writes to you, it shows up here.',
          bordered: true,
          width: '320px',
        },
        [node('empty-action', 'Button', 'Button', {}, [], 'Create one')],
      )
    case 'Search':
      return node('search', 'Search', 'Search', {
        defaultValue: 'messages',
        placeholder: 'Search messages',
      })
    case 'Chip':
      return node('chip', 'Chip', 'Chip', { defaultSelected: true }, [], 'Inbox')
    case 'List':
      return node('list', 'List', 'List', { variant: 'outline', divided: true, width: '320px' }, [
        node('list-inbox', 'List.Item', 'Inbox', { title: 'Inbox', description: '3 new messages' }),
        node('list-drafts', 'List.Item', 'Drafts', { title: 'Drafts', description: '1 unsent draft' }),
      ])
    case 'Pagination':
      return node('pagination', 'Pagination', 'Pagination', { count: 10, defaultPage: 3 })
    case 'AlertDialog':
      return node('alert-dialog', 'AlertDialog', 'Alert dialog', { defaultOpen: true }, [
        node('alert-trigger', 'AlertDialog.Trigger', 'Trigger', {}, [], 'Delete project'),
        node('alert-content', 'AlertDialog.Content', 'Content', {}, [
          node('alert-header', 'AlertDialog.Header', 'Header', {}, [
            node('alert-title', 'AlertDialog.Title', 'Title', {}, [], 'Delete this project?'),
            node(
              'alert-description',
              'AlertDialog.Description',
              'Description',
              {},
              [],
              'This removes the project and its files. You cannot undo it.',
            ),
          ]),
          node('alert-footer', 'AlertDialog.Footer', 'Footer', {}, [
            node('alert-cancel', 'AlertDialog.Cancel', 'Cancel', {}, [
              node('alert-cancel-button', 'Button', 'Cancel', { variant: 'outline' }, [], 'Cancel'),
            ]),
            node('alert-action', 'AlertDialog.Action', 'Action', {}, [
              node('alert-action-button', 'Button', 'Delete', { variant: 'destructive' }, [], 'Delete'),
            ]),
          ]),
        ]),
      ])
    case 'Toast':
      return node('toast', 'Toast', 'Toast', {
        title: 'Changes saved',
        description: 'Your profile is up to date.',
        type: 'success',
      }, [], 'Show toast')
    case 'Tooltip':
      return node('tooltip', 'Tooltip', 'Tooltip', {
        content: 'Saves your changes',
        defaultOpen: true,
      }, [
        node('tooltip-button', 'Button', 'Button', {}, [], 'Save'),
      ])
    case 'DropdownMenu':
      return node('dropdown', 'DropdownMenu', 'Dropdown menu', { defaultOpen: true }, [
        node('dropdown-trigger', 'DropdownMenu.Trigger', 'Trigger', {}, [
          node('dropdown-button', 'Button', 'Button', {}, [], 'Actions'),
        ]),
        node('dropdown-content', 'DropdownMenu.Content', 'Content', {}, [
          node('dropdown-label', 'DropdownMenu.Label', 'Label', {}, [], 'Account'),
          node('dropdown-edit', 'DropdownMenu.Item', 'Edit', { shortcut: '⌘E' }, [], 'Edit'),
          node('dropdown-duplicate', 'DropdownMenu.Item', 'Duplicate', {}, [], 'Duplicate'),
          node('dropdown-separator', 'DropdownMenu.Separator', 'Separator'),
          node('dropdown-delete', 'DropdownMenu.Item', 'Delete', { destructive: true }, [], 'Delete'),
        ]),
      ])
    default:
      throw new Error(`No document template for ${component}`)
  }
}

const childContainers = new Set([
  'Card',
  'Card.Header',
  'Card.Content',
  'Card.Footer',
  'AspectRatio',
  'Container',
  'Grid',
  'ScrollArea',
  'Stack',
  'Tabs.Content',
  'EmptyState',
  'List',
  'AlertDialog.Content',
  'AlertDialog.Header',
  'AlertDialog.Footer',
  'DropdownMenu.Content',
])

export function acceptsChildren(component: string): boolean {
  return childContainers.has(component)
}

/** Components that grow by a repeatable part, and what that part is called. */
const itemHosts: Record<string, string> = {
  Select: 'option',
  RadioGroup: 'option',
  Tabs: 'tab',
  List: 'item',
  'DropdownMenu.Content': 'item',
}

export function itemNoun(component: string): string | null {
  return Object.hasOwn(itemHosts, component) ? itemHosts[component] : null
}

function freeIndex(taken: unknown[], prefix: string, start: number): number {
  let index = start
  while (taken.includes(`${prefix}-${index}`)) index += 1
  return index
}

/**
 * Appends one option, tab or item to a host. `idFor` hands out unused node ids.
 * Returns the new host and the node to select.
 */
export function addItem(
  host: ConfigNode,
  idFor: (component: string) => string,
): { node: ConfigNode; selectedId: string } | null {
  const parts = (component: string, from = host) => from.children.filter((child) => child.component === component)
  switch (host.component) {
    case 'Select': {
      const items = parts('Select.Item')
      const index = freeIndex(items.map((item) => item.props.value), 'option', items.length + 1)
      const item = node(idFor('Select.Item'), 'Select.Item', `Option ${index}`, { value: `option-${index}` }, [], `Option ${index}`)
      return { node: { ...host, children: [...host.children, item] }, selectedId: item.id }
    }
    case 'RadioGroup': {
      const items = parts('RadioGroup.Item')
      const index = freeIndex(items.map((item) => item.props.value), 'option', items.length + 1)
      const value = `option-${index}`
      const inputId = `${host.id}-${value}`
      const item = node(idFor('RadioGroup.Item'), 'RadioGroup.Item', `Option ${index}`, { value, id: inputId })
      const label = node(idFor('Label'), 'Label', `Option ${index}`, { htmlFor: inputId }, [], `Option ${index}`)
      return { node: { ...host, children: [...host.children, item, label] }, selectedId: item.id }
    }
    case 'Tabs': {
      const list = parts('Tabs.List')[0]
      const triggers = list ? parts('Tabs.Trigger', list) : []
      const taken = [...triggers, ...parts('Tabs.Content')].map((item) => item.props.value)
      const index = freeIndex(taken, 'tab', triggers.length + 1)
      const value = `tab-${index}`
      const trigger = node(idFor('Tabs.Trigger'), 'Tabs.Trigger', `Tab ${index}`, { value }, [], `Tab ${index}`)
      const panel = node(idFor('Tabs.Content'), 'Tabs.Content', `Tab ${index} panel`, { value }, [
        node(idFor('Text'), 'Text', 'Text', {}, [], `Tab ${index} details`),
      ])
      const children = list
        ? host.children.map((child) => (child === list ? { ...list, children: [...list.children, trigger] } : child))
        : [node(idFor('Tabs.List'), 'Tabs.List', 'List', {}, [trigger]), ...host.children]
      return { node: { ...host, children: [...children, panel] }, selectedId: trigger.id }
    }
    case 'List': {
      const index = parts('List.Item').length + 1
      const item = node(idFor('List.Item'), 'List.Item', `Item ${index}`, { title: `Item ${index}` })
      return { node: { ...host, children: [...host.children, item] }, selectedId: item.id }
    }
    case 'DropdownMenu.Content': {
      const index = parts('DropdownMenu.Item').length + 1
      const item = node(idFor('DropdownMenu.Item'), 'DropdownMenu.Item', `Item ${index}`, {}, [], `Item ${index}`)
      return { node: { ...host, children: [...host.children, item] }, selectedId: item.id }
    }
    default:
      return null
  }
}
