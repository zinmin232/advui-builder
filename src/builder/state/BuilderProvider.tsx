import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Context,
  type ReactNode,
} from 'react'
import type { BuilderRegistry } from '../../registry/registry'
import { stateFromLocation } from '../shareConfig'
import { loadPreferences, pushRecent, savePreferences, type Preferences } from '../persistence'
import { createBuilderReducer, createBuilderState, type BuilderAction, type BuilderState } from './builderState'

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
  addItem: () => void
  remove: () => void
  move: (direction: 'up' | 'down') => void
  duplicate: () => void
  place: (id: string, targetId: string, position: 'before' | 'after' | 'inside') => void
  undo: () => void
  redo: () => void
}

interface PreferenceActions {
  update: (patch: Partial<Preferences>) => void
  toggleFavorite: (component: string) => void
}

const RegistryContext = createContext<BuilderRegistry | null>(null)
const BuilderContext = createContext<BuilderState | null>(null)
const ActionsContext = createContext<Actions | null>(null)
const PreferencesContext = createContext<Preferences | null>(null)
const PreferenceActionsContext = createContext<PreferenceActions | null>(null)
const HoverContext = createContext<string | null>(null)
const SetHoverContext = createContext<(id: string | null) => void>(() => {})

function initialState(registry: BuilderRegistry): BuilderState {
  const preferences = loadPreferences()
  const component = registry.match(preferences.lastComponent) ?? registry.defaultComponent
  const base = createBuilderState(registry, component, {
    mode: preferences.mode,
    platform: preferences.platform,
    viewportWidth: preferences.viewportWidth,
    background: preferences.background,
    theme: preferences.theme,
    zoom: preferences.zoom,
  })
  if (typeof window === 'undefined') return base
  return stateFromLocation(registry, window.location.search, base)
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
  const [state, dispatch] = useReducer(reducer, undefined, () => initial ?? initialState(registry))
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences())
  const [hoverId, setHoverId] = useState<string | null>(null)

  const updatePreferences = useCallback(
    (patch: Partial<Preferences>) => {
      setPreferences((current) => {
        const next = { ...current, ...patch }
        if (persist) savePreferences(next)
        return next
      })
    },
    [persist],
  )

  useEffect(() => {
    if (!persist) return
    updatePreferences({
      background: state.background,
      theme: state.theme,
      zoom: state.zoom,
      viewportWidth: state.viewportWidth,
      platform: state.platform,
      lastComponent: state.selectedComponent,
      mode: state.mode,
    })
  }, [
    persist,
    state.mode,
    state.background,
    state.theme,
    state.zoom,
    state.viewportWidth,
    state.platform,
    state.selectedComponent,
    updatePreferences,
  ])

  const actions = useMemo<Actions>(() => {
    const send = (action: BuilderAction) => dispatch(action)
    const remember = (component: string) =>
      setPreferences((current) => {
        const next = { ...current, recent: pushRecent(current.recent, component) }
        if (persist) savePreferences(next)
        return next
      })
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
      addItem: () => send({ type: 'add-item' }),
      remove: () => send({ type: 'remove' }),
      move: (direction) => send({ type: 'move', direction }),
      duplicate: () => send({ type: 'duplicate' }),
      place: (id, targetId, position) => send({ type: 'place', id, targetId, position }),
      undo: () => send({ type: 'undo' }),
      redo: () => send({ type: 'redo' }),
    }
  }, [persist])

  const preferenceActions = useMemo<PreferenceActions>(
    () => ({
      update: updatePreferences,
      toggleFavorite: (component) => {
        setPreferences((current) => {
          const favorites = current.favorites.includes(component)
            ? current.favorites.filter((item) => item !== component)
            : [...current.favorites, component]
          const next = { ...current, favorites }
          if (persist) savePreferences(next)
          return next
        })
      },
    }),
    [persist, updatePreferences],
  )

  const setHover = useCallback((id: string | null) => {
    setHoverId((current) => (current === id ? current : id))
  }, [])

  return (
    <RegistryContext.Provider value={registry}>
      <BuilderContext.Provider value={state}>
        <ActionsContext.Provider value={actions}>
          <PreferencesContext.Provider value={preferences}>
            <PreferenceActionsContext.Provider value={preferenceActions}>
              <HoverContext.Provider value={hoverId}>
                <SetHoverContext.Provider value={setHover}>{children}</SetHoverContext.Provider>
              </HoverContext.Provider>
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

export function useHoverId(): string | null {
  return useContext(HoverContext)
}

export function useSetHover(): (id: string | null) => void {
  return useContext(SetHoverContext)
}
