import { components as advuiMetas, type ComponentMeta } from '@advui/core/meta'
import { adaptAdvuiMeta, type AdaptOptions } from './adaptMeta'
import type { PropMetadata, TemplateNode } from './metadata'
import { createRegistry } from './registry'
import {
  backgroundProp,
  borderColorProp,
  colorProp,
  flexProp,
  gapProp,
  heightProp,
  opacityProp,
  paddingProp,
  radiusProp,
  typographyProps,
  widthProp,
} from './styleProps'

/** The metadata `@advui/core/meta` publishes for one component, by slug. */
function advuiMeta(slug: string): ComponentMeta {
  const meta = advuiMetas.find((item) => item.slug === slug)
  if (!meta) throw new Error(`@advui/core/meta has no component ${slug}`)
  return meta
}

const alertDialogMeta = advuiMeta('alert-dialog')
const alertMeta = advuiMeta('alert')
const aspectRatioMeta = advuiMeta('aspect-ratio')
const avatarMeta = advuiMeta('avatar')
const badgeMeta = advuiMeta('badge')
const buttonMeta = advuiMeta('button')
const cardMeta = advuiMeta('card')
const checkboxMeta = advuiMeta('checkbox')
const chipMeta = advuiMeta('chip')
const containerMeta = advuiMeta('container')
const dropdownMenuMeta = advuiMeta('dropdown-menu')
const emptyStateMeta = advuiMeta('empty-state')
const gridMeta = advuiMeta('grid')
const imageMeta = advuiMeta('image')
const inputMeta = advuiMeta('input')
const labelMeta = advuiMeta('label')
const listMeta = advuiMeta('list')
const numberInputMeta = advuiMeta('number-input')
const paginationMeta = advuiMeta('pagination')
const passwordInputMeta = advuiMeta('password-input')
const progressMeta = advuiMeta('progress')
const radioGroupMeta = advuiMeta('radio-group')
const scrollAreaMeta = advuiMeta('scroll-area')
const searchMeta = advuiMeta('search')
const selectMeta = advuiMeta('select')
const separatorMeta = advuiMeta('separator')
const skeletonMeta = advuiMeta('skeleton')
const sliderMeta = advuiMeta('slider')
const spinnerMeta = advuiMeta('spinner')
const stackMeta = advuiMeta('stack')
const switchMeta = advuiMeta('switch')
const tabsMeta = advuiMeta('tabs')
const textareaMeta = advuiMeta('textarea')
const toastMeta = advuiMeta('toast')
const tooltipMeta = advuiMeta('tooltip')
const typographyMeta = advuiMeta('typography')
const wrapMeta = advuiMeta('wrap')

/*
 * Props below that come from `extraProps` are builder knowledge AdvUI's metadata
 * does not carry in an editable form: types like ReactNode or `number | {...}`,
 * or props a component inherits without documenting. An AdvUI upgrade never
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

function node(
  id: string,
  component: string,
  label: string,
  props: Record<string, unknown> = {},
  children: TemplateNode[] = [],
  text?: string,
): TemplateNode {
  return { id, component, label, props, children, text }
}

const button = adaptAdvuiMeta(buttonMeta, {
  extraProps: [backgroundProp, colorProp, radiusProp, paddingProp],
  template: node('button', 'Button', 'Button', {}, [], 'Click Me'),
})

const card = adaptAdvuiMeta(cardMeta, {
  extraProps: [backgroundProp, borderColorProp, radiusProp, paddingProp],
  template: node('card', 'Card', 'Card', {}, [
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
  ]),
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
  template: node('input', 'Input', 'Input', { width: '280px' }),
})

const badge = adaptAdvuiMeta(badgeMeta, {
  extraProps: [backgroundProp, radiusProp],
  template: node('badge', 'Badge', 'Badge', {}, [], 'Badge'),
})

const image = adaptAdvuiMeta(imageMeta, {
  propPlatforms: { loading: ['web'] },
  extraProps: [widthProp, heightProp, radiusProp, borderColorProp, opacityProp],
  template: node('image', 'Image', 'Image', {
    src: '/preview-photo.svg',
    alt: 'Abstract preview',
    ratio: 1.78,
    width: '320px',
  }),
})

const text = adaptAdvuiMeta(typographyMeta, {
  textDefault: 'The quick brown fox jumps over the lazy dog.',
  extraProps: typographyProps({ size: 'base' }),
  template: node('text', 'Text', 'Text', {}, [], 'The quick brown fox jumps over the lazy dog.'),
})

const aspectRatio = adaptAdvuiMeta(aspectRatioMeta, {
  extraProps: [widthProp],
  propOverrides: { ratio: { min: 0.25, max: 4, step: 0.01 } },
  template: node('aspect-ratio', 'AspectRatio', 'Aspect Ratio', { ratio: 1.78, width: '100%' }, [
    node('aspect-image', 'Image', 'Image', {
      src: '/preview-photo.svg',
      alt: 'Abstract preview',
      width: '100%',
      height: '100%',
    }),
  ]),
})

const container = adaptAdvuiMeta(containerMeta, {
  extraProps: [paddingProp],
  template: node('container', 'Container', 'Container', {}, [
    node('container-text', 'Text', 'Text', {}, [], 'Page content sits inside the container.'),
  ]),
})

const grid = adaptAdvuiMeta(gridMeta, {
  extraProps: [gapProp],
  template: node('grid', 'Grid', 'Grid', { columns: 2 }, [
    node('grid-one', 'Text', 'Text', {}, [], 'One'),
    node('grid-two', 'Text', 'Text', {}, [], 'Two'),
    node('grid-three', 'Badge', 'Badge', {}, [], 'Three'),
    node('grid-four', 'Button', 'Button', {}, [], 'Four'),
  ]),
})

// A ScrollArea holds one child, its scrolling content.
const scrollArea = adaptAdvuiMeta(scrollAreaMeta, {
  extraProps: [heightProp, widthProp],
  template: node('scroll-area', 'ScrollArea', 'Scroll Area', { height: '120px', 'aria-label': 'Notes' }, [
    node('scroll-content', 'VStack', 'Content', { gap: 8 }, [
      node('scroll-one', 'Text', 'Text', {}, [], 'First note. Add components here to fill the scrolling area.'),
      node('scroll-two', 'Text', 'Text', {}, [], 'Second note stays inside the fixed height.'),
      node('scroll-three', 'Text', 'Text', {}, [], 'Third note is reached by scrolling.'),
      node('scroll-four', 'Text', 'Text', {}, [], 'Fourth note sits below the fold.'),
      node('scroll-five', 'Text', 'Text', {}, [], 'Fifth note keeps the list long enough to scroll.'),
      node('scroll-six', 'Button', 'Button', {}, [], 'Action'),
    ]),
  ]),
})

// `direction`, `align`, `distribute` and `wrap` set the same styles as the raw
// props upstream also documents, so the inspector shows only the short ones.
const rawFlexProps = ['flexDirection', 'alignItems', 'justifyContent', 'flexWrap']

// Upstream documents Box, Stack, HStack, VStack, Center and Spacer on one page; each is its own entry here.
function stackPart(part: string, options: AdaptOptions = {}) {
  return adaptAdvuiMeta(stackMeta, {
    part,
    sidebar: true,
    importName: part,
    omit: rawFlexProps,
    extraProps: [gapProp, paddingProp, widthProp, flexProp],
      ...options,
  })
}

const stack = stackPart('Stack', {
  template: node('stack', 'Stack', 'Stack', { gap: 12 }, [
    node('stack-text', 'Text', 'Text', {}, [], 'First'),
    node('stack-button', 'Button', 'Button', {}, [], 'Second'),
  ]),
})

const hStack = stackPart('HStack', {
  template: node('hstack', 'HStack', 'HStack', { gap: 12, width: '100%' }, [
    node('hstack-text', 'Text', 'Text', {}, [], 'Left'),
    node('hstack-spacer', 'Spacer', 'Spacer'),
    node('hstack-button', 'Button', 'Button', {}, [], 'Right'),
  ]),
})

const vStack = stackPart('VStack', {
  template: node('vstack', 'VStack', 'VStack', { gap: 12, width: '320px' }, [
    node('vstack-title', 'Text', 'Text', { weight: 'semibold' }, [], 'Title'),
    node('vstack-text', 'Text', 'Text', {}, [], 'Children stack downward.'),
    node('vstack-button', 'Button', 'Button', {}, [], 'Action'),
  ]),
})

// Box and Center document no props of their own; they take View style props.
const boxProps = [paddingProp, widthProp, heightProp, flexProp, backgroundProp, radiusProp]

const box = stackPart('Box', {
  extraProps: boxProps,
  template: node('box', 'Box', 'Box', { padding: 16, backgroundColor: '$muted', borderRadius: 8 }, [
    node('box-text', 'Text', 'Text', {}, [], 'A Box takes any style prop.'),
  ]),
})

const center = stackPart('Center', {
  extraProps: boxProps,
  template: node('center', 'Center', 'Center', {
    width: '320px',
    height: '160px',
    backgroundColor: '$muted',
    borderRadius: 8,
  }, [node('center-text', 'Text', 'Text', {}, [], 'Centered')]),
})

const spacer = stackPart('Spacer', { extraProps: [], invisible: true })

const wrap = adaptAdvuiMeta(wrapMeta, {
  extraProps: [gapProp, paddingProp, widthProp],
  template: node('wrap', 'Wrap', 'Wrap', { width: '320px' },
    ['Design', 'Research', 'Engineering', 'Marketing', 'Support'].map((tag) =>
      node(`wrap-${tag.toLowerCase()}`, 'Badge', tag, {}, [], tag),
    ),
  ),
})

const label = adaptAdvuiMeta(labelMeta, {
  textDefault: 'Email address',
  template: node('label', 'Label', 'Label', { required: true }, [], 'Email address'),
})

// Textarea and PasswordInput inherit Input props that their metadata does not repeat.
const textarea = adaptAdvuiMeta(textareaMeta, {
  extraProps: [
    stringProp('placeholder', 'Placeholder', 'Hint text. Pair with a Label for the accessible name.'),
    widthProp,
  ],
  staticProps: { 'aria-label': 'Message' },
  template: node('textarea', 'Textarea', 'Textarea', {
    placeholder: 'Write a message',
    rows: 4,
    width: '280px',
  }),
})

const checkbox = adaptAdvuiMeta(checkboxMeta, {
  staticProps: { 'aria-label': 'Agree' },
  template: node('checkbox', 'Checkbox', 'Checkbox', { defaultChecked: true }),
})

const switchControl = adaptAdvuiMeta(switchMeta, {
  staticProps: { 'aria-label': 'Notifications' },
  template: node('switch', 'Switch', 'Switch', { defaultChecked: true }),
})

// Sidebar groups below differ from AdvUI's docs categories where the builder groups by task.
const separator = adaptAdvuiMeta(separatorMeta, {
  category: 'layout',
  extraProps: [widthProp],
  template: node('separator', 'Separator', 'Separator', { width: '100%' }),
})

const select = adaptAdvuiMeta(selectMeta, {
  extraProps: [widthProp],
  staticProps: { 'aria-label': 'Fruit' },
  template: node('select', 'Select', 'Select', {
    defaultValue: 'apple',
    placeholder: 'Choose a fruit',
    width: '280px',
  }, [
    node('select-apple', 'Select.Item', 'Apple', { value: 'apple' }, [], 'Apple'),
    node('select-orange', 'Select.Item', 'Orange', { value: 'orange' }, [], 'Orange'),
    node('select-pear', 'Select.Item', 'Pear', { value: 'pear' }, [], 'Pear'),
  ]),
  item: {
    noun: 'option',
    part: 'Select.Item',
    valuePrefix: 'option',
    nodes: [{ component: 'Select.Item', label: 'Option {n}', props: { value: '{value}' }, text: 'Option {n}' }],
  },
})

const selectItem = adaptAdvuiMeta(selectMeta, {
  part: 'Select.Item',
  sidebar: false,
  importName: 'Select',
  extraProps: [booleanProp('disabled', 'Disabled', 'Keeps this option from being chosen.')],
  textDefault: 'Apple',
})

const tabs = adaptAdvuiMeta(tabsMeta, {
  extraProps: [widthProp],
  template: node('tabs', 'Tabs', 'Tabs', { defaultValue: 'account', width: '320px' }, [
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
  ]),
  item: {
    noun: 'tab',
    part: 'Tabs.Trigger',
    valuePrefix: 'tab',
    nodes: [
      { component: 'Tabs.Trigger', into: 'Tabs.List', label: 'Tab {n}', props: { value: '{value}' }, text: 'Tab {n}' },
      {
        component: 'Tabs.Content',
        label: 'Tab {n} panel',
        props: { value: '{value}' },
        children: [{ component: 'Text', label: 'Text', text: 'Tab {n} details' }],
      },
    ],
  },
})

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

const avatar = adaptAdvuiMeta(avatarMeta, {
  category: 'data-display',
  template: node('avatar', 'Avatar', 'Avatar', { alt: 'Ada Lovelace', size: 'lg' }),
})

// Upstream types the value as `number | number[]` (range sliders); the builder edits one thumb.
const slider = adaptAdvuiMeta(sliderMeta, {
  extraProps: [numberProp('defaultValue', 'Default Value', 'Starting position of the thumb.'), widthProp],
  staticProps: { 'aria-label': 'Volume' },
  template: node('slider', 'Slider', 'Slider', { defaultValue: 40, width: '280px' }),
})

const radioGroup = adaptAdvuiMeta(radioGroupMeta, {
  staticProps: { 'aria-label': 'Billing' },
  template: node('radio-group', 'RadioGroup', 'Radio group', { defaultValue: 'monthly' }, [
    node('radio-monthly', 'RadioGroup.Item', 'Monthly', { value: 'monthly', id: 'plan-monthly' }),
    node('radio-monthly-label', 'Label', 'Monthly', { htmlFor: 'plan-monthly' }, [], 'Monthly'),
    node('radio-yearly', 'RadioGroup.Item', 'Yearly', { value: 'yearly', id: 'plan-yearly' }),
    node('radio-yearly-label', 'Label', 'Yearly', { htmlFor: 'plan-yearly' }, [], 'Yearly'),
  ]),
  item: {
    noun: 'option',
    part: 'RadioGroup.Item',
    valuePrefix: 'option',
    nodes: [
      { component: 'RadioGroup.Item', label: 'Option {n}', props: { value: '{value}', id: '{host}-{value}' } },
      { component: 'Label', label: 'Option {n}', props: { htmlFor: '{host}-{value}' }, text: 'Option {n}' },
    ],
  },
})

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
  template: node('password-input', 'PasswordInput', 'Password input', {
    placeholder: 'Enter your password',
    width: '280px',
  }),
})

// Upstream types the value as `number | null`.
const numberInput = adaptAdvuiMeta(numberInputMeta, {
  extraProps: [
    numberProp('defaultValue', 'Default Value', 'Starting number. Empty when omitted.'),
    booleanProp('disabled', 'Disabled', 'Prevents typing and stepping.'),
  ],
  staticProps: { 'aria-label': 'Quantity' },
  template: node('number-input', 'NumberInput', 'Number input', {
    defaultValue: 2,
    min: 1,
    max: 10,
  }),
})

const progress = adaptAdvuiMeta(progressMeta, {
  extraProps: [widthProp],
  template: node('progress', 'Progress', 'Progress', {
    value: 60,
    label: 'Upload progress',
    width: '280px',
  }),
})

const spinner = adaptAdvuiMeta(spinnerMeta, {
  template: node('spinner', 'Spinner', 'Spinner', { size: 'lg' }),
})

const skeleton = adaptAdvuiMeta(skeletonMeta, {
  category: 'feedback',
  extraProps: [widthProp, heightProp],
  template: node('skeleton', 'Skeleton', 'Skeleton', { width: '240px', height: '16px' }),
})

const alert = adaptAdvuiMeta(alertMeta, {
  extraProps: [widthProp],
  template: node('alert', 'Alert', 'Alert', { variant: 'warning', width: '320px' }, [
    node('alert-title', 'Alert.Title', 'Title', {}, [], 'Check your connection'),
    node(
      'alert-description',
      'Alert.Description',
      'Description',
      {},
      [],
      'The last save did not finish. Try again.',
    ),
  ]),
})

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
  // Upstream lets it hold elements; the builder edits it as text.
  acceptsChildren: false,
})

// Upstream types title and description as ReactNode; the builder edits text.
const emptyState = adaptAdvuiMeta(emptyStateMeta, {
  extraProps: [
    stringProp('title', 'Title', 'Heading for the empty place.', true),
    stringProp('description', 'Description', 'Short explanation under the title.'),
    widthProp,
  ],
  template: node(
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
  ),
})

const search = adaptAdvuiMeta(searchMeta, {
  category: 'forms',
  template: node('search', 'Search', 'Search', {
    defaultValue: 'messages',
    placeholder: 'Search messages',
  }),
})

const chip = adaptAdvuiMeta(chipMeta, {
  textDefault: 'Inbox',
  template: node('chip', 'Chip', 'Chip', { defaultSelected: true }, [], 'Inbox'),
})

const list = adaptAdvuiMeta(listMeta, {
  extraProps: [widthProp],
  template: node('list', 'List', 'List', { variant: 'outline', divided: true, width: '320px' }, [
    node('list-inbox', 'List.Item', 'Inbox', { title: 'Inbox', description: '3 new messages' }),
    node('list-drafts', 'List.Item', 'Drafts', { title: 'Drafts', description: '1 unsent draft' }),
  ]),
  item: {
    noun: 'item',
    part: 'List.Item',
    nodes: [{ component: 'List.Item', label: 'Item {n}', props: { title: 'Item {n}' } }],
  },
})

const listItem = adaptAdvuiMeta(listMeta, {
  part: 'List.Item',
  sidebar: false,
  importName: 'List',
  extraProps: [
    stringProp('title', 'Title', 'Main line of the row.', true),
    stringProp('description', 'Description', 'Muted second line.'),
  ],
  // Upstream lets a row hold elements; the builder edits it through title and description.
  acceptsChildren: false,
})

const pagination = adaptAdvuiMeta(paginationMeta, {
  template: node('pagination', 'Pagination', 'Pagination', { count: 10, defaultPage: 3 }),
})

const alertDialog = adaptAdvuiMeta(alertDialogMeta, {
  category: 'overlay',
  template: node('alert-dialog', 'AlertDialog', 'Alert dialog', { defaultOpen: true }, [
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
  ]),
})

const alertDialogTrigger = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Trigger',
  sidebar: false,
  importName: 'AlertDialog',
  textDefault: 'Delete project',
  // Upstream lets it hold one element; the builder edits it as text.
  acceptsChildren: false,
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
  template: node('toast', 'Toast', 'Toast', {
    title: 'Changes saved',
    description: 'Your profile is up to date.',
    type: 'success',
  }, [], 'Show toast'),
})

// Upstream types `content` as ReactNode; the builder edits text.
const tooltip = adaptAdvuiMeta(tooltipMeta, {
  extraProps: [
    stringProp('content', 'Content', 'Short supplementary text. Do not put essential information only here.', true),
  ],
  template: node('tooltip', 'Tooltip', 'Tooltip', {
    content: 'Saves your changes',
    defaultOpen: true,
  }, [
    node('tooltip-button', 'Button', 'Button', {}, [], 'Save'),
  ]),
})

const dropdownMenu = adaptAdvuiMeta(dropdownMenuMeta, {
  category: 'overlay',
  template: node('dropdown', 'DropdownMenu', 'Dropdown menu', { defaultOpen: true }, [
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
  ]),
})

const dropdownMenuTrigger = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Trigger',
  sidebar: false,
  importName: 'DropdownMenu',
})

const dropdownMenuContent = adaptAdvuiMeta(dropdownMenuMeta, {
  part: 'DropdownMenu.Content',
  sidebar: false,
  importName: 'DropdownMenu',
  item: {
    noun: 'item',
    part: 'DropdownMenu.Item',
    nodes: [{ component: 'DropdownMenu.Item', label: 'Item {n}', text: 'Item {n}' }],
  },
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

export const advuiRegistry = createRegistry({
  importSource: '@advui/core',
  // `breakpoints` from @advui/theme, which responsive props are keyed by. A test keeps them in step.
  breakpoints: [
    { name: 'xs', minWidth: 460 },
    { name: 'sm', minWidth: 640 },
    { name: 'md', minWidth: 768 },
    { name: 'lg', minWidth: 1024 },
    { name: 'xl', minWidth: 1280 },
    { name: 'xxl', minWidth: 1536 },
  ],
  page: node('page', 'Stack', 'Page', { gap: 16, padding: 24 }),
  // A 12-column row: Boxes share the width of an HStack by their spans. Move to Grid columns once
  // AdvUI adds `Grid.Item span`.
  columns: (spans) => ({
    component: 'HStack',
    label: `Columns ${spans.join(' ')}`,
    props: { gap: 16, width: '100%', align: 'stretch' },
    children: spans.map((span, index) => ({ component: 'Box', label: `Column ${index + 1}`, props: { flex: span } })),
  }),
  // Sidebar entries appear in this order. Compound parts follow their component.
  components: [
    button,
    input,
    textarea,
    label,
    checkbox,
    switchControl,
    select,
    selectItem,
    slider,
    radioGroup,
    radioGroupItem,
    passwordInput,
    numberInput,
    search,
    progress,
    spinner,
    skeleton,
    alert,
    alertTitle,
    alertDescription,
    emptyState,
    card,
    cardHeader,
    cardTitle,
    cardDescription,
    cardContent,
    cardFooter,
    chip,
    list,
    listItem,
    avatar,
    text,
    badge,
    image,
    tabs,
    tabsList,
    tabsTrigger,
    tabsContent,
    pagination,
    alertDialog,
    alertDialogTrigger,
    alertDialogContent,
    alertDialogHeader,
    alertDialogTitle,
    alertDialogDescription,
    alertDialogFooter,
    alertDialogCancel,
    alertDialogAction,
    toast,
    tooltip,
    dropdownMenu,
    dropdownMenuTrigger,
    dropdownMenuContent,
    dropdownMenuLabel,
    dropdownMenuItem,
    dropdownMenuSeparator,
    stack,
    hStack,
    vStack,
    box,
    center,
    spacer,
    wrap,
    grid,
    container,
    aspectRatio,
    scrollArea,
    separator,
  ],
})
