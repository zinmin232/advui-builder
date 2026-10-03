import { useEffect } from 'react'
import { useBuilderActions, useBuilderState } from './state/BuilderProvider'

/** Undo, redo, duplicate and delete for the selected layer. Typing in a field keeps its own keys. */
export function useShortcuts() {
  const state = useBuilderState()
  const actions = useBuilderActions()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const field =
        target instanceof HTMLElement ? target.closest('input, textarea, select, [contenteditable="true"]') : null
      const key = event.key.toLowerCase()

      if ((key === 'delete' || key === 'backspace') && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (field || state.selectedId === state.document.id) return
        event.preventDefault()
        actions.remove()
        return
      }

      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      const undo = key === 'z' && !event.shiftKey
      const redo = (key === 'z' && event.shiftKey) || key === 'y'
      const duplicate = key === 'd' && !event.shiftKey
      if (!undo && !redo && !duplicate) return
      if (field && (duplicate || !field.closest('.inspector'))) return
      if (duplicate) {
        if (state.selectedId === state.document.id) return
        event.preventDefault()
        actions.duplicate()
      } else if (undo) {
        if (state.past.length === 0) return
        event.preventDefault()
        actions.undo()
      } else if (state.future.length > 0) {
        event.preventDefault()
        actions.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, state.document.id, state.future.length, state.past.length, state.selectedId])
}
