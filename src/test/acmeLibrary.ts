import type { ComponentMetadata } from '../registry/metadata'
import type { RegistryDefinition } from '../registry/registry'

export function meta(name: string, extra: Partial<ComponentMetadata> = {}): ComponentMetadata {
  return {
    name,
    slug: name.toLowerCase().replace(/\./g, '-'),
    category: 'Basics',
    categoryId: 'basics',
    description: `${name} component`,
    keywords: [],
    sidebar: !name.includes('.'),
    importName: name.split('.')[0],
    jsxTag: name,
    props: [],
    platforms: { web: { supported: true }, android: { supported: true }, ios: { supported: true } },
    examples: [],
    ...extra,
  }
}

/** A small library that is not AdvUI: the Builder must work from its metadata alone. */
export const acmeLibrary: RegistryDefinition = {
  importSource: '@acme/ui',
  components: [
    meta('Panel', {
      acceptsChildren: true,
      template: { id: 'panel', component: 'Panel', children: [{ component: 'Tag', text: 'Hello' }] },
    }),
    meta('Tag', { defaultText: 'Tag' }),
    meta('Menu', {
      template: { id: 'menu', component: 'Menu', children: [{ id: 'menu-title', component: 'Tag', text: 'Actions' }] },
      item: {
        noun: 'entry',
        part: 'Menu.Entry',
        valuePrefix: 'entry',
        nodes: [
          {
            component: 'Menu.Entry',
            into: 'Menu.Group',
            label: 'Entry {n}',
            props: { value: '{value}' },
            text: 'Entry {n}',
          },
          { component: 'Tag', props: { for: '{host}-{value}' }, text: '#{n}' },
        ],
      },
    }),
    meta('Menu.Group', { acceptsChildren: true }),
    meta('Menu.Entry', { props: [{ key: 'value', type: 'string', label: 'Value', group: 'component' }] }),
  ],
}
