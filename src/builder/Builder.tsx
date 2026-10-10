import { Suspense, use, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { writeToClipboard } from './clipboard'
import { clampInspectorWidth, clampSidebarWidth, INSPECTOR_WIDTHS, SIDEBAR_WIDTHS } from './persistence'
import { shareUrl } from './shareConfig'
import { LayersPanel } from './layers/LayersPanel'
import { CodePanel } from './code/CodePanel'
import { BuilderDnd } from './dnd/BuilderDnd'
import { Inspector } from './inspector/Inspector'
import { PageMenu } from './pages/PageMenu'
import { PlatformSelector } from './preview/PlatformSelector'
import type { PreviewKit, PreviewLoader } from './preview/previewKit'
import { PreviewToolbar } from './preview/PreviewToolbar'
import { PreviewWorkspace } from './preview/PreviewWorkspace'
import { ComponentSidebar } from './sidebar/ComponentSidebar'
import {
  useBuilderActions,
  useBuilderState,
  usePreferenceActions,
  usePreferences,
  useRegistry,
} from './state/BuilderProvider'
import { useShortcuts } from './useShortcuts'

// One load per loader, so a re-render never starts another.
const kits = new WeakMap<PreviewLoader, Promise<PreviewKit>>()

function kitFor(load: PreviewLoader): Promise<PreviewKit> {
  let kit = kits.get(load)
  if (!kit) {
    kit = load()
    kits.set(load, kit)
  }
  return kit
}

/** The preview waits for the component library to load (it suspends). The panels render without it. */
function LoadedPreview({
  load,
  interactive,
  onCanvas,
}: {
  load: PreviewLoader
  interactive: boolean
  onCanvas: (canvas: HTMLDivElement | null) => void
}) {
  return <PreviewWorkspace kit={use(kitFor(load))} interactive={interactive} onCanvas={onCanvas} />
}

/**
 * A pane's resize handle. Dragging moves it; so do the arrow keys (16px, 64px with Shift), and Home and End take the
 * pane to its narrowest and widest. `grows` is the way the splitter moves to widen the pane.
 */
function Splitter({
  label,
  width,
  limits,
  grows,
  onWidth,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string
  width: number
  limits: { min: number; max: number }
  grows: 'left' | 'right'
  onWidth: (width: number) => void
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp: () => void
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = (event.shiftKey ? 64 : 16) * (grows === 'right' ? 1 : -1)
    const next =
      event.key === 'ArrowRight'
        ? width + step
        : event.key === 'ArrowLeft'
          ? width - step
          : event.key === 'Home'
            ? limits.min
            : event.key === 'End'
              ? limits.max
              : null
    if (next === null) return
    event.preventDefault()
    onWidth(next)
  }
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuetext={`${width} pixels wide`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}

/** Edit selects and changes layers on the canvas; Preview runs the page as it is; Code shows the TSX. */
const workspaceViews = [
  { id: 'edit', label: 'Edit', title: 'Select and change layers on the canvas' },
  { id: 'preview', label: 'Preview', title: 'Use the page as it is: buttons, menus and fields respond' },
  { id: 'code', label: 'Code', title: 'The generated TSX' },
] as const

type WorkspaceView = (typeof workspaceViews)[number]['id']

/** `loadPreview` must be a stable function: a new one reloads the preview. */
export function Builder({ loadPreview }: { loadPreview: PreviewLoader }) {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const registry = useRegistry()
  const preferences = usePreferences()
  const preferenceActions = usePreferenceActions()
  const drag = useRef<{ kind: 'sidebar' | 'inspector'; start: number; origin: number } | null>(null)
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('edit')
  const [linkCopied, setLinkCopied] = useState(false)
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null)

  const onPointerDown = (kind: 'sidebar' | 'inspector', event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const origin = kind === 'sidebar' ? preferences.sidebarWidth : preferences.inspectorWidth
    drag.current = { kind, start: event.clientX, origin }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    if (current.kind === 'sidebar') {
      preferenceActions.update({ sidebarWidth: clampSidebarWidth(current.origin + (event.clientX - current.start)) })
    } else {
      preferenceActions.update({
        inspectorWidth: clampInspectorWidth(current.origin - (event.clientX - current.start)),
      })
    }
  }

  const endDrag = () => {
    drag.current = null
  }

  // Layer shortcuts would act on a layer nobody can see while the page runs as it is.
  useShortcuts(workspaceView !== 'preview')

  const copyLink = async () => {
    await writeToClipboard(shareUrl(registry, state, window.location))
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1600)
  }

  const viewBar = (
    <div className="view-bar">
      <PlatformSelector platform={state.platform} onChange={actions.setPlatform} />
      <PreviewToolbar
        width={state.viewportWidth}
        background={state.background}
        theme={state.theme}
        zoom={state.zoom}
        canvas={canvas}
        onWidth={actions.setWidth}
        onBackground={actions.setBackground}
        onZoom={actions.setZoom}
      />
      <div className="view-tabs" role="tablist" aria-label="Workspace view">
        {workspaceViews.map((view) => (
          <button
            key={view.id}
            type="button"
            role="tab"
            className={workspaceView === view.id ? 'view-tab active' : 'view-tab'}
            aria-selected={workspaceView === view.id}
            title={view.title}
            onClick={() => setWorkspaceView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app" data-theme={state.theme}>
      <header className="topbar">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 32 32" width="28" height="28" role="img" aria-label="AdvUI">
            <rect width="32" height="32" rx="8" fill="#1d4ed8" />
            <text
              x="16"
              y="21"
              textAnchor="middle"
              fill="#ffffff"
              fontFamily="Segoe UI, system-ui, sans-serif"
              fontSize="13"
              fontWeight="700"
              letterSpacing="-0.6"
            >
              aUI
            </text>
          </svg>
          <strong>AdvUI Builder</strong>
        </div>
        {registry.hasPage ? (
          <div className="segment" role="group" aria-label="Mode">
            {(['component', 'page'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={state.mode === mode ? 'segment-btn active' : 'segment-btn'}
                aria-pressed={state.mode === mode}
                title={mode === 'page' ? 'Build a page from many components' : 'Customize one component'}
                onClick={() => actions.setMode(mode)}
              >
                {mode === 'page' ? 'Page' : 'Component'}
              </button>
            ))}
          </div>
        ) : null}
        {state.mode === 'page' ? <PageMenu /> : <span className="topbar-component">{state.selectedComponent}</span>}
        <span className="spacer" />
        <div className="segment" role="group" aria-label="History">
          <button
            type="button"
            className="icon-btn"
            onClick={() => actions.undo()}
            disabled={state.past.length === 0}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M3 7v6h6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => actions.redo()}
            disabled={state.future.length === 0}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M21 7v6h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={state.theme === 'light' ? 'Light' : 'Dark'}
          title={state.theme === 'light' ? 'Light. Switch to dark' : 'Dark. Switch to light'}
          onClick={() => actions.setTheme(state.theme === 'light' ? 'dark' : 'light')}
        >
          {state.theme === 'light' ? (
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="text-btn"
          title="Copy a link that opens this design"
          onClick={() => void copyLink()}
        >
          {linkCopied ? 'Link copied' : 'Copy link'}
        </button>
        <button type="button" className="text-btn" onClick={() => actions.reset()}>
          Reset
        </button>
      </header>
      <BuilderDnd>
        <div className="workspace">
          {preferences.sidebarCollapsed ? (
            <div className="rail rail-toggle">
              <button
                type="button"
                className="icon-btn"
                aria-label="Expand components"
                aria-pressed={true}
                onClick={() => preferenceActions.update({ sidebarCollapsed: false })}
              >
                ☰
              </button>
            </div>
          ) : (
            <div className="pane" style={{ width: preferences.sidebarWidth }}>
              <ComponentSidebar />
            </div>
          )}
          {preferences.sidebarCollapsed ? null : (
            <Splitter
              label="Resize components"
              width={preferences.sidebarWidth}
              limits={SIDEBAR_WIDTHS}
              grows="right"
              onWidth={(width) => preferenceActions.update({ sidebarWidth: clampSidebarWidth(width) })}
              onPointerDown={(event) => onPointerDown('sidebar', event)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
            />
          )}
          <div className="center">
            {/* The view bar sits outside the loading boundary, so it stays put (and its open menus stay open) while
                the component library loads and when the tabs switch. */}
            <div className="workspace-view preview">
              {viewBar}
              {workspaceView !== 'code' ? (
                <Suspense fallback={<p className="preview-loading">Loading preview…</p>}>
                  <LoadedPreview load={loadPreview} interactive={workspaceView === 'preview'} onCanvas={setCanvas} />
                </Suspense>
              ) : (
                <div className="code-slot">
                  <CodePanel />
                </div>
              )}
            </div>
          </div>
          {preferences.inspectorCollapsed ? null : (
            <Splitter
              label="Resize inspector"
              width={preferences.inspectorWidth}
              limits={INSPECTOR_WIDTHS}
              grows="left"
              onWidth={(width) => preferenceActions.update({ inspectorWidth: clampInspectorWidth(width) })}
              onPointerDown={(event) => onPointerDown('inspector', event)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
            />
          )}
          {preferences.inspectorCollapsed ? (
            <div className="rail rail-toggle rail-toggle-start">
              <button
                type="button"
                className="icon-btn"
                aria-label="Expand inspector"
                aria-pressed={true}
                onClick={() => preferenceActions.update({ inspectorCollapsed: false })}
              >
                ☰
              </button>
            </div>
          ) : (
            <div className="pane inspector-pane" style={{ width: preferences.inspectorWidth }}>
              <div className="pane-head">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Collapse inspector"
                  aria-pressed={false}
                  onClick={() => preferenceActions.update({ inspectorCollapsed: true })}
                >
                  ☰
                </button>
                <h2>Inspector</h2>
              </div>
              <div className="inspector-scroll">
                <LayersPanel root={state.document} selectedId={state.selectedId} onSelect={actions.select} />
                <Inspector />
              </div>
            </div>
          )}
        </div>
      </BuilderDnd>
    </div>
  )
}
