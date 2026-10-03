import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { useBuilderActions, useBuilderState, useHoverId, useSetHover } from '../state/BuilderProvider'
import { AdvuiFrame, renderAdvuiNode } from './AdvuiPreview'
import { CanvasGuides } from './CanvasGuides'
import { ElementTree } from './ElementTree'
import { SelectionOverlay } from './SelectionOverlay'

export function PreviewWorkspace({ bar }: { bar: ReactNode }) {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const hoverId = useHoverId()
  const setHover = useSetHover()
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null)
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)

  const renderNode = useCallback(
    (node: ConfigNode, children: ReactNode) => renderAdvuiNode(node, children, state.platform),
    [state.platform],
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
          onClick={() => actions.select(state.document.id)}
        >
        <div className="scaler" style={{ transform: `scale(${state.zoom})` }}>
          <div ref={setFrame} className={`frame ${state.platform}`}>
            <div className="stage" style={{ width: state.viewportWidth }}>
              <PreviewErrorBoundary>
                <AdvuiFrame theme={state.theme}>
                  <ElementTree node={state.document} renderNode={renderNode} />
                </AdvuiFrame>
              </PreviewErrorBoundary>
            </div>
            <SelectionOverlay
              container={frame}
              root={state.document}
              selectedId={state.selectedId}
              hoverId={hoverId}
              zoom={state.zoom}
            />
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
