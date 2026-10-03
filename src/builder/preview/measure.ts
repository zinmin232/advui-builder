export type LayoutAxis = 'vertical' | 'horizontal'

/**
 * The element that draws a node. Its selection wrapper uses `display: contents` and has no box,
 * so this is the first element the component renders inside it.
 */
export function nodeElement(scope: ParentNode, id: string): HTMLElement | null {
  const host = scope.querySelector(`[data-builder-id="${CSS.escape(id)}"]`)
  if (!(host instanceof HTMLElement)) return null
  if (host.getBoundingClientRect().width > 0) return host
  const first = host.firstElementChild
  return first instanceof HTMLElement ? first : null
}

/** The nearest ancestor that takes part in layout (selection wrappers are skipped). */
function layoutParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement
  return parent
}

/** Whether siblings of `element` flow left to right (a row) or top to bottom. */
export function layoutAxis(element: HTMLElement): LayoutAxis {
  const parent = layoutParent(element)
  if (!parent) return 'vertical'
  const style = getComputedStyle(parent)
  const flex = style.display === 'flex' || style.display === 'inline-flex'
  return flex && style.flexDirection.startsWith('row') ? 'horizontal' : 'vertical'
}

/** The element itself or the nearest ancestor that scrolls vertically, for auto-scrolling while dragging. */
export function scrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element
  while (current) {
    const overflow = getComputedStyle(current).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && current.scrollHeight > current.clientHeight) return current
    current = current.parentElement
  }
  return null
}
