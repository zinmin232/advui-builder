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
    n('HStack', 'Links', { gap: 4 }, links.map((link) => n('Button', link, { variant: 'ghost' }, link))),
  ]),
  n('Spacer', 'Spacer'),
  n('Show', 'Phone menu', { below: 'md' }, [
    n('DropdownMenu', 'Menu', {}, [
      n('DropdownMenu.Trigger', 'Trigger', {}, [n('Button', 'Menu button', { variant: 'outline' }, 'Menu')]),
      n('DropdownMenu.Content', 'Content', {}, links.map((link) => n('DropdownMenu.Item', link, {}, link))),
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
      n('Button', 'Choose plan', featured ? { fullWidth: true } : { fullWidth: true, variant: 'outline' }, `Choose ${name}`),
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
const login = n('Grid', 'Login', { columns: 12 }, [
  n('Grid.Item', 'Form column', { span: { base: 12, md: 6, lg: 4 }, offset: { md: 3, lg: 4 } }, [
    n('Card', 'Sign-in card', {}, [
      n('Card.Header', 'Header', {}, [
        n('Card.Title', 'Title', {}, 'Sign in'),
        n('Card.Description', 'Description', {}, 'Welcome back. Enter your details to continue.'),
      ]),
      n('Card.Content', 'Content', { gap: 12 }, [
        n('VStack', 'Email field', { gap: 6 }, [
          n('Label', 'Email label', {}, 'Email'),
          n('Input', 'Email', { placeholder: 'you@example.com', width: '100%' }),
        ]),
        n('VStack', 'Password field', { gap: 6 }, [
          n('Label', 'Password label', {}, 'Password'),
          n('PasswordInput', 'Password', { placeholder: 'Enter your password', width: '100%' }),
        ]),
      ]),
      n('Card.Footer', 'Footer', { gap: 8 }, [
        n('Button', 'Sign in', { fullWidth: true }, 'Sign in'),
      ]),
    ]),
  ]),
])

// Brand and links in a row from md, stacked on phones.
const footer = n('VStack', 'Footer', { gap: 16, padding: 24, width: '100%' }, [
  n('Separator', 'Separator', { width: '100%' }),
  n('HStack', 'Row', { gap: 12, width: '100%', direction: { base: 'column', md: 'row' }, align: { base: 'start', md: 'center' } }, [
    n('Text', 'Brand', { weight: 'semibold' }, 'Acme'),
    n('Spacer', 'Spacer'),
    n('HStack', 'Links', { gap: 4, wrap: 'wrap' }, ['Privacy', 'Terms', 'Contact'].map((link) =>
      n('Button', link, { variant: 'link', size: 'sm' }, link),
    )),
  ]),
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
    id: 'login',
    name: 'Login',
    description: 'A sign-in card with email and password, centered from md.',
    keywords: ['sign in', 'auth', 'form', 'password'],
    template: login,
  },
  {
    id: 'footer',
    name: 'Footer',
    description: 'Brand, links and a copyright line. Stacks on phones.',
    keywords: ['bottom', 'links', 'copyright'],
    template: footer,
  },
]
