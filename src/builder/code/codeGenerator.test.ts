import { createDocument } from '../../registry/componentRegistry'
import { builderReducer, createBuilderState } from '../state/builderState'
import { generateCode } from './codeGenerator'

describe('code generator', () => {
  it('omits default Button props and keeps children', () => {
    expect(generateCode(createDocument('Button'))).toBe(
      "import { Button } from '@advui/core'\n\n<Button>Click Me</Button>\n",
    )
  })

  it('wraps text that JSX would reject or decode in a string expression', () => {
    const withText = (text: string) =>
      generateCode(builderReducer(createBuilderState('Button'), { type: 'set-text', id: 'button', text }).document)
    expect(withText('{count} > 1 &amp; more')).toContain('<Button>{"{count} > 1 &amp; more"}</Button>')
    expect(withText('Terms & Conditions')).toContain('<Button>Terms & Conditions</Button>')
  })

  it('emits only the props that differ from metadata defaults', () => {
    const changed = builderReducer(
      builderReducer(createBuilderState('Button'), {
        type: 'set-prop',
        id: 'button',
        key: 'variant',
        value: 'secondary',
      }),
      { type: 'set-prop', id: 'button', key: 'size', value: 'lg' },
    )
    expect(generateCode(changed.document)).toContain('<Button\n  variant="secondary"\n  size="lg"\n>\n  Click Me\n</Button>')
  })

  it('renders nested Card elements and drops web-only image props on Android', () => {
    let state = createBuilderState('Card')
    state = builderReducer(state, {
      type: 'set-prop',
      id: 'card-image',
      key: 'loading',
      value: 'lazy',
    })
    const web = generateCode(state.document, 'web')
    expect(web).toContain('<Card.Footer>')
    expect(web).toContain('<Button>Continue</Button>')
    expect(web).toContain('loading="lazy"')
    expect(web).toContain('src="/preview-photo.svg"')
    const android = generateCode(state.document, 'android')
    expect(android).not.toContain('loading=')
    expect(android).toContain('src="/preview-photo.svg"')
  })

  it('includes a component inserted into the selected layer', () => {
    const inserted = builderReducer(
      createBuilderState('Card', { selectedId: 'card-content' }),
      { type: 'insert', component: 'Text' },
    )
    const code = generateCode(inserted.document)
    expect(code).toContain("import { Button, Card, Image, Text } from '@advui/core'")
    expect(code).toContain('The quick brown fox jumps over the lazy dog.')
    expect(code).toContain('<Button>Continue</Button>')
  })

  it('drops a removed component from the snippet', () => {
    const removed = builderReducer(createBuilderState('Card', { selectedId: 'card-button' }), { type: 'remove' })
    const code = generateCode(removed.document)
    expect(code).not.toContain('Continue')
    expect(code).toContain('<Card.Footer />')
  })

  it('emits siblings in their moved order', () => {
    const moved = builderReducer(createBuilderState('Card', { selectedId: 'card-footer' }), {
      type: 'move',
      direction: 'up',
    })
    const code = generateCode(moved.document)
    expect(code.indexOf('<Card.Footer>')).toBeLessThan(code.indexOf('<Card.Content>'))
    expect(code.indexOf('<Card.Header>')).toBeLessThan(code.indexOf('<Card.Footer>'))
  })
})
