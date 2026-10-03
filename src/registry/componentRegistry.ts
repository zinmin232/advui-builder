import { adaptAdvuiMeta } from './adaptMeta'
import type { PropMetadata, TemplateNode } from './metadata'
import { createRegistry } from './registry'
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
  acceptsChildren: true,
})

const cardHeader = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Header',
  sidebar: false,
  importName: 'Card',
  extraProps: [gapProp, paddingProp, backgroundProp],
  acceptsChildren: true,
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
  acceptsChildren: true,
})

const cardFooter = adaptAdvuiMeta(cardMeta, {
  part: 'Card.Footer',
  sidebar: false,
  importName: 'Card',
  extraProps: [gapProp, paddingProp],
  acceptsChildren: true,
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
  acceptsChildren: true,
})

const container = adaptAdvuiMeta(containerMeta, {
  extraProps: [paddingProp],
  template: node('container', 'Container', 'Container', {}, [
    node('container-text', 'Text', 'Text', {}, [], 'Page content sits inside the container.'),
  ]),
  acceptsChildren: true,
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
  template: node('grid', 'Grid', 'Grid', { columns: 2 }, [
    node('grid-one', 'Text', 'Text', {}, [], 'One'),
    node('grid-two', 'Text', 'Text', {}, [], 'Two'),
    node('grid-three', 'Badge', 'Badge', {}, [], 'Three'),
    node('grid-four', 'Button', 'Button', {}, [], 'Four'),
  ]),
  acceptsChildren: true,
})

const scrollArea = adaptAdvuiMeta(scrollAreaMeta, {
  extraProps: [heightProp, widthProp],
  template: node('scroll-area', 'ScrollArea', 'Scroll Area', { height: '120px', 'aria-label': 'Notes' }, [
    node('scroll-one', 'Text', 'Text', {}, [], 'First note. Add components here to fill the scrolling area.'),
    node('scroll-two', 'Text', 'Text', {}, [], 'Second note stays inside the fixed height.'),
    node('scroll-three', 'Text', 'Text', {}, [], 'Third note is reached by scrolling.'),
    node('scroll-four', 'Text', 'Text', {}, [], 'Fourth note sits below the fold.'),
    node('scroll-five', 'Text', 'Text', {}, [], 'Fifth note keeps the list long enough to scroll.'),
    node('scroll-six', 'Button', 'Button', {}, [], 'Action'),
  ]),
  acceptsChildren: true,
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
  template: node('stack', 'Stack', 'Stack', { gap: 12 }, [
    node('stack-text', 'Text', 'Text', {}, [], 'First'),
    node('stack-button', 'Button', 'Button', {}, [], 'Second'),
  ]),
  acceptsChildren: true,
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
  acceptsChildren: true,
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
  acceptsChildren: true,
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
  acceptsChildren: true,
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
})

const alertDialogContent = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Content',
  sidebar: false,
  importName: 'AlertDialog',
  acceptsChildren: true,
})

const alertDialogHeader = adaptAdvuiMeta(alertDialogMeta, {
  part: 'AlertDialog.Header',
  sidebar: false,
  importName: 'AlertDialog',
  acceptsChildren: true,
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
  acceptsChildren: true,
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
  acceptsChildren: true,
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
    grid,
    container,
    aspectRatio,
    scrollArea,
    separator,
  ],
})
