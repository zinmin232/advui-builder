import type { TemplateNode } from './metadata'
import type { BlockDefinition } from './registry'

/** A template node. Ids are left out: every inserted copy gets fresh ones. */
function n(
  component: string,
  label: string,
  props: Record<string, unknown> = {},
  content: TemplateNode[] | string = [],
): TemplateNode {
  return typeof content === 'string'
    ? { component, label, props, text: content }
    : { component, label, props, children: content }
}

const links = ['Features', 'Pricing', 'About']

// Links sit in the bar from md up; on phones they move into a menu.
const navbar = n('HStack', 'Navbar', { gap: 12, padding: 16, width: '100%', backgroundColor: '$background' }, [
  n('Text', 'Brand', { size: 'lg', weight: 'bold' }, 'Acme'),
  n('Show', 'Desktop links', { above: 'md' }, [
    n(
      'HStack',
      'Links',
      { gap: 4 },
      links.map((link) => n('Button', link, { variant: 'ghost' }, link)),
    ),
  ]),
  n('Spacer', 'Spacer'),
  n('Show', 'Phone menu', { below: 'md' }, [
    n('DropdownMenu', 'Menu', {}, [
      n('DropdownMenu.Trigger', 'Trigger', {}, [n('Button', 'Menu button', { variant: 'outline' }, 'Menu')]),
      n(
        'DropdownMenu.Content',
        'Content',
        {},
        links.map((link) => n('DropdownMenu.Item', link, {}, link)),
      ),
    ]),
  ]),
  n('Button', 'Sign in', {}, 'Sign in'),
])

const hero = n('Section', 'Hero', { spacing: 'xl' }, [
  n('VStack', 'Content', { gap: 16, align: 'center' }, [
    // Badge aligns itself to the start, so the stack's `align` alone leaves it on the left.
    n('Center', 'Badge row', {}, [n('Badge', 'Badge', { variant: 'secondary' }, 'New release')]),
    n('Text', 'Headline', { size: '5xl', weight: 'bold', textAlign: 'center' }, 'Build pages in minutes'),
    n(
      'Text',
      'Subheading',
      { size: 'lg', tone: 'muted', textAlign: 'center' },
      'Compose real components, see every breakpoint, and copy code your team can ship.',
    ),
    n('HStack', 'Actions', { gap: 12, wrap: 'wrap', distribute: 'center' }, [
      n('Button', 'Primary action', { size: 'lg' }, 'Get started'),
      n('Button', 'Secondary action', { size: 'lg', variant: 'outline' }, 'Learn more'),
    ]),
  ]),
])

function plan(name: string, price: string, summary: string, features: string[], featured = false): TemplateNode {
  return n('Card', `${name} plan`, featured ? { variant: 'elevated' } : {}, [
    n('Card.Header', 'Header', {}, [
      n('Card.Title', 'Title', {}, name),
      n('Card.Description', 'Description', {}, summary),
    ]),
    n('Card.Content', 'Content', { gap: 8 }, [
      n('Text', 'Price', { size: '3xl', weight: 'bold' }, price),
      ...features.map((feature) => n('Text', 'Feature', { tone: 'muted' }, `✓ ${feature}`)),
    ]),
    n('Card.Footer', 'Footer', {}, [
      n(
        'Button',
        'Choose plan',
        featured ? { fullWidth: true } : { fullWidth: true, variant: 'outline' },
        `Choose ${name}`,
      ),
    ]),
  ])
}

// One plan per row on phones, three side by side from md.
const pricing = n('Section', 'Pricing', { spacing: 'lg' }, [
  n('VStack', 'Content', { gap: 24 }, [
    n('VStack', 'Heading', { gap: 8, align: 'center' }, [
      n('Text', 'Title', { size: '3xl', weight: 'bold', textAlign: 'center' }, 'Pricing'),
      n('Text', 'Subtitle', { tone: 'muted', textAlign: 'center' }, 'Start free and upgrade when your team grows.'),
    ]),
    n('Grid', 'Plans', { columns: { base: 1, md: 3 }, gap: '$4' }, [
      plan('Free', '$0', 'For trying things out.', ['1 project', 'Community support']),
      plan('Pro', '$12', 'For individuals who ship.', ['Unlimited projects', 'Email support', 'Custom domains'], true),
      plan('Team', '$49', 'For growing teams.', ['Everything in Pro', 'Shared workspaces', 'Priority support']),
    ]),
  ]),
])

// A centered column: the whole row on phones, half from md, a third from lg.
// Fields name their controls from their labels, so the inputs carry no aria-label of their own.
const login = n('Grid', 'Login', { columns: 12 }, [
  n('Grid.Item', 'Form column', { span: { base: 12, md: 6, lg: 4 }, offset: { md: 3, lg: 4 } }, [
    n('Card', 'Sign-in card', {}, [
      n('Card.Content', 'Content', {}, [
        n(
          'Form',
          'Sign-in form',
          {
            title: 'Sign in',
            description: 'Welcome back. Enter your details to continue.',
            fullWidth: true,
          },
          [
            n('Field', 'Email field', { label: 'Email' }, [
              n('Input', 'Email', { placeholder: 'you@example.com', width: '100%' }),
            ]),
            n('Field', 'Password field', { label: 'Password' }, [
              n('PasswordInput', 'Password', { placeholder: 'Enter your password', width: '100%' }),
            ]),
            n('Form.Submit', 'Submit', { fullWidth: true }, 'Sign in'),
          ],
        ),
      ]),
    ]),
  ]),
])

function question(value: string, title: string, answer: string): TemplateNode {
  return n('Accordion.Item', title, { value }, [
    n('Accordion.Trigger', 'Question', {}, title),
    n('Accordion.Content', 'Answer', {}, [n('Text', 'Answer', { tone: 'muted' }, answer)]),
  ])
}

const faq = n('Section', 'FAQ', { spacing: 'lg' }, [
  n('VStack', 'Content', { gap: 24 }, [
    n('VStack', 'Heading', { gap: 8, align: 'center' }, [
      n('Text', 'Title', { size: '3xl', weight: 'bold', textAlign: 'center' }, 'Frequently asked questions'),
      n('Text', 'Subtitle', { tone: 'muted', textAlign: 'center' }, 'Everything you need to know before you start.'),
    ]),
    n('Accordion', 'Questions', { type: 'single', collapsible: true, defaultValue: 'trial', variant: 'card' }, [
      question('trial', 'Is there a free trial?', 'Yes. Every plan starts with 14 days free, no card needed.'),
      question('cancel', 'Can I cancel at any time?', 'Yes. Your plan stays active until the end of the period.'),
      question('team', 'Can I invite my team?', 'Pro and Team plans include shared workspaces for everyone.'),
      question('support', 'How do I get help?', 'Email us any time; Team plans also get priority support.'),
    ]),
  ]),
])

// A centered form column, like Login, wider from md.
const contact = n('Section', 'Contact', { spacing: 'lg' }, [
  n('Grid', 'Layout', { columns: 12 }, [
    n('Grid.Item', 'Form column', { span: { base: 12, md: 8, lg: 6 }, offset: { md: 2, lg: 3 } }, [
      n(
        'Form',
        'Contact form',
        {
          title: 'Contact us',
          description: 'We reply within one working day.',
          fullWidth: true,
        },
        [
          n('Field', 'Name field', { label: 'Name' }, [
            n('Input', 'Name', { placeholder: 'Ada Lovelace', width: '100%' }),
          ]),
          n('Field', 'Email field', { label: 'Email' }, [
            n('Input', 'Email', { placeholder: 'you@example.com', width: '100%' }),
          ]),
          n('Field', 'Message field', { label: 'Message' }, [
            n('Textarea', 'Message', { placeholder: 'How can we help?', rows: 5, width: '100%' }),
          ]),
          n('Form.Submit', 'Submit', {}, 'Send message'),
        ],
      ),
    ]),
  ]),
])

const destinations = [
  { value: 'overview', label: 'Overview', icon: 'home' },
  { value: 'projects', label: 'Projects', icon: 'folder' },
  { value: 'team', label: 'Team', icon: 'users' },
  { value: 'reports', label: 'Reports', icon: 'bar-chart' },
]

function stat(label: string, value: string, change: string): TemplateNode {
  return n('Card', `${label} card`, {}, [
    n('Card.Header', 'Header', {}, [
      n('Card.Description', 'Label', {}, label),
      n('Card.Title', 'Value', { size: '2xl', weight: 'bold' }, value),
      n('Text', 'Change', { size: 'sm', tone: 'success' }, change),
    ]),
  ])
}

// The side navigation from md up; on phones the same destinations move to a bottom navigation bar.
const dashboard = n('VStack', 'Dashboard', { gap: 0, width: '100%' }, [
  n('HStack', 'Body', { gap: 0, align: 'stretch', width: '100%' }, [
    n('Show', 'Desktop navigation', { above: 'md' }, [
      n('Sidebar', 'Sidebar', { height: '560px' }, [
        n('Sidebar.Header', 'Header', {}, [
          n('Text', 'Brand', { weight: 'semibold' }, 'Acme'),
          n('Spacer', 'Spacer'),
          n('Sidebar.Toggle', 'Toggle'),
        ]),
        n('Sidebar.Content', 'Content', {}, [
          n(
            'Sidebar.Group',
            'Workspace',
            { label: 'Workspace' },
            destinations.map((item, index) =>
              n(
                'Sidebar.Item',
                item.label,
                index === 0 ? { icon: item.icon, active: true } : { icon: item.icon },
                item.label,
              ),
            ),
          ),
        ]),
        n('Sidebar.Footer', 'Footer', {}, [n('Sidebar.Item', 'Settings', { icon: 'settings' }, 'Settings')]),
      ]),
    ]),
    n('VStack', 'Main', { gap: 16, padding: 24, flex: 1 }, [
      n('Breadcrumb', 'Breadcrumb', {}, [
        n('Breadcrumb.Item', 'Home', { href: '/' }, 'Home'),
        n('Breadcrumb.Item', 'Overview', {}, 'Overview'),
      ]),
      n('Text', 'Title', { size: '2xl', weight: 'bold' }, 'Overview'),
      n('Grid', 'Stats', { columns: { base: 1, sm: 2, lg: 3 }, gap: '$4' }, [
        stat('Revenue', '$48,200', '+12% this month'),
        stat('Active users', '2,340', '+4% this month'),
        stat('Open projects', '18', '+3 this week'),
      ]),
      n('List', 'Activity', { variant: 'outline', divided: true }, [
        n('List.Item', 'Deploy', { title: 'Atlas deployed', description: '2 minutes ago' }),
        n('List.Item', 'Invite', { title: 'Grace joined the team', description: '1 hour ago' }),
        n('List.Item', 'Report', { title: 'Monthly report ready', description: 'Yesterday' }),
      ]),
    ]),
  ]),
  n('Show', 'Phone navigation', { below: 'md' }, [
    n(
      'NavigationBar',
      'Bottom navigation',
      { defaultValue: 'overview', 'aria-label': 'Main', width: '100%' },
      destinations.map((item) => n('NavigationBar.Item', item.label, item)),
    ),
  ]),
])

// Brand and links in a row from md, stacked on phones.
const footer = n('VStack', 'Footer', { gap: 16, padding: 24, width: '100%' }, [
  n('Separator', 'Separator', { width: '100%' }),
  n(
    'HStack',
    'Row',
    { gap: 12, width: '100%', direction: { base: 'column', md: 'row' }, align: { base: 'start', md: 'center' } },
    [
      n('Text', 'Brand', { weight: 'semibold' }, 'Acme'),
      n('Spacer', 'Spacer'),
      n(
        'HStack',
        'Links',
        { gap: 4, wrap: 'wrap' },
        ['Privacy', 'Terms', 'Contact'].map((link) => n('Button', link, { variant: 'link', size: 'sm' }, link)),
      ),
    ],
  ),
  n('Text', 'Copyright', { size: 'sm', tone: 'muted' }, '© 2026 Acme, Inc. All rights reserved.'),
])

/** Ready-made page parts built from registered AdvUI components. Sidebar order follows this list. */
export const advuiBlocks: BlockDefinition[] = [
  {
    id: 'navbar',
    name: 'Navbar',
    description: 'Brand, links and a sign-in button. Links fold into a menu on phones.',
    keywords: ['header', 'navigation', 'menu', 'top bar'],
    template: navbar,
  },
  {
    id: 'hero',
    name: 'Hero',
    description: 'A centered headline with a badge, a subheading and two actions.',
    keywords: ['banner', 'headline', 'landing', 'intro'],
    template: hero,
  },
  {
    id: 'pricing',
    name: 'Pricing',
    description: 'Three plan cards side by side from md, stacked on phones.',
    keywords: ['plans', 'tiers', 'cards'],
    template: pricing,
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'A heading over questions that open one at a time.',
    keywords: ['questions', 'accordion', 'help', 'support'],
    template: faq,
  },
  {
    id: 'contact',
    name: 'Contact',
    description: 'A contact form with name, email and message, centered from md.',
    keywords: ['form', 'message', 'email', 'support'],
    template: contact,
  },
  {
    id: 'login',
    name: 'Login',
    description: 'A sign-in form with email and password, centered from md.',
    keywords: ['sign in', 'auth', 'form', 'password'],
    template: login,
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Side navigation, a breadcrumb, stat cards and recent activity. Bottom tabs on phones.',
    keywords: ['app', 'admin', 'sidebar', 'stats', 'navigation'],
    template: dashboard,
  },
  {
    id: 'footer',
    name: 'Footer',
    description: 'Brand, links and a copyright line. Stacks on phones.',
    keywords: ['bottom', 'links', 'copyright'],
    template: footer,
  },
]
