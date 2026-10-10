import { Component, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { breakpointAt, breakpointKeys } from '../../registry/responsive'
import { useDropSurface } from '../dnd/BuilderDnd'
import { findNode } from '../selection/selection'
import { useBuilderActions, useBuilderState, useHoverId, useRegistry, useSetHover } from '../state/BuilderProvider'
import { CanvasGuides } from './CanvasGuides'
import { canEditText, CanvasModeContext, type CanvasMode } from './canvasMode'
import { ElementTree } from './ElementTree'
import type { PreviewKit } from './previewKit'
import { SelectionOverlay } from './SelectionOverlay'

/**
 * The canvas. In edit mode, clicks select layers and the builder draws outlines, a toolbar and drop slots over the
 * page. `interactive` runs the page as it is: clicks reach the components and nothing is drawn over them.
 */
export function PreviewWorkspace({
  kit,
  bar,
  interactive = false,
}: {
  kit: PreviewKit
  bar: ReactNode
  interactive?: boolean
}) {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const registry = useRegistry()
  const { Frame } = kit
  const hoverId = useHoverId()
  const setHover = useSetHover()
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null)
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  // The whole scroll area accepts drops: empty space around the page counts as the page itself.
  useDropSurface('canvas', interactive ? null : canvas)

  // Editing belongs to the layer it started on; selecting another layer (or undoing it away) ends it.
  if (editingId && (editingId !== state.selectedId || interactive)) setEditingId(null)

  const editText = useCallback((id: string) => {
    // A double-click also selects a word on the page, which a later Ctrl+C would copy instead of the layer.
    window.getSelection()?.removeAllRanges()
    setEditingId(id)
  }, [])
  const mode = useMemo<CanvasMode>(() => ({ interactive, editText }), [interactive, editText])

  useEffect(() => {
    if (interactive) return
    // Enter edits the selected layer's text, unless a builder control or a field has the keyboard.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      const onCanvas = target === document.body || (target instanceof Element && target.closest('.stage') !== null)
      const field = target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')
      if (!onCanvas || field) return
      const node = findNode(state.document, state.selectedId)
      if (!node || !canEditText(registry, node)) return
      event.preventDefault()
      editText(node.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editText, interactive, registry, state.document, state.selectedId])

  const breakpoint = breakpointAt(registry.breakpoints, state.viewportWidth)
  const screen = useMemo(() => ({ breakpoint, keys: breakpointKeys(registry.breakpoints) }), [breakpoint, registry])
  const renderNode = useCallback(
    (node: ConfigNode, children: ReactNode) =>
      kit.renderNode(node, children, { platform: state.platform, registry, screen }),
    [kit, registry, screen, state.platform],
  )

  return (
    <div className="preview">
      {bar}
      <div className={state.theme === 'dark' ? 'canvas-shell theme-dark' : 'canvas-shell theme-light'}>
        <CanvasGuides canvas={canvas} zoom={state.zoom} theme={state.theme} />
        <div
          ref={setCanvas}
          className={state.theme === 'dark' ? 'canvas theme-dark' : 'canvas theme-light'}
          style={{ backgroundColor: state.background }}
          onMouseLeave={() => setHover(null)}
          onClick={interactive ? undefined : () => actions.select(state.document.id)}
        >
        <div className="scaler" style={{ transform: `scale(${state.zoom})` }}>
          <div ref={setFrame} className={`frame ${state.platform}`}>
            <div className={interactive ? 'stage interactive' : 'stage'} style={{ width: state.viewportWidth }}>
              <PreviewErrorBoundary>
                <Frame theme={state.theme}>
                  <CanvasModeContext.Provider value={mode}>
                    <ElementTree node={state.document} renderNode={renderNode} />
                  </CanvasModeContext.Provider>
                </Frame>
              </PreviewErrorBoundary>
            </div>
            {interactive ? null : (
              <SelectionOverlay
                container={frame}
                root={state.document}
                selectedId={state.selectedId}
                hoverId={hoverId}
                zoom={state.zoom}
                editing={editingId === state.selectedId}
                onEditText={() => editText(state.selectedId)}
                onEditDone={() => setEditingId(null)}
              />
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.message) {
      return <p className="preview-error">Preview failed: {this.state.message}</p>
    }
    return this.props.children
  }
}
