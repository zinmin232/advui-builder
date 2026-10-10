import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from 'react'
import type { ConfigNode } from '../../registry/metadata'
import type { BuilderRegistry } from '../../registry/registry'
import type { PageFile } from '../pages/pageFile'
import {
  addPage,
  configurePage,
  loadPageDocument,
  loadPageIndex,
  removePage,
  removePageDocument,
  renamePage,
  savePageDocument,
  savePageIndex,
  touchPage,
  untitledName,
  type PageIndex,
  type PageSettings,
  type PageStorage,
  type SavedPage,
} from '../pages/pageStore'
import { applyConfiguration, configurationFromSearch, stateFromLocation } from '../shareConfig'
import { browserStorage, loadPreferences, pushRecent, savePreferences, type Preferences } from '../persistence'
import {
  createBuilderReducer,
  createBuilderState,
  pageDocument,
  type BuilderAction,
  type BuilderState,
} from './builderState'

interface Actions {
  /** Sidebar click: opens the component, or adds it to the page in Page mode. Also records it as recent. */
  openComponent: (component: string) => void
  selectComponent: (component: string) => void
  setMode: (mode: BuilderState['mode']) => void
  select: (id: string) => void
  setProp: (id: string, key: string, value: unknown) => void
  setText: (id: string, text: string) => void
  reset: () => void
  setPlatform: (platform: BuilderState['platform']) => void
  setWidth: (width: number) => void
  setBackground: (background: string) => void
  setTheme: (theme: BuilderState['theme']) => void
  setZoom: (zoom: number) => void
  insertComponent: (component: string) => void
  insertAt: (component: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  insertColumns: (spans: number[]) => void
  insertColumnsAt: (spans: number[], targetId: string, position: 'before' | 'after' | 'inside') => void
  insertBlock: (block: string) => void
  insertBlockAt: (block: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  addItem: () => void
  remove: () => void
  move: (direction: 'up' | 'down') => void
  duplicate: () => void
  place: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  /** Adds a copied layer inside the selected layer, or after it when it can't hold it. */
  paste: (tree: ConfigNode) => void
  undo: () => void
  redo: () => void
}

interface PreferenceActions {
  update: (patch: Partial<Preferences>) => void
  toggleFavorite: (component: string) => void
}

export interface Pages {
  pages: SavedPage[]
  /** The page Page mode shows (or parks behind Component mode). */
  current: SavedPage | null
  /** `saved`: kept in this browser. `failed`: the browser refused the last save. `off`: nothing is kept. */
  status: 'saved' | 'failed' | 'off'
}

interface PageActions {
  create: () => void
  open: (id: string) => void
  rename: (id: string, name: string) => void
  /** Changes some settings; an empty value clears one. */
  configure: (id: string, settings: PageSettings) => void
  duplicate: (id: string) => void
  remove: (id: string) => void
  /** Adds a page read from a file and opens it. */
  importPage: (file: PageFile) => void
}

const RegistryContext = createContext<BuilderRegistry | null>(null)
const BuilderContext = createContext<BuilderState | null>(null)
const ActionsContext = createContext<Actions | null>(null)
const PreferencesContext = createContext<Preferences | null>(null)
const PreferenceActionsContext = createContext<PreferenceActions | null>(null)
const PagesContext = createContext<Pages | null>(null)
const PageActionsContext = createContext<PageActions | null>(null)
const HoverContext = createContext<string | null>(null)
const SetHoverContext = createContext<(id: string | null) => void>(() => {})

interface StoredPage {
  id: string
  document: ConfigNode
}

interface Boot {
  state: BuilderState
  index: PageIndex
  /** The page as it is stored, so autosave waits for a change. Null when the open page still has to be saved. */
  stored: StoredPage | null
  /** A page link was opened as a new saved page, so the link can leave the address bar. */
  imported: boolean
}

/** Reads preferences, the saved pages and the link. Runs during the first render, so it must not write anything. */
function boot(registry: BuilderRegistry, storage: PageStorage | null, initial?: BuilderState): Boot {
  let index = loadPageIndex(storage)
  if (registry.hasPage && !index.current) index = addPage(index, untitledName(index.pages)).index
  const pageId = index.current

  if (initial) {
    const state = initial.pageId || !pageId ? initial : { ...initial, pageId }
    const document = pageDocument(state)
    return { state, index, stored: state.pageId && document ? { id: state.pageId, document } : null, imported: false }
  }

  const preferences = loadPreferences()
  const component = registry.match(preferences.lastComponent) ?? registry.defaultComponent
  const settings: Partial<BuilderState> = {
    platform: preferences.platform,
    viewportWidth: preferences.viewportWidth,
    background: preferences.background,
    theme: preferences.theme,
    zoom: preferences.zoom,
  }
  const search = typeof window === 'undefined' ? '' : window.location.search
  const link = configurationFromSearch(registry, search)

  // A shared page opens as a new saved page, so it never replaces the page in progress.
  if (link?.mode === 'page' && link.document && storage) {
    const added = addPage(index, 'Shared page')
    const base = createBuilderState(registry, component, { ...settings, mode: 'page', pageId: added.page.id })
    return { state: applyConfiguration(registry, base, link), index: added.index, stored: null, imported: true }
  }

  if (!pageId) {
    const base = createBuilderState(registry, component, { ...settings, mode: preferences.mode })
    return { state: stateFromLocation(registry, search, base), index, stored: null, imported: false }
  }
  const document = loadPageDocument(registry, storage, pageId) ?? registry.createPage()
  const base = createBuilderState(registry, component, {
    ...settings,
    mode: preferences.mode,
    pageId,
    ...(preferences.mode === 'page'
      ? { document }
      : { parked: { mode: 'page' as const, document, selectedId: document.id } }),
  })
  return { state: stateFromLocation(registry, search, base), index, stored: { id: pageId, document }, imported: false }
}

/**
 * Holds the Builder state for one component registry. The registry is the only
 * place the Builder learns about components; pass a stable object.
 */
export function BuilderProvider({
  children,
  registry,
  initial,
  persist = true,
}: {
  children: ReactNode
  registry: BuilderRegistry
  initial?: BuilderState
  persist?: boolean
}) {
  const reducer = useMemo(() => createBuilderReducer(registry), [registry])
  const [storage] = useState<PageStorage | null>(() => (persist ? browserStorage() : null))
  const [start] = useState(() => boot(registry, storage, initial))
  const [state, dispatch] = useReducer(reducer, start.state)
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences())
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(start.index)
  const [saveFailed, setSaveFailed] = useState(false)
  const indexRef = useRef(start.index)
  const storedRef = useRef<StoredPage | null>(start.stored)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    // The page now lives in storage; reloading the link would import it again.
    if (start.imported) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash)
    }
  }, [start.imported])

  const commitIndex = useCallback(
    (next: PageIndex) => {
      indexRef.current = next
      setPageIndex(next)
      if (storage) setSaveFailed(!savePageIndex(storage, next))
    },
    [storage],
  )

  // Autosave: the page is written whenever its tree changes, whether it is showing or parked.
  const page = pageDocument(state)
  useEffect(() => {
    const id = state.pageId
    if (!storage || !id || !page) return
    const stored = storedRef.current
    if (stored?.id === id && stored.document === page) return
    storedRef.current = { id, document: page }
    const saved = savePageDocument(storage, id, page)
    commitIndex(touchPage(indexRef.current, id))
    if (!saved) setSaveFailed(true)
  }, [storage, state.pageId, page, commitIndex])

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => ({ ...current, ...patch }))
  }, [])

  // The preview settings, last component and mode live in the builder state; they are kept with the preferences so
  // the next visit starts there.
  const storedPreferences = useMemo<Preferences>(
    () => ({
      ...preferences,
      background: state.background,
      theme: state.theme,
      zoom: state.zoom,
      viewportWidth: state.viewportWidth,
      platform: state.platform,
      lastComponent: state.selectedComponent,
      mode: state.mode,
    }),
    [
      preferences,
      state.background,
      state.theme,
      state.zoom,
      state.viewportWidth,
      state.platform,
      state.selectedComponent,
      state.mode,
    ],
  )

  useEffect(() => {
    if (persist) savePreferences(storedPreferences)
  }, [persist, storedPreferences])

  const actions = useMemo<Actions>(() => {
    const send = (action: BuilderAction) => dispatch(action)
    const remember = (component: string) =>
      setPreferences((current) => ({ ...current, recent: pushRecent(current.recent, component) }))
    return {
      openComponent: (component) => {
        send({ type: 'open', component })
        remember(component)
      },
      selectComponent: (component) => {
        send({ type: 'select-component', component })
        remember(component)
      },
      setMode: (mode) => send({ type: 'set-mode', mode }),
      select: (id) => send({ type: 'select', id }),
      setProp: (id, key, value) => send({ type: 'set-prop', id, key, value }),
      setText: (id, text) => send({ type: 'set-text', id, text }),
      reset: () => send({ type: 'reset' }),
      setPlatform: (platform) => send({ type: 'set-platform', platform }),
      setWidth: (width) => send({ type: 'set-width', width }),
      setBackground: (background) => send({ type: 'set-background', background }),
      setTheme: (theme) => send({ type: 'set-theme', theme }),
      setZoom: (zoom) => send({ type: 'set-zoom', zoom }),
      insertComponent: (component) => send({ type: 'insert', component }),
      insertAt: (component, targetId, position) => send({ type: 'insert-at', component, targetId, position }),
      insertColumns: (spans) => send({ type: 'insert-columns', spans }),
      insertColumnsAt: (spans, targetId, position) => send({ type: 'insert-columns-at', spans, targetId, position }),
      insertBlock: (block) => send({ type: 'insert-block', block }),
      insertBlockAt: (block, targetId, position) => send({ type: 'insert-block-at', block, targetId, position }),
      addItem: () => send({ type: 'add-item' }),
      remove: () => send({ type: 'remove' }),
      move: (direction) => send({ type: 'move', direction }),
      duplicate: () => send({ type: 'duplicate' }),
      place: (id, targetId, position) => send({ type: 'place', id, targetId, position }),
      paste: (tree) => send({ type: 'paste', tree }),
      undo: () => send({ type: 'undo' }),
      redo: () => send({ type: 'redo' }),
    }
  }, [])

  const preferenceActions = useMemo<PreferenceActions>(
    () => ({
      update: updatePreferences,
      toggleFavorite: (component) => {
        setPreferences((current) => {
          const favorites = current.favorites.includes(component)
            ? current.favorites.filter((item) => item !== component)
            : [...current.favorites, component]
          return { ...current, favorites }
        })
      },
    }),
    [updatePreferences],
  )

  const pageActions = useMemo<PageActions>(() => {
    /** Shows a page. It is stored already, so autosave starts from it. */
    const show = (id: string, document: ConfigNode, index: PageIndex) => {
      storedRef.current = { id, document }
      commitIndex({ ...index, current: id })
      dispatch({ type: 'load-page', id, document })
    }
    const createIn = (index: PageIndex) => {
      const added = addPage(index, untitledName(index.pages))
      show(added.page.id, registry.createPage(), added.index)
    }
    const read = (id: string) => loadPageDocument(registry, storage, id) ?? registry.createPage()
    /** Saves a new page's tree first, so a refused write shows as "Not saved". */
    const addSaved = (name: string, settings: PageSettings, document: ConfigNode) => {
      const added = addPage(indexRef.current, name)
      const saved = savePageDocument(storage, added.page.id, document)
      show(added.page.id, document, configurePage(added.index, added.page.id, settings))
      if (storage && !saved) setSaveFailed(true)
    }
    return {
      create: () => createIn(indexRef.current),
      open: (id) => {
        const current = stateRef.current
        if (id === current.pageId) {
          if (current.mode !== 'page') dispatch({ type: 'set-mode', mode: 'page' })
          return
        }
        if (indexRef.current.pages.some((item) => item.id === id)) show(id, read(id), indexRef.current)
      },
      rename: (id, name) => commitIndex(renamePage(indexRef.current, id, name)),
      configure: (id, settings) => commitIndex(configurePage(indexRef.current, id, settings)),
      duplicate: (id) => {
        const current = stateRef.current
        const source = indexRef.current.pages.find((item) => item.id === id)
        if (!source) return
        const document = (id === current.pageId ? pageDocument(current) : null) ?? read(id)
        addSaved(`${source.name} copy`, source.settings ?? {}, document)
      },
      remove: (id) => {
        removePageDocument(storage, id)
        const index = removePage(indexRef.current, id)
        if (id !== stateRef.current.pageId) commitIndex(index)
        else if (index.current) show(index.current, read(index.current), index)
        else createIn(index)
      },
      importPage: (file) => addSaved(file.name, file.settings, file.document),
    }
  }, [registry, storage, commitIndex])

  const pages = useMemo<Pages>(
    () => ({
      pages: pageIndex.pages,
      current: pageIndex.pages.find((item) => item.id === state.pageId) ?? null,
      status: !storage ? 'off' : saveFailed ? 'failed' : 'saved',
    }),
    [pageIndex, state.pageId, storage, saveFailed],
  )

  const setHover = useCallback((id: string | null) => {
    setHoverId((current) => (current === id ? current : id))
  }, [])

  return (
    <RegistryContext.Provider value={registry}>
      <BuilderContext.Provider value={state}>
        <ActionsContext.Provider value={actions}>
          <PreferencesContext.Provider value={storedPreferences}>
            <PreferenceActionsContext.Provider value={preferenceActions}>
              <PagesContext.Provider value={pages}>
                <PageActionsContext.Provider value={pageActions}>
                  <HoverContext.Provider value={hoverId}>
                    <SetHoverContext.Provider value={setHover}>{children}</SetHoverContext.Provider>
                  </HoverContext.Provider>
                </PageActionsContext.Provider>
              </PagesContext.Provider>
            </PreferenceActionsContext.Provider>
          </PreferencesContext.Provider>
        </ActionsContext.Provider>
      </BuilderContext.Provider>
    </RegistryContext.Provider>
  )
}

function useRequired<T>(context: Context<T | null>, name: string): T {
  const value = useContext(context)
  if (!value) throw new Error(`${name} must be used within BuilderProvider`)
  return value
}

export function useRegistry(): BuilderRegistry {
  return useRequired(RegistryContext, 'useRegistry')
}

export function useBuilderState(): BuilderState {
  return useRequired(BuilderContext, 'useBuilderState')
}

export function useBuilderActions(): Actions {
  return useRequired(ActionsContext, 'useBuilderActions')
}

export function usePreferences(): Preferences {
  return useRequired(PreferencesContext, 'usePreferences')
}

export function usePreferenceActions(): PreferenceActions {
  return useRequired(PreferenceActionsContext, 'usePreferenceActions')
}

export function usePages(): Pages {
  return useRequired(PagesContext, 'usePages')
}

export function usePageActions(): PageActions {
  return useRequired(PageActionsContext, 'usePageActions')
}

export function useHoverId(): string | null {
  return useContext(HoverContext)
}

export function useSetHover(): (id: string | null) => void {
  return useContext(SetHoverContext)
}
