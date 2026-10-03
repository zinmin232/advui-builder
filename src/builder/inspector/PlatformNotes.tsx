import { useState } from 'react'
import { platformLabel, platformNote } from '../../registry/adaptMeta'
import type { ComponentMetadata, PlatformId } from '../../registry/metadata'

export function PlatformNotes({ meta, platform }: { meta: ComponentMetadata; platform: PlatformId }) {
  const note = platformNote(meta, platform)
  const [open, setOpen] = useState(true)
  if (!note) return null
  return (
    <section className="notes">
      <button type="button" className="section-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{open ? '▾' : '▸'}</span>
        Platform notes · {platformLabel(platform)}
      </button>
      {open ? <p className="notes-body">{note}</p> : null}
    </section>
  )
}
