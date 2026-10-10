import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { useBuilderActions } from '../state/BuilderProvider'
import { nodeElement } from './measure'

const fontKeys = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
] as const

/** The element that holds the layer's text (a Button draws it in an inner span), for its font. */
function textElement(element: HTMLElement): HTMLElement {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text.textContent?.trim() && text.parentElement) return text.parentElement
  }
  return element
}

/**
 * Edits a layer's text where it sits on the canvas, in the layer's own font. Enter or leaving the field saves
 * (Shift+Enter adds a line); Escape cancels. The library's component is never edited directly.
 */
export function TextEditor({
  container,
  node,
  onDone,
}: {
  container: HTMLElement | null
  node: ConfigNode
  onDone: () => void
}) {
  const actions = useBuilderActions()
  const ref = useRef<HTMLTextAreaElement>(null)
  const finished = useRef(false)
  const [value, setValue] = useState(node.text ?? '')
  const [font, setFont] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    const element = container ? nodeElement(container, node.id) : null
    if (element) {
      const style = getComputedStyle(textElement(element))
      // The layer's font can only be read once the layer is on the page, before the editor paints.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFont(Object.fromEntries(fontKeys.map((key) => [key, style[key]])))
    }
    ref.current?.focus()
    ref.current?.select()
  }, [container, node.id])

  useLayoutEffect(() => {
    const field = ref.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }, [value, font])

  const finish = (save: boolean) => {
    if (finished.current) return
    finished.current = true
    if (save && value !== (node.text ?? '')) actions.setText(node.id, value)
    onDone()
  }

  return (
    <textarea
      ref={ref}
      className="text-editor"
      aria-label={`Edit ${node.label} text`}
      value={value}
      rows={1}
      style={font}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(false)
        } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault()
          finish(true)
        }
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    />
  )
}
