import { components as advuiMetas, type ComponentMeta } from '@advui/core/meta'
import { iconNames } from '@advui/icons'
import { adaptAdvuiMeta, type AdaptOptions } from './adaptMeta'
import { advuiBlocks } from './advuiBlocks'
import type { PropMetadata, TemplateNode } from './metadata'
import { createRegistry } from './registry'
import {
  ariaLabelProp,
  backgroundProp,
  borderColorProp,
  colorProp,
  flexProp,
  gapProp,
  heightProp,
  marginProp,
  opacityProp,
  paddingProp,
  radiusProp,
  shadowProp,
  typographyProps,
  widthProp,
} from './styleProps'

/** The metadata `@advui/core/meta` publishes for one component, by slug. */
function advuiMeta(slug: string): ComponentMeta {
  const meta = advuiMetas.find((item) => item.slug === slug)
  if (!meta) throw new Error(`@advui/core/meta has no component ${slug}`)
  return meta
}

const accordionMeta = advuiMeta('accordion')
const alertDialogMeta = advuiMeta('alert-dialog')
const alertMeta = advuiMeta('alert')
const aspectRatioMeta = advuiMeta('aspect-ratio')
const autoGridMeta = advuiMeta('auto-grid')
const avatarMeta = advuiMeta('avatar')
const badgeMeta = advuiMeta('badge')
const breadcrumbMeta = advuiMeta('breadcrumb')
const buttonMeta = advuiMeta('button')
const cardMeta = advuiMeta('card')
const checkboxMeta = advuiMeta('checkbox')
const chipMeta = advuiMeta('chip')
const containerMeta = advuiMeta('container')
const dialogMeta = advuiMeta('dialog')
const dropdownMenuMeta = advuiMeta('dropdown-menu')
const emptyStateMeta = advuiMeta('empty-state')
const fieldMeta = advuiMeta('field')
const formMeta = advuiMeta('form')
const gridMeta = advuiMeta('grid')
const imageMeta = advuiMeta('image')
const inputMeta = advuiMeta('input')
const labelMeta = advuiMeta('label')
const listMeta = advuiMeta('list')
const navigationBarMeta = advuiMeta('navigation-bar')
const numberInputMeta = advuiMeta('number-input')
const paginationMeta = advuiMeta('pagination')
const passwordInputMeta = advuiMeta('password-input')
const progressMeta = advuiMeta('progress')
const radioGroupMeta = advuiMeta('radio-group')
const scrollAreaMeta = advuiMeta('scroll-area')
const searchMeta = advuiMeta('search')
const sectionMeta = advuiMeta('section')
const selectMeta = advuiMeta('select')
const separatorMeta = advuiMeta('separator')
const showHideMeta = advuiMeta('show-hide')
const sidebarMeta = advuiMeta('sidebar')
const skeletonMeta = advuiMeta('skeleton')
const sliderMeta = advuiMeta('slider')
const spinnerMeta = advuiMeta('spinner')
const stackMeta = advuiMeta('stack')
const stickyMeta = advuiMeta('sticky')
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
  extraProps: [backgroundProp, borderColorProp, radiusProp, shadowProp, paddingProp, marginProp],
  template: node('card', 'Card', 'Card', {}, [
    node('card-header', 'Card.Header', 'Header', {}, [
      node('card-title', 'Card.Title', 'Title', {}, [], 'Project update'),
      node('card-description', 'Card.Description', 'Description', {}, [], 'A nested surface with selectable parts.'),
    ]),
    node('card-content', 'Card.Content', 'Content', {}, [
      node('card-image', 'Image', 'Image', {
        src: '/preview-photo.svg',
        alt: 'Abstract preview',
        ratio: 1.78,
        width: '100%',
      }),
    ]),
    node('card-footer', 'Card.Footer', 'Footer', {}, [node('card-button', 'Button', 'Button', {}, [], 'Continue')]),
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
    ariaLabelProp,
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
  template: node('input', 'Input', 'Input', { 'aria-label': 'Email', width: '280px' }),
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
  extraProps: [paddingProp, marginProp],
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

const gridItem = adaptAdvuiMeta(gridMeta, {
  part: 'Grid.Item',
  sidebar: false,
  importName: 'Grid',
  propOverrides: { span: { max: 12 }, offset: { max: 11 } },
})

const tile = (id: string, label: string) =>
  node(id, 'Box', label, { padding: 16, backgroundColor: '$muted', borderRadius: 8 }, [
    node(`${id}-text`, 'Text', 'Text', {}, [], label),
  ])

// As many equal columns as fit at `minChildWidth`, from the AutoGrid's own width.
const autoGrid = adaptAdvuiMeta(autoGridMeta, {
  extraProps: [gapProp],
  template: node('auto-grid', 'AutoGrid', 'Auto grid', { minChildWidth: 160 }, [
    tile('auto-grid-one', 'One'),
    tile('auto-grid-two', 'Two'),
    tile('auto-grid-three', 'Three'),
    tile('auto-grid-four', 'Four'),
  ]),
})

const section = adaptAdvuiMeta(sectionMeta, {
  template: node('section', 'Section', 'Section', { background: 'muted' }, [
    node('section-content', 'VStack', 'Content', { gap: 8 }, [
      node('section-title', 'Text', 'Title', { size: '2xl', weight: 'bold' }, [], 'Section title'),
      node('section-text', 'Text', 'Text', { tone: 'muted' }, [], 'A band of the page with its own spacing.'),
    ]),
  ]),
})

const sticky = adaptAdvuiMeta(stickyMeta, {
  template: node('sticky', 'Sticky', 'Sticky', {}, [
    node('sticky-bar', 'HStack', 'Bar', { gap: 12, padding: 12, width: '100%', backgroundColor: '$background' }, [
      node('sticky-brand', 'Text', 'Brand', { weight: 'semibold' }, [], 'Brand'),
      node('sticky-spacer', 'Spacer', 'Spacer'),
      node('sticky-action', 'Button', 'Button', {}, [], 'Sign in'),
    ]),
  ]),
})

// Show and Hide are documented on one page; each is its own entry here.
const show = adaptAdvuiMeta(showHideMeta, {
  part: 'Show',
  sidebar: true,
  importName: 'Show',
  template: node('show', 'Show', 'Show', { above: 'md' }, [
    node('show-text', 'Text', 'Text', {}, [], 'Shown from md up'),
  ]),
})

const hide = adaptAdvuiMeta(showHideMeta, {
  part: 'Hide',
  sidebar: true,
  importName: 'Hide',
  template: node('hide', 'Hide', 'Hide', { below: 'md' }, [
    node('hide-text', 'Text', 'Text', {}, [], 'Hidden below md'),
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
    extraProps: [gapProp, paddingProp, marginProp, widthProp, flexProp, backgroundProp, shadowProp],
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
const boxProps = [paddingProp, marginProp, widthProp, heightProp, flexProp, backgroundProp, radiusProp, shadowProp]

const box = stackPart('Box', {
  extraProps: boxProps,
  template: node('box', 'Box', 'Box', { padding: 16, backgroundColor: '$muted', borderRadius: 8 }, [
    node('box-text', 'Text', 'Text', {}, [], 'A Box takes any style prop.'),
  ]),
})

const center = stackPart('Center', {
  extraProps: boxProps,
  template: node(
    'center',
    'Center',
    'Center',
    {
      width: '320px',
      height: '160px',
      backgroundColor: '$muted',
      borderRadius: 8,
    },
    [node('center-text', 'Text', 'Text', {}, [], 'Centered')],
  ),
})

const spacer = stackPart('Spacer', { extraProps: [], invisible: true })

const wrap = adaptAdvuiMeta(wrapMeta, {
  extraProps: [gapProp, paddingProp, marginProp, widthProp],
  template: node(
    'wrap',
    'Wrap',
    'Wrap',
    { width: '320px' },
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
    ariaLabelProp,
    stringProp('placeholder', 'Placeholder', 'Hint text. Pair with a Label for the accessible name.'),
    widthProp,
  ],
  template: node('textarea', 'Textarea', 'Textarea', {
    'aria-label': 'Message',
    placeholder: 'Write a message',
    rows: 4,
    width: '280px',
  }),
})

const checkbox = adaptAdvuiMeta(checkboxMeta, {
  extraProps: [ariaLabelProp],
  template: node('checkbox', 'Checkbox', 'Checkbox', { 'aria-label': 'Agree', defaultChecked: true }),
})

const switchControl = adaptAdvuiMeta(switchMeta, {
  extraProps: [ariaLabelProp],
  template: node('switch', 'Switch', 'Switch', { 'aria-label': 'Notifications', defaultChecked: true }),
})

// Sidebar groups below differ from AdvUI's docs categories where the builder groups by task.
const separator = adaptAdvuiMeta(separatorMeta, {
  category: 'layout',
  extraProps: [widthProp],
  template: node('separator', 'Separator', 'Separator', { width: '100%' }),
})

const select = adaptAdvuiMeta(selectMeta, {
  extraProps: [ariaLabelProp, widthProp],
  template: node(
    'select',
    'Select',
    'Select',
    {
      'aria-label': 'Fruit',
      defaultValue: 'apple',
      placeholder: 'Choose a fruit',
      width: '280px',
    },
    [
      node('select-apple', 'Select.Item', 'Apple', { value: 'apple' }, [], 'Apple'),
      node('select-orange', 'Select.Item', 'Orange', { value: 'orange' }, [], 'Orange'),
      node('select-pear', 'Select.Item', 'Pear', { value: 'pear' }, [], 'Pear'),
    ],
  ),
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
  extraProps: [
    ariaLabelProp,
    numberProp('defaultValue', 'Default Value', 'Starting position of the thumb.'),
    widthProp,
  ],
  template: node('slider', 'Slider', 'Slider', { 'aria-label': 'Volume', defaultValue: 40, width: '280px' }),
})

const radioGroup = adaptAdvuiMeta(radioGroupMeta, {
  extraProps: [ariaLabelProp],
  template: node('radio-group', 'RadioGroup', 'Radio group', { 'aria-label': 'Billing', defaultValue: 'monthly' }, [
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
    ariaLabelProp,
    stringProp('placeholder', 'Placeholder', 'Hint shown while the field is empty.'),
    booleanProp('invalid', 'Invalid', 'Marks the field as invalid.'),
    booleanProp('disabled', 'Disabled', 'Prevents typing and toggling.'),
    widthProp,
  ],
  template: node('password-input', 'PasswordInput', 'Password input', {
    'aria-label': 'Password',
    placeholder: 'Enter your password',
    width: '280px',
  }),
})

// Upstream types the value as `number | null`.
const numberInput = adaptAdvuiMeta(numberInputMeta, {
  extraProps: [
    ariaLabelProp,
    numberProp('defaultValue', 'Default Value', 'Starting number. Empty when omitted.'),
    booleanProp('disabled', 'Disabled', 'Prevents typing and stepping.'),
  ],
  template: node('number-input', 'NumberInput', 'Number input', {
    'aria-label': 'Quantity',
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
    node('alert-description', 'Alert.Description', 'Description', {}, [], 'The last save did not finish. Try again.'),
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
  template: node(
    'toast',
    'Toast',
    'Toast',
    {
      title: 'Changes saved',
      description: 'Your profile is up to date.',
    },
    [],
    'Show toast',
  ),
})

// Upstream types `content` as ReactNode; the builder edits text.
const tooltip = adaptAdvuiMeta(tooltipMeta, {
  extraProps: [
    stringProp('content', 'Content', 'Short supplementary text. Do not put essential information only here.', true),
  ],
  template: node(
    'tooltip',
    'Tooltip',
    'Tooltip',
    {
      content: 'Saves your changes',
      defaultOpen: true,
    },
    [node('tooltip-button', 'Button', 'Button', {}, [], 'Save')],
  ),
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

// Upstream types these as ReactNode; the builder stores an icon name and writes `<Icon name="…" />`.
const iconOptions = iconNames.map((name) => ({ label: name, value: name }))

function iconProp(key: string, label: string, description: string, required?: boolean): PropMetadata {
  return { key, type: 'icon', label, description, group: 'component', options: iconOptions, required }
}

const breadcrumb = adaptAdvuiMeta(breadcrumbMeta, {
  template: node('breadcrumb', 'Breadcrumb', 'Breadcrumb', {}, [
    node('breadcrumb-home', 'Breadcrumb.Item', 'Home', { href: '/' }, [], 'Home'),
    node('breadcrumb-projects', 'Breadcrumb.Item', 'Projects', { href: '/projects' }, [], 'Projects'),
    node('breadcrumb-current', 'Breadcrumb.Item', 'Settings', {}, [], 'Settings'),
  ]),
  item: {
    noun: 'level',
    part: 'Breadcrumb.Item',
    nodes: [{ component: 'Breadcrumb.Item', label: 'Level {n}', text: 'Level {n}' }],
  },
})

const breadcrumbItem = adaptAdvuiMeta(breadcrumbMeta, {
  part: 'Breadcrumb.Item',
  sidebar: false,
  importName: 'Breadcrumb',
  textDefault: 'Home',
})

function accordionSection(id: string, value: string, question: string, answer: string): TemplateNode {
  return node(id, 'Accordion.Item', question, { value }, [
    node(`${id}-trigger`, 'Accordion.Trigger', 'Trigger', {}, [], question),
    node(`${id}-content`, 'Accordion.Content', 'Content', {}, [node(`${id}-text`, 'Text', 'Text', {}, [], answer)]),
  ])
}

const accordion = adaptAdvuiMeta(accordionMeta, {
  extraProps: [widthProp],
  propOverrides: {
    defaultValue: {
      description:
        'The section open at first, by its value. With `multiple`, AdvUI takes a list; leave it empty there.',
    },
  },
  template: node(
    'accordion',
    'Accordion',
    'Accordion',
    {
      type: 'single',
      collapsible: true,
      defaultValue: 'shipping',
      width: '360px',
    },
    [
      accordionSection('accordion-shipping', 'shipping', 'How long does shipping take?', 'Three to five working days.'),
      accordionSection('accordion-returns', 'returns', 'Can I return an order?', 'Yes, within 30 days of delivery.'),
    ],
  ),
  item: {
    noun: 'section',
    part: 'Accordion.Item',
    valuePrefix: 'section',
    nodes: [
      {
        component: 'Accordion.Item',
        label: 'Section {n}',
        props: { value: '{value}' },
        children: [
          { component: 'Accordion.Trigger', label: 'Trigger', text: 'Section {n}' },
          {
            component: 'Accordion.Content',
            label: 'Content',
            children: [{ component: 'Text', label: 'Text', text: 'Section {n} details' }],
          },
        ],
      },
    ],
  },
})

const accordionItem = adaptAdvuiMeta(accordionMeta, {
  part: 'Accordion.Item',
  sidebar: false,
  importName: 'Accordion',
})

const accordionTrigger = adaptAdvuiMeta(accordionMeta, {
  part: 'Accordion.Trigger',
  sidebar: false,
  importName: 'Accordion',
  textDefault: 'Section title',
})

const accordionContent = adaptAdvuiMeta(accordionMeta, {
  part: 'Accordion.Content',
  sidebar: false,
  importName: 'Accordion',
})

// Like Alert Dialog, it opens in the builder so its parts can be selected. Trigger and Close wrap a Button.
const dialog = adaptAdvuiMeta(dialogMeta, {
  template: node('dialog', 'Dialog', 'Dialog', { defaultOpen: true }, [
    node('dialog-trigger', 'Dialog.Trigger', 'Trigger', {}, [
      node('dialog-trigger-button', 'Button', 'Button', {}, [], 'Edit profile'),
    ]),
    node('dialog-content', 'Dialog.Content', 'Content', {}, [
      node('dialog-header', 'Dialog.Header', 'Header', {}, [
        node('dialog-title', 'Dialog.Title', 'Title', {}, [], 'Edit profile'),
        node('dialog-description', 'Dialog.Description', 'Description', {}, [], 'Changes are saved to your account.'),
      ]),
      node('dialog-field', 'Field', 'Name field', { label: 'Name' }, [
        node('dialog-input', 'Input', 'Name', { placeholder: 'Ada Lovelace', width: '100%' }),
      ]),
      node('dialog-footer', 'Dialog.Footer', 'Footer', {}, [
        node('dialog-close', 'Dialog.Close', 'Close', {}, [
          node('dialog-cancel', 'Button', 'Cancel', { variant: 'outline' }, [], 'Cancel'),
        ]),
        node('dialog-save', 'Button', 'Save', {}, [], 'Save'),
      ]),
    ]),
  ]),
})

const dialogPart = (part: string, options: AdaptOptions = {}) =>
  adaptAdvuiMeta(dialogMeta, { part, sidebar: false, importName: 'Dialog', ...options })

const dialogTrigger = dialogPart('Dialog.Trigger', { staticProps: { asChild: true } })
const dialogContent = dialogPart('Dialog.Content')
const dialogHeader = dialogPart('Dialog.Header')
const dialogFooter = dialogPart('Dialog.Footer')
const dialogTitle = dialogPart('Dialog.Title', { textDefault: 'Edit profile' })
const dialogDescription = dialogPart('Dialog.Description', { textDefault: 'Changes are saved to your account.' })
const dialogClose = dialogPart('Dialog.Close', { staticProps: { asChild: true }, omit: ['asChild'] })

// Upstream types the texts as ReactNode; the builder edits them as strings.
const field = adaptAdvuiMeta(fieldMeta, {
  extraProps: [
    stringProp('label', 'Label', 'Names the control inside; the field wires the two together.'),
    stringProp('description', 'Description', 'Help text under the label, read with the control.'),
    stringProp('error', 'Error', 'Shown under the control, which is then marked invalid.'),
  ],
  template: node('field', 'Field', 'Field', { label: 'Email', description: 'We never share it.' }, [
    node('field-input', 'Input', 'Input', { placeholder: 'you@example.com', width: '100%' }),
  ]),
})

// `footer` is a ReactNode slot the builder can't fill; actions go inside the form instead.
const form = adaptAdvuiMeta(formMeta, {
  extraProps: [
    stringProp('title', 'Title', 'A level-2 heading that names the form.'),
    stringProp('description', 'Description', 'Muted text under the title.'),
    stringProp('loadingText', 'Loading Text', 'Replaces the submit label while loading.'),
    gapProp,
    widthProp,
  ],
  template: node(
    'form',
    'Form',
    'Form',
    {
      title: 'Create account',
      description: 'Enter your details.',
      width: '360px',
    },
    [
      node('form-name', 'Field', 'Name field', { label: 'Name' }, [
        node('form-name-input', 'Input', 'Name', { placeholder: 'Ada Lovelace', width: '100%' }),
      ]),
      node('form-email', 'Field', 'Email field', { label: 'Email' }, [
        node('form-email-input', 'Input', 'Email', { placeholder: 'you@example.com', width: '100%' }),
      ]),
      node('form-submit', 'Form.Submit', 'Submit', {}, [], 'Create account'),
    ],
  ),
})

// A Loading Button: it takes the Button props AdvUI's metadata leaves to that page.
const formSubmit = adaptAdvuiMeta(formMeta, {
  part: 'Form.Submit',
  sidebar: false,
  importName: 'Form',
  textDefault: 'Submit',
  extraProps: [
    {
      key: 'variant',
      type: 'select',
      label: 'Variant',
      description: 'Visual style.',
      group: 'component',
      defaultValue: 'default',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'].map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
      })),
    },
    booleanProp('fullWidth', 'Full Width', 'Stretch to the width of the form.'),
  ],
})

const navigationBar = adaptAdvuiMeta(navigationBarMeta, {
  extraProps: [widthProp],
  template: node(
    'navigation-bar',
    'NavigationBar',
    'Navigation bar',
    {
      defaultValue: 'home',
      'aria-label': 'Main',
      width: '360px',
    },
    [
      node('nav-home', 'NavigationBar.Item', 'Home', { value: 'home', icon: 'home', label: 'Home' }),
      node('nav-search', 'NavigationBar.Item', 'Search', { value: 'search', icon: 'search', label: 'Search' }),
      node('nav-inbox', 'NavigationBar.Item', 'Inbox', { value: 'inbox', icon: 'bell', label: 'Inbox', badge: 3 }),
      node('nav-profile', 'NavigationBar.Item', 'Profile', { value: 'profile', icon: 'user', label: 'Profile' }),
    ],
  ),
  item: {
    noun: 'destination',
    part: 'NavigationBar.Item',
    valuePrefix: 'tab',
    nodes: [
      {
        component: 'NavigationBar.Item',
        label: 'Destination {n}',
        props: { value: '{value}', icon: 'circle', label: 'Tab {n}' },
      },
    ],
  },
})

const navigationBarItem = adaptAdvuiMeta(navigationBarMeta, {
  part: 'NavigationBar.Item',
  sidebar: false,
  importName: 'NavigationBar',
  extraProps: [
    iconProp('icon', 'Icon', 'The destination’s icon.', true),
    numberProp('badge', 'Badge', 'A count on the icon (99+ above 99). Empty for none.'),
  ],
})

// Its content area fills the height between header and footer, so on the canvas it needs a height of its own.
const sidebarNav = adaptAdvuiMeta(sidebarMeta, {
  extraProps: [heightProp],
  template: node('sidebar', 'Sidebar', 'Sidebar', { height: '420px' }, [
    node('sidebar-header', 'Sidebar.Header', 'Header', {}, [
      node('sidebar-brand', 'Text', 'Brand', { weight: 'semibold' }, [], 'Acme'),
      node('sidebar-spacer', 'Spacer', 'Spacer'),
      node('sidebar-toggle', 'Sidebar.Toggle', 'Toggle'),
    ]),
    node('sidebar-content', 'Sidebar.Content', 'Content', {}, [
      node('sidebar-group', 'Sidebar.Group', 'Workspace', { label: 'Workspace' }, [
        node('sidebar-dashboard', 'Sidebar.Item', 'Dashboard', { icon: 'home', active: true }, [], 'Dashboard'),
        node('sidebar-projects', 'Sidebar.Item', 'Projects', { icon: 'folder' }, [], 'Projects'),
        node('sidebar-team', 'Sidebar.Item', 'Team', { icon: 'users' }, [], 'Team'),
      ]),
    ]),
    node('sidebar-footer', 'Sidebar.Footer', 'Footer', {}, [
      node('sidebar-settings', 'Sidebar.Item', 'Settings', { icon: 'settings' }, [], 'Settings'),
    ]),
  ]),
})

const sidebarPart = (part: string, options: AdaptOptions = {}) =>
  adaptAdvuiMeta(sidebarMeta, { part, sidebar: false, importName: 'Sidebar', ...options })

const sidebarHeader = sidebarPart('Sidebar.Header')
const sidebarContent = sidebarPart('Sidebar.Content')
const sidebarFooter = sidebarPart('Sidebar.Footer')
const sidebarGroup = sidebarPart('Sidebar.Group', {
  item: {
    noun: 'item',
    part: 'Sidebar.Item',
    nodes: [{ component: 'Sidebar.Item', label: 'Item {n}', props: { icon: 'circle' }, text: 'Item {n}' }],
  },
})
const sidebarItem = sidebarPart('Sidebar.Item', {
  textDefault: 'Dashboard',
  extraProps: [
    iconProp('icon', 'Icon', 'Shown before the label, and alone when the sidebar is collapsed.'),
    stringProp('badge', 'Badge', 'A count or tag after the label.'),
  ],
})
const sidebarToggle = sidebarPart('Sidebar.Toggle')

export const advuiRegistry = createRegistry({
  importSource: '@advui/core',
  icons: { importName: 'Icon', nameProp: 'name' },
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
  // A 12-column Grid row. Like Bootstrap's `col-md-*`, the columns sit side by side from md up and stack on
  // smaller screens.
  columns: (spans) => ({
    component: 'Grid',
    label: `Columns ${spans.join(' ')}`,
    props: { columns: 12 },
    children: spans.map((span, index) => ({
      component: 'Grid.Item',
      label: `Column ${index + 1}`,
      props: { span: span === 12 ? 12 : { base: 12, md: span } },
    })),
  }),
  blocks: advuiBlocks,
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
    form,
    formSubmit,
    field,
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
    accordion,
    accordionItem,
    accordionTrigger,
    accordionContent,
    avatar,
    text,
    badge,
    image,
    tabs,
    tabsList,
    tabsTrigger,
    tabsContent,
    pagination,
    breadcrumb,
    breadcrumbItem,
    navigationBar,
    navigationBarItem,
    sidebarNav,
    sidebarHeader,
    sidebarContent,
    sidebarFooter,
    sidebarGroup,
    sidebarItem,
    sidebarToggle,
    alertDialog,
    alertDialogTrigger,
    alertDialogContent,
    alertDialogHeader,
    alertDialogTitle,
    alertDialogDescription,
    alertDialogFooter,
    alertDialogCancel,
    alertDialogAction,
    dialog,
    dialogTrigger,
    dialogContent,
    dialogHeader,
    dialogFooter,
    dialogTitle,
    dialogDescription,
    dialogClose,
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
    gridItem,
    autoGrid,
    container,
    section,
    sticky,
    show,
    hide,
    aspectRatio,
    scrollArea,
    separator,
  ],
})
