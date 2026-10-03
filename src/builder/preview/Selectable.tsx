import type { ReactNode } from 'react'
import { useBuilderActions, useSetHover } from '../state/BuilderProvider'

export function Selectable({ id, children }: { id: string; children: ReactNode }) {
  const actions = useBuilderActions()
  const setHover = useSetHover()
  return (
    <div
      data-builder-id={id}
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
