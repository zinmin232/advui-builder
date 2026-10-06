import type { ReactNode } from 'react'
import { useBuilderActions, useSetHover } from '../state/BuilderProvider'

export function Selectable({ id, invisible = false, children }: { id: string; invisible?: boolean; children: ReactNode }) {
  const actions = useBuilderActions()
  const setHover = useSetHover()
  return (
    <div
      data-builder-id={id}
      data-builder-invisible={invisible || undefined}
      style={{ display: 'contents' }}
      onClick={(event) => {
        event.stopPropagation()
        actions.select(id)
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
