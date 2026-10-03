import { useEffect, useId, useRef, useState } from 'react'
import { canvasForTheme } from '../canvasTheme'
import { ViewportControls } from './ViewportControls'

function swatchColor(background: string, theme: 'light' | 'dark'): string {
  return /^#[0-9a-fA-F]{6}$/.test(background) ? background : canvasForTheme(theme)
}

function parseHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map((channel) => channel + channel)
      .join('')
    return `#${expanded.toUpperCase()}`
  }
  return null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.min(255, Math.max(0, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

function RgbChannel({
  label,
  name,
  value,
  onCommit,
}: {
  label: string
  name: string
  value: number
  onCommit: (value: number) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(String(value))
  }, [value])

  const commit = (raw: string) => {
    const next = Number(raw)
    if (!Number.isFinite(next)) {
      setDraft(String(value))
      return
    }
    onCommit(Math.min(255, Math.max(0, Math.round(next))))
  }

  return (
    <label>
      {label}
      <input
        ref={ref}
        className="width-number"
        aria-label={name}
        type="number"
        min={0}
        max={255}
        value={draft}
        onChange={(event) => {
          const raw = event.target.value
          setDraft(raw)
          const next = Number(raw)
          if (raw !== '' && Number.isFinite(next) && next >= 0 && next <= 255) onCommit(Math.round(next))
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
    </label>
  )
}

export function PreviewToolbar({
  width,
  background,
  theme,
  zoom,
  onWidth,
  onBackground,
  onZoom,
}: {
  width: number
  background: string
  theme: 'light' | 'dark'
  zoom: number
  onWidth: (width: number) => void
  onBackground: (background: string) => void
  onZoom: (zoom: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [colorMode, setColorMode] = useState<'hex' | 'rgb'>('hex')
  const zoomRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const hexRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const colorPanelId = useId()
  const percent = Math.round(zoom * 100)
  const swatch = swatchColor(background, theme)
  const [hexDraft, setHexDraft] = useState(swatch.toUpperCase())
  const rgb = hexToRgb(swatch)

  useEffect(() => {
    if (document.activeElement !== hexRef.current) setHexDraft(swatch.toUpperCase())
  }, [swatch])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!zoomRef.current?.contains(event.target as Node)) setOpen(false)
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

  useEffect(() => {
    if (!colorOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!colorRef.current?.contains(event.target as Node)) setColorOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setColorOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [colorOpen])

  const commitHex = (raw: string) => {
    const next = parseHex(raw)
    if (!next) {
      setHexDraft(swatch.toUpperCase())
      return
    }
    onBackground(next)
  }

  const commitChannel = (channel: 'r' | 'g' | 'b', value: number) => {
    onBackground(rgbToHex(channel === 'r' ? value : rgb.r, channel === 'g' ? value : rgb.g, channel === 'b' ? value : rgb.b))
  }

  const fit = () => {
    const canvas = document.querySelector('.preview .canvas')
    if (!(canvas instanceof HTMLElement)) return
    const available = Math.max(160, canvas.clientWidth - 64)
    onZoom(available / width)
  }

  return (
    <div className="view-tools">
        <div className={colorOpen ? 'bg-control open' : 'bg-control'} ref={colorRef}>
          <button
            type="button"
            className="color-swatch"
            aria-label="Background Color"
            aria-expanded={colorOpen}
            aria-controls={colorOpen ? colorPanelId : undefined}
            onClick={() => {
              setColorMode('hex')
              setColorOpen((value) => !value)
            }}
          >
            <span className="color-swatch-fill" style={{ background: swatch }} />
            <span className="platform-tip" role="tooltip">
              Background Color
            </span>
          </button>
          <span className="mono">{swatch.toUpperCase()}</span>
          {colorOpen ? (
            <div className="toolbar-panel color-panel" id={colorPanelId} role="group" aria-label="Background color">
              <div className="presets" role="group" aria-label="Color format">
                <button
                  type="button"
                  className={colorMode === 'hex' ? 'text-btn active' : 'text-btn'}
                  aria-pressed={colorMode === 'hex'}
                  onClick={() => setColorMode('hex')}
                >
                  HEX
                </button>
                <button
                  type="button"
                  className={colorMode === 'rgb' ? 'text-btn active' : 'text-btn'}
                  aria-pressed={colorMode === 'rgb'}
                  onClick={() => setColorMode('rgb')}
                >
                  RGB
                </button>
              </div>
              {colorMode === 'hex' ? (
                <input
                  ref={hexRef}
                  className="width-number hex-input"
                  aria-label="Hex color"
                  value={hexDraft}
                  spellCheck={false}
                  onChange={(event) => {
                    const raw = event.target.value
                    setHexDraft(raw)
                    const next = parseHex(raw)
                    if (next) onBackground(next)
                  }}
                  onBlur={() => commitHex(hexDraft)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                />
              ) : (
                <div className="rgb-fields">
                  <RgbChannel label="R" name="Red" value={rgb.r} onCommit={(value) => commitChannel('r', value)} />
                  <RgbChannel label="G" name="Green" value={rgb.g} onCommit={(value) => commitChannel('g', value)} />
                  <RgbChannel label="B" name="Blue" value={rgb.b} onCommit={(value) => commitChannel('b', value)} />
                </div>
              )}
            </div>
          ) : null}
        </div>
        <div className="zoom" ref={zoomRef}>
          <button
            type="button"
            className={open ? 'icon-btn active' : 'icon-btn'}
            aria-label="Zoom"
            aria-expanded={open}
            aria-controls={panelId}
            title="Zoom"
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="m20 20-3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span className="width-readout">{percent}%</span>
          {open ? (
            <div className="toolbar-panel zoom-panel" id={panelId} role="group" aria-label="Zoom settings">
              <input
                aria-label="Zoom level"
                type="range"
                min={50}
                max={150}
                value={percent}
                onChange={(event) => onZoom(Number(event.target.value) / 100)}
              />
              <span className="width-readout">{percent}%</span>
              <button type="button" className="text-btn" onClick={fit}>
                Fit
              </button>
              <button type="button" className="text-btn" onClick={() => onZoom(1)}>
                100%
              </button>
            </div>
          ) : null}
        </div>
        <ViewportControls width={width} onWidth={onWidth} />
    </div>
  )
}
