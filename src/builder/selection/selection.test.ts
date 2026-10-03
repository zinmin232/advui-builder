import { createDocument } from '../../registry/componentRegistry'
import type { ConfigNode } from '../../registry/metadata'
import { duplicateNode, findPath, mapTree, placeNode, selectionFrom } from './selection'

describe('selection', () => {
  const card = createDocument('Card')

  it('builds the Card > Footer > Button path from a nested id', () => {
    const selection = selectionFrom(card, 'card-button')
    expect(selection).toMatchObject({
      component: 'Card',
      element: 'Button',
      path: ['Card', 'Footer', 'Button'],
      ids: ['card', 'card-footer', 'card-button'],
    })
  })

  it('builds the Card > Content > Image path', () => {
    expect(findPath(card, 'card-image')?.map((node) => node.label)).toEqual(['Card', 'Content', 'Image'])
  })

  it('updates only the targeted node', () => {
    const next = mapTree(card, 'card-button', (node) => ({
      ...node,
      props: { variant: 'secondary' },
    }))
    expect(next).not.toBe(card)
    expect(next.children[0]).toBe(card.children[0])
    expect(selectionFrom(next, 'card-button')?.props).toEqual({ variant: 'secondary' })
    expect(selectionFrom(next, 'card-image')?.props.src).toBe('/preview-photo.svg')
  })

  it('copies a nested layer beside the original, including its children', () => {
    const edited = mapTree(card, 'card-button', (node) => ({
      ...node,
      props: { variant: 'secondary' },
      text: 'Go',
    }))
    const copied = duplicateNode(edited, 'card-button')
    const footer = copied?.tree.children.find((child) => child.id === 'card-footer')
    expect(footer?.children.map((child) => child.id)).toEqual(['card-button', 'button'])
    expect(footer?.children[1]).toMatchObject({ text: 'Go', props: { variant: 'secondary' } })
    expect(footer?.children[0].text).toBe('Go')

    const header = duplicateNode(copied!.tree, 'card-header')
    const headers = header?.tree.children.filter((child) => child.component === 'Card.Header')
    expect(headers?.map((child) => child.id)).toEqual(['card-header', 'card-header-2'])
    expect(headers?.[1].children.map((child) => child.id)).toEqual(['card-title-2', 'card-description-2'])
    const ids = collect(header!.tree)
    expect(new Set(ids).size).toBe(ids.length)
    expect(duplicateNode(card, card.id)).toBeNull()
  })

  it('reorders a sibling and moves a layer into another container', () => {
    const reordered = placeNode(card, 'card-footer', 'card-header', 'before')
    expect(reordered?.children.map((child) => child.id)).toEqual(['card-footer', 'card-header', 'card-content'])
    expect(reordered?.children[0].children.map((child) => child.id)).toEqual(['card-button'])

    const moved = placeNode(card, 'card-button', 'card-content', 'inside')
    const content = moved?.children.find((child) => child.id === 'card-content')
    const footer = moved?.children.find((child) => child.id === 'card-footer')
    expect(content?.children.map((child) => child.id)).toEqual(['card-image', 'card-button'])
    expect(footer?.children).toEqual([])
    expect(content?.children[1].text).toBe('Continue')

    expect(placeNode(card, 'card-content', 'card-footer', 'before')).toBeNull()
    expect(placeNode(card, 'card-header', 'card-title', 'inside')).toBeNull()
    expect(placeNode(card, card.id, 'card-content', 'inside')).toBeNull()
  })
})

function collect(node: ConfigNode): string[] {
  return [node.id, ...node.children.flatMap((child) => collect(child))]
}
