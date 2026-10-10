import { useEffect, useRef } from 'react'
import type { ConfigNode } from '../registry/metadata'
import { generateCode } from './code/codeGenerator'
import { LAYER_MIME, layerClipboardData, readLayerClipboard } from './layerClipboard'
import { findNode } from './selection/selection'
import { useBuilderActions, useBuilderState, useRegistry } from './state/BuilderProvider'

const FIELDS = 'input, textarea, select, [contenteditable="true"]'

function fieldOf(target: EventTarget | null): Element | null {
  return target instanceof HTMLElement ? target.closest(FIELDS) : null
}

/**
 * Undo and redo, plus the layer shortcuts for the selected layer: Delete, Ctrl+D (duplicate), Alt+↑/↓ (move among
 * its siblings) and copy, cut and paste. Typing in a field, or copying selected text, keeps the browser's own keys.
 * `layers` turns the layer shortcuts off, for the interactive preview.
 */
export function useShortcuts(layers = true) {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const registry = useRegistry()
  // Browsers that drop the layer's own clipboard type still return the plain text it was copied with.
  const copied = useRef<{ text: string; tree: ConfigNode } | null>(null)
  const isRoot = state.selectedId === state.document.id

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const field = fieldOf(event.target)
      const key = event.key.toLowerCase()
      const command = event.ctrlKey || event.metaKey

      if ((key === 'delete' || key === 'backspace') && !command && !event.altKey) {
        if (!layers || field || isRoot) return
        event.preventDefault()
        actions.remove()
        return
      }

      if ((key === 'arrowup' || key === 'arrowdown') && event.altKey && !command && !event.shiftKey) {
        if (!layers || field || isRoot) return
        event.preventDefault()
        actions.move(key === 'arrowup' ? 'up' : 'down')
        return
      }

      if (!command || event.altKey) return
      const undo = key === 'z' && !event.shiftKey
      const redo = (key === 'z' && event.shiftKey) || key === 'y'
      const duplicate = key === 'd' && !event.shiftKey
      if (!undo && !redo && !duplicate) return
      if (field && (duplicate || !field.closest('.inspector'))) return
      if (duplicate) {
        if (!layers || isRoot) return
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
  }, [actions, isRoot, layers, state.future.length, state.past.length])

  useEffect(() => {
    if (!layers) return
    const onCopy = (event: ClipboardEvent) => {
      const selection = window.getSelection()
      if (fieldOf(event.target) || (selection && !selection.isCollapsed && selection.toString() !== '')) return
      const node = findNode(state.document, state.selectedId)
      if (!node || !event.clipboardData) return
      const text = generateCode(node, { registry, platform: state.platform })
      event.clipboardData.setData('text/plain', text)
      event.clipboardData.setData(LAYER_MIME, layerClipboardData(node))
      event.preventDefault()
      copied.current = { text, tree: node }
      if (event.type === 'cut' && node.id !== state.document.id) actions.remove()
    }
    const onPaste = (event: ClipboardEvent) => {
      if (fieldOf(event.target) || !event.clipboardData) return
      const data = event.clipboardData.getData(LAYER_MIME)
      const last = copied.current
      const tree = data
        ? readLayerClipboard(registry, data)
        : last && event.clipboardData.getData('text/plain') === last.text
          ? last.tree
          : null
      if (!tree) return
      event.preventDefault()
      actions.paste(tree)
    }
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCopy)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCopy)
      document.removeEventListener('paste', onPaste)
    }
  }, [actions, layers, registry, state.document, state.platform, state.selectedId])
}
