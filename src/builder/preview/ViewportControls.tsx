import { useEffect, useId, useRef, useState } from 'react'
import { MAX_WIDTH, MIN_WIDTH, WIDTH_PRESETS, clampWidth } from '../state/builderState'

export function ViewportControls({
  width,
  onWidth,
}: {
  width: number
  onWidth: (width: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(width))
  const widthRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const preset = WIDTH_PRESETS.find((value) => value === width)

  useEffect(() => {
    if (document.activeElement !== numberRef.current) setDraft(String(width))
  }, [width])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!widthRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const commitDraft = () => {
    const next = Number(draft)
    if (!Number.isFinite(next)) {
      setDraft(String(width))
      return
    }
    onWidth(clampWidth(next))
  }

  return (
    <div className="viewport-controls">
      <div className="width-control" ref={widthRef}>
        <button
          type="button"
          className={open ? 'icon-btn active' : 'icon-btn'}
          aria-label="Width"
          aria-expanded={open}
          aria-controls={panelId}
          title="Width"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path
              d="M4 7v10M20 7v10M4 12h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <span className="width-readout">{width}px</span>
        {open ? (
          <div className="toolbar-panel width-panel" id={panelId} role="group" aria-label="Width settings">
            <input
              aria-label="Preview width"
              type="range"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              value={width}
              onChange={(event) => onWidth(Number(event.target.value))}
            />
            <span className="width-readout">{width}px</span>
            <div className="presets" role="group" aria-label="Width presets">
              {WIDTH_PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={preset === value ? 'text-btn active' : 'text-btn'}
                  aria-pressed={preset === value}
                  onClick={() => onWidth(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <input
              ref={numberRef}
              className="width-number"
              aria-label="Custom width"
              type="number"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
