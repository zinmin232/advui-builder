import { useLayoutEffect, useState } from 'react'
import { findNode } from '../selection/selection'
import type { ConfigNode } from '../../registry/metadata'
import { useBuilderActions } from '../state/BuilderProvider'

interface Box {
  top: number
  left: number
  width: number
  height: number
  label: string
}

function measure(container: HTMLElement, id: string, zoom: number, root: ConfigNode): Box | null {
  const host = container.querySelector(`[data-builder-id="${CSS.escape(id)}"]`)
  if (!(host instanceof HTMLElement)) return null
  const target = host.getBoundingClientRect().width > 0 ? host : host.firstElementChild
  if (!(target instanceof HTMLElement)) return null
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const origin = container.getBoundingClientRect()
  const node = findNode(root, id)
  return {
    top: (rect.top - origin.top) / zoom,
    left: (rect.left - origin.left) / zoom,
    width: rect.width / zoom,
    height: rect.height / zoom,
    label: node?.label ?? id,
  }
}

export function SelectionOverlay({
  container,
  root,
  selectedId,
  hoverId,
  zoom,
}: {
  container: HTMLElement | null
  root: ConfigNode
  selectedId: string
  hoverId: string | null
  zoom: number
}) {
  const actions = useBuilderActions()
  const [hover, setHover] = useState<Box | null>(null)
  const [selected, setSelected] = useState<Box | null>(null)

  useLayoutEffect(() => {
    if (!container) return
    const update = () => {
      setSelected(measure(container, selectedId, zoom, root))
      setHover(hoverId && hoverId !== selectedId ? measure(container, hoverId, zoom, root) : null)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    container.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      container.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [container, hoverId, root, selectedId, zoom])

  return (
    <div className="overlay">
      {hover ? <div className="outline hover" style={frameStyle(hover)} aria-hidden="true" /> : null}
      {selected ? (
        <div className="outline selected" style={frameStyle(selected)}>
          <span className="outline-tag" aria-hidden="true">{selected.label}</span>
          {selectedId !== root.id ? (
            <>
              <button
                type="button"
                className="outline-duplicate"
                aria-label={`Duplicate ${selected.label}`}
                onClick={(event) => {
                  event.stopPropagation()
                  actions.duplicate()
                }}
              >
                ⧉
              </button>
              <button
                type="button"
                className="outline-remove"
                aria-label={`Remove ${selected.label}`}
                title="Remove (Delete)"
                onClick={(event) => {
                  event.stopPropagation()
                  actions.remove()
                }}
              >
                ×
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function frameStyle(box: Box) {
  return { top: box.top, left: box.left, width: box.width, height: box.height }
}
