import { advuiRegistry } from '../../registry/componentRegistry'
import { createBuilderReducer, createBuilderState } from '../state/builderState'
import { compactTree, readTree } from '../shareConfig'
import {
  addPage,
  configurePage,
  loadPageDocument,
  loadPageIndex,
  removePage,
  removePageDocument,
  renamePage,
  sanitizePageIndex,
  savePageDocument,
  savePageIndex,
  touchPage,
  untitledName,
  type PageIndex,
} from './pageStore'

const builderReducer = createBuilderReducer(advuiRegistry)

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
}

describe('page store', () => {
  it('keeps well-formed pages, tidies names, and falls back to the most recent page', () => {
    const index = sanitizePageIndex({
      current: 'missing',
      pages: [
        { id: 'page-a', name: '  Home   page ', updatedAt: 10 },
        { id: 'page-b', name: '', updatedAt: 30 },
        { id: 'page-a', name: 'Duplicate', updatedAt: 99 },
        { id: '../evil', name: 'Bad id', updatedAt: 1 },
        'nope',
      ],
    })
    expect(index).toEqual({
      current: 'page-b',
      pages: [
        { id: 'page-a', name: 'Home page', updatedAt: 10 },
        { id: 'page-b', name: 'Untitled page', updatedAt: 30 },
      ],
    })
    expect(sanitizePageIndex(null)).toEqual({ current: null, pages: [] })
    const storage = memory()
    storage.setItem('advui-builder.pages.v1', '{')
    expect(loadPageIndex(storage)).toEqual({ current: null, pages: [] })
    expect(loadPageIndex(null)).toEqual({ current: null, pages: [] })
  })

  it('round-trips a page with responsive props, text and labels', () => {
    let state = createBuilderState(advuiRegistry, 'Button', { mode: 'page' })
    state = builderReducer(state, { type: 'insert-columns', spans: [8, 4] })
    state = builderReducer(state, { type: 'select', id: 'page' })
    state = builderReducer(state, { type: 'open', component: 'Card' })
    state = builderReducer(state, { type: 'set-text', id: 'button', text: 'Buy now' })
    const storage = memory()
    expect(savePageDocument(storage, 'page-a', state.document)).toBe(true)
    const loaded = loadPageDocument(advuiRegistry, storage, 'page-a')
    expect(loaded).toEqual(state.document)
    expect(loaded?.children[0].children[0].props.span).toEqual({ base: 12, md: 8 })

    removePageDocument(storage, 'page-a')
    expect(loadPageDocument(advuiRegistry, storage, 'page-a')).toBeNull()
  })

  it('drops layers this version cannot show and keeps the rest of the page', () => {
    const storage = memory()
    storage.setItem(
      'advui-builder.page.v1.page-a',
      JSON.stringify({
        id: 'page',
        component: 'Stack',
        label: 'Page',
        children: [
          { id: 'old', component: 'Retired', label: 'Old', children: [{ id: 'inner', component: 'Text', label: 'Text' }] },
          { id: 'text', component: 'Text', label: 'Intro', text: 'Hello', props: { tone: 'muted', bogus: 1 } },
          { id: 'text', component: 'Text', label: 'Duplicate id' },
        ],
      }),
    )
    expect(loadPageDocument(advuiRegistry, storage, 'page-a')).toEqual({
      id: 'page',
      component: 'Stack',
      label: 'Page',
      props: {},
      children: [{ id: 'text', component: 'Text', label: 'Intro', props: { tone: 'muted' }, text: 'Hello', children: [] }],
    })
    storage.setItem('advui-builder.page.v1.page-b', JSON.stringify({ id: 'card', component: 'Card', label: 'Card' }))
    expect(loadPageDocument(advuiRegistry, storage, 'page-b')).toBeNull()
  })

  it('reads back every starter tree and block as it was saved', () => {
    for (const entry of advuiRegistry.sidebarEntries()) {
      const tree = advuiRegistry.createDocument(entry.name)
      const stored = JSON.parse(JSON.stringify(compactTree(tree)))
      expect(readTree(advuiRegistry, stored, entry.name, { nodes: 5000, depth: 64 }), entry.name).toEqual(tree)
    }
    for (const block of advuiRegistry.blocks) {
      const tree = advuiRegistry.createBlock(block.id)
      const stored = JSON.parse(JSON.stringify(compactTree(tree)))
      expect(readTree(advuiRegistry, stored, tree.component, { nodes: 5000, depth: 64 }), block.id).toEqual(tree)
    }
  })

  it('reports a write the browser refuses', () => {
    const full = {
      ...memory(),
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      },
    }
    const page = advuiRegistry.createPage()
    expect(savePageDocument(full, 'page-a', page)).toBe(false)
    expect(savePageIndex(full, { current: null, pages: [] })).toBe(false)
    expect(savePageDocument(null, 'page-a', page)).toBe(false)
  })

  it('adds, renames, touches and removes pages', () => {
    let index: PageIndex = { current: null, pages: [] }
    const first = addPage(index, untitledName(index.pages), 100)
    index = first.index
    const second = addPage(index, untitledName(index.pages), 200)
    index = second.index
    expect(index.pages.map((page) => page.name)).toEqual(['Untitled page 2', 'Untitled page'])
    expect(index.current).toBe(second.page.id)
    expect(first.page.id).not.toBe(second.page.id)

    index = renamePage(index, first.page.id, '  Landing ')
    expect(renamePage(index, first.page.id, '   ')).toBe(index)
    index = touchPage(index, first.page.id, 300)
    expect(index.current).toBe(first.page.id)
    expect(index.pages.find((page) => page.id === first.page.id)).toEqual({
      id: first.page.id,
      name: 'Landing',
      updatedAt: 300,
    })

    // Removing the current page hands over to the most recently changed one.
    expect(removePage(index, first.page.id)).toEqual({ current: second.page.id, pages: [second.page] })
    expect(removePage(index, second.page.id).current).toBe(first.page.id)
    expect(touchPage({ current: null, pages: [] }, 'page-x', 5).pages).toEqual([
      { id: 'page-x', name: 'Untitled page', updatedAt: 5 },
    ])
  })

  it('tidies page settings and clears a setting set to nothing', () => {
    const page = { id: 'page-a', name: 'Home', updatedAt: 1 }
    let index: PageIndex = { current: 'page-a', pages: [page] }
    index = configurePage(index, 'page-a', { component: 'HomePage', title: '  Home   sweet home ' })
    expect(index.pages[0].settings).toEqual({ component: 'HomePage', title: 'Home sweet home' })
    expect(configurePage(index, 'page-a', { title: 'Home sweet home' })).toBe(index)
    expect(configurePage(index, 'missing', { title: 'x' })).toBe(index)
    // A lower-case name would be an HTML element in JSX, so it is not kept.
    expect(configurePage(index, 'page-a', { component: 'homePage' }).pages[0].settings).toEqual({
      title: 'Home sweet home',
    })
    index = configurePage(index, 'page-a', { component: '', title: ' ' })
    expect(index.pages[0]).toEqual(page)

    const stored = sanitizePageIndex({
      pages: [{ ...page, settings: { component: '1st', title: 'x'.repeat(200), description: 3 } }],
    })
    expect(stored.pages[0].settings).toEqual({ title: 'x'.repeat(120) })
  })
})
