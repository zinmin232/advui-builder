import { advuiRegistry } from '../../registry/componentRegistry'
import { createBuilderReducer, createBuilderState } from '../state/builderState'
import { generateCode } from './codeGenerator'

const builderReducer = createBuilderReducer(advuiRegistry)

describe('code generator', () => {
  it('omits default Button props and keeps children', () => {
    expect(generateCode(advuiRegistry.createDocument('Button'), { registry: advuiRegistry })).toBe(
      "import { Button } from '@advui/core'\n\n<Button>Click Me</Button>\n",
    )
  })

  it('wraps text that JSX would reject or decode in a string expression', () => {
    const withText = (text: string) =>
      generateCode(
        builderReducer(createBuilderState(advuiRegistry, 'Button'), { type: 'set-text', id: 'button', text }).document,
        { registry: advuiRegistry },
      )
    expect(withText('{count} > 1 &amp; more')).toContain('<Button>{"{count} > 1 &amp; more"}</Button>')
    expect(withText('Terms & Conditions')).toContain('<Button>Terms & Conditions</Button>')
  })

  it('emits only the props that differ from metadata defaults', () => {
    const changed = builderReducer(
      builderReducer(createBuilderState(advuiRegistry, 'Button'), {
        type: 'set-prop',
        id: 'button',
        key: 'variant',
        value: 'secondary',
      }),
      { type: 'set-prop', id: 'button', key: 'size', value: 'lg' },
    )
    expect(generateCode(changed.document, { registry: advuiRegistry })).toContain(
      '<Button\n  variant="secondary"\n  size="lg"\n>\n  Click Me\n</Button>',
    )
  })

  it('renders nested Card elements and drops web-only image props on Android', () => {
    let state = createBuilderState(advuiRegistry, 'Card')
    state = builderReducer(state, {
      type: 'set-prop',
      id: 'card-image',
      key: 'loading',
      value: 'lazy',
    })
    const web = generateCode(state.document, { registry: advuiRegistry, platform: 'web' })
    expect(web).toContain('<Card.Footer>')
    expect(web).toContain('<Button>Continue</Button>')
    expect(web).toContain('loading="lazy"')
    expect(web).toContain('src="/preview-photo.svg"')
    const android = generateCode(state.document, { registry: advuiRegistry, platform: 'android' })
    expect(android).not.toContain('loading=')
    expect(android).toContain('src="/preview-photo.svg"')
  })

  it('includes a component inserted into the selected layer', () => {
    const inserted = builderReducer(createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-content' }), {
      type: 'insert',
      component: 'Text',
    })
    const code = generateCode(inserted.document, { registry: advuiRegistry })
    expect(code).toContain("import { Button, Card, Image, Text } from '@advui/core'")
    expect(code).toContain('The quick brown fox jumps over the lazy dog.')
    expect(code).toContain('<Button>Continue</Button>')
  })

  it('drops a removed component from the snippet', () => {
    const removed = builderReducer(createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' }), {
      type: 'remove',
    })
    const code = generateCode(removed.document, { registry: advuiRegistry })
    expect(code).not.toContain('Continue')
    expect(code).toContain('<Card.Footer />')
  })

  it('emits siblings in their moved order', () => {
    const moved = builderReducer(createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-footer' }), {
      type: 'move',
      direction: 'up',
    })
    const code = generateCode(moved.document, { registry: advuiRegistry })
    expect(code.indexOf('<Card.Footer>')).toBeLessThan(code.indexOf('<Card.Content>'))
    expect(code.indexOf('<Card.Header>')).toBeLessThan(code.indexOf('<Card.Footer>'))
  })

  it('writes a page as an exported component, with document metadata on web only', () => {
    const page = builderReducer(createBuilderState(advuiRegistry, 'Button', { mode: 'page' }), {
      type: 'open',
      component: 'Badge',
    }).document
    expect(generateCode(page, { registry: advuiRegistry, file: { name: 'HomePage' } })).toBe(
      [
        "import { Badge, Stack } from '@advui/core'",
        '',
        'export function HomePage() {',
        '  return (',
        '    <Stack',
        '      gap={16}',
        '      padding={24}',
        '    >',
        '      <Badge>Badge</Badge>',
        '    </Stack>',
        '  )',
        '}',
        '',
      ].join('\n'),
    )

    const file = { name: 'HomePage', title: 'Home {beta}', description: 'Plans & "pricing"' }
    const web = generateCode(page, { registry: advuiRegistry, file })
    expect(web).toContain(
      [
        '  return (',
        '    <>',
        '      <title>{"Home {beta}"}</title>',
        '      <meta name="description" content="Plans &amp; &quot;pricing&quot;" />',
        '      <Stack',
      ].join('\n'),
    )
    expect(web).toContain('        <Badge>Badge</Badge>\n      </Stack>\n    </>\n  )\n}\n')
    const ios = generateCode(page, { registry: advuiRegistry, platform: 'ios', file })
    expect(ios).not.toContain('<title>')
    expect(ios).not.toContain('<>')
  })
})
