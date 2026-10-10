import type { ReactNode } from 'react'
import { platformLabel } from '../../registry/adaptMeta'
import { platformList, type PlatformId } from '../../registry/metadata'

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

/** Switches the preview platform. Each platform starts at its own width; the toolbar's width control changes it. */
export function PlatformSelector({
  platform,
  onChange,
}: {
  platform: PlatformId
  onChange: (platform: PlatformId) => void
}) {
  return (
    <div className="platform-switch" role="group" aria-label="Platform">
      {platformList().map((item) => (
        <button
          key={item}
          type="button"
          className={item === platform ? 'platform-tab active' : 'platform-tab'}
          aria-pressed={item === platform}
          aria-label={platformLabel(item)}
          onClick={() => {
            if (item !== platform) onChange(item)
          }}
        >
          {platformIcons[item]}
          <span className="platform-tip" role="tooltip">
            {platformLabel(item)}
          </span>
        </button>
      ))}
    </div>
  )
}
