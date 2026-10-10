import type { ReactNode } from 'react'
import { useBuilderActions, useSetHover } from '../state/BuilderProvider'
import { useCanvasMode } from './canvasMode'

export function Selectable({ id, invisible = false, children }: { id: string; invisible?: boolean; children: ReactNode }) {
  const actions = useBuilderActions()
  const setHover = useSetHover()
  const { interactive, editText } = useCanvasMode()
  if (interactive) {
    return (
      <div data-builder-id={id} style={{ display: 'contents' }}>
        {children}
      </div>
    )
  }
  return (
    <div
      data-builder-id={id}
      data-builder-invisible={invisible || undefined}
      style={{ display: 'contents' }}
      onClick={(event) => {
        event.stopPropagation()
        actions.select(id)
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        editText(id)
      }}
      onMouseOver={(event) => {
        event.stopPropagation()
        setHover(id)
      }}
    >
      {children}
    </div>
  )
}
