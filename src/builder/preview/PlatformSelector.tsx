import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { platformLabel } from '../../registry/adaptMeta'
import { platformList, type PlatformId } from '../../registry/metadata'
import { MAX_WIDTH, MIN_WIDTH, WIDTH_PRESETS, clampWidth } from '../state/builderState'

const deviceSizes = [
  { label: 'Phone', width: 390 },
  { label: 'Tablet', width: 768 },
] as const

const RESPONSIVE_WIDTH = 1024

const platformIcons: Record<PlatformId, ReactNode> = {
  web: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="#6EA8FF" strokeWidth="2" />
      <path d="M3 12h18" fill="none" stroke="#6EA8FF" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9s1.2-6.4 3.6-9z"
        fill="none"
        stroke="#6EA8FF"
        strokeWidth="2"
      />
    </svg>
  ),
  android: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M7.5 7 6 4.5M16.5 7 18 4.5" fill="none" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round" />
      <rect x="5" y="8" width="14" height="9" rx="4.5" fill="none" stroke="#3DDC84" strokeWidth="2" />
      <path d="M9 12.5h.01M15 12.5h.01" fill="none" stroke="#3DDC84" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 17v2.5M16 17v2.5" fill="none" stroke="#3DDC84" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  ios: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" fill="none" stroke="#F2F2F7" strokeWidth="2" />
      <rect x="8.5" y="6.5" width="7" height="11" rx="1" fill="#0A84FF" stroke="none" />
    </svg>
  ),
}

export function PlatformSelector({
  platform,
  width,
  onChange,
  onWidth,
}: {
  platform: PlatformId
  width: number
  onChange: (platform: PlatformId) => void
  onWidth: (width: number) => void
}) {
  const [openId, setOpenId] = useState<PlatformId | null>(null)
  const [draft, setDraft] = useState(String(width))
  const switchRef = useRef<HTMLDivElement>(null)
  const numberRef = useRef<HTMLInputElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (document.activeElement !== numberRef.current) setDraft(String(width))
  }, [width])

  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: PointerEvent) => {
      if (!switchRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openId])

  const commitDraft = () => {
    const next = Number(draft)
    if (!Number.isFinite(next)) {
      setDraft(String(width))
      return
    }
    onWidth(clampWidth(next))
  }

  const onNumberChange = (raw: string) => {
    setDraft(raw)
    const next = Number(raw)
    if (raw !== '' && Number.isFinite(next) && next >= MIN_WIDTH && next <= MAX_WIDTH) {
      onWidth(Math.round(next))
    }
  }

  const numberField = (
    <input
      ref={numberRef}
      className="width-number"
      aria-label={openId === 'web' ? 'Custom width' : 'Current width'}
      type="number"
      inputMode="numeric"
      min={MIN_WIDTH}
      max={MAX_WIDTH}
      value={draft}
      onChange={(event) => onNumberChange(event.target.value)}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )

  return (
    <div className="platform-switch" role="group" aria-label="Platform" ref={switchRef}>
      {platformList().map((item) => {
        const selected = item === platform
        const open = openId === item
        return (
          <div key={item} className={open ? 'platform-item open' : 'platform-item'}>
            <button
              type="button"
              className={selected ? 'platform-tab active' : 'platform-tab'}
              aria-pressed={selected}
              aria-label={platformLabel(item)}
              aria-expanded={open}
              aria-controls={open ? panelId : undefined}
              onClick={() => {
                if (platform !== item) onChange(item)
                setOpenId((current) => (platform === item && current === item ? null : item))
              }}
            >
              {platformIcons[item]}
              <span className="platform-tip" role="tooltip">
                {platformLabel(item)}
              </span>
            </button>
            {open && item === 'web' ? (
              <div className="toolbar-panel web-width-panel" id={panelId} role="group" aria-label="Web width">
                <div className="presets" role="group" aria-label="Width presets">
                  <button
                    type="button"
                    className={width === RESPONSIVE_WIDTH ? 'text-btn active' : 'text-btn'}
                    aria-pressed={width === RESPONSIVE_WIDTH}
                    onClick={() => onWidth(RESPONSIVE_WIDTH)}
                  >
                    Responsive
                  </button>
                  {WIDTH_PRESETS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={width === value ? 'text-btn active' : 'text-btn'}
                      aria-pressed={width === value}
                      onClick={() => onWidth(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="Preview width"
                  type="range"
                  min={MIN_WIDTH}
                  max={MAX_WIDTH}
                  value={width}
                  onChange={(event) => onWidth(Number(event.target.value))}
                />
                {numberField}
              </div>
            ) : null}
            {open && item !== 'web' ? (
              <div
                className="toolbar-panel device-width-panel"
                id={panelId}
                role="group"
                aria-label={`${platformLabel(item)} width`}
              >
                <div className="presets" role="group" aria-label="Device size">
                  {deviceSizes.map((size) => (
                    <button
                      key={size.label}
                      type="button"
                      className={width === size.width ? 'text-btn active' : 'text-btn'}
                      aria-pressed={width === size.width}
                      onClick={() => onWidth(size.width)}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="Preview width"
                  type="range"
                  min={MIN_WIDTH}
                  max={MAX_WIDTH}
                  value={width}
                  onChange={(event) => onWidth(Number(event.target.value))}
                />
                <span
                  className="pixel-box"
                  onMouseDown={(event) => {
                    const target = event.target
                    if (!(target instanceof HTMLElement) || target === numberRef.current) return
                    event.preventDefault()
                    numberRef.current?.focus()
                  }}
                >
                  {numberField}
                  <span className="pixel-unit">px</span>
                </span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
