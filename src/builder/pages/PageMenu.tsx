import { useEffect, useId, useRef, useState } from 'react'
import { usePageActions, usePages } from '../state/BuilderProvider'
import { pageName, pagesByRecency } from './pageStore'

const statusNotes = {
  saved: 'Pages are saved in this browser as you edit.',
  failed: 'Not saved: this browser’s storage is full or blocked. Copy a link to keep this page.',
  off: 'Pages are not saved here. Copy a link to keep this page.',
} as const

/** Today's pages show the time; older ones the date. */
function editedAt(time: number): string {
  if (!time) return ''
  const date = new Date(time)
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** The page name in the top bar. It opens the saved pages: rename, open, duplicate, delete, or start a new one. */
export function PageMenu() {
  const { pages, current, status } = usePages()
  const actions = usePageActions()
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [draft, setDraft] = useState(current?.name ?? '')
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const name = current?.name ?? 'Untitled page'

  useEffect(() => {
    setDraft(current?.name ?? '')
  }, [current?.name, open])

  useEffect(() => {
    if (!open) {
      setConfirming(null)
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
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

  const commitName = () => {
    if (current && pageName(draft)) actions.rename(current.id, draft)
    else setDraft(current?.name ?? '')
  }

  return (
    <div className="page-menu" ref={rootRef}>
      <button
        type="button"
        className={open ? 'page-menu-btn active' : 'page-menu-btn'}
        aria-label={`Pages: ${name}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={statusNotes[status]}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="page-menu-name">{name}</span>
        {status === 'failed' ? <span className="page-unsaved">Not saved</span> : null}
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="toolbar-panel page-panel" id={panelId} role="dialog" aria-label="Pages">
          {current ? (
            <input
              className="page-name"
              aria-label="Page name"
              value={draft}
              maxLength={80}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
          ) : null}
          <ul className="page-list" aria-label="Saved pages">
            {pagesByRecency(pages).map((page) => {
              const isCurrent = page.id === current?.id
              return (
                <li key={page.id} className={isCurrent ? 'page-row current' : 'page-row'}>
                  {confirming === page.id ? (
                    <div className="page-confirm">
                      <span className="page-confirm-text">Delete “{page.name}”? This can’t be undone.</span>
                      <button
                        type="button"
                        className="text-btn danger"
                        onClick={() => {
                          setConfirming(null)
                          actions.remove(page.id)
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" className="text-btn" onClick={() => setConfirming(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="page-open"
                        aria-current={isCurrent ? 'page' : undefined}
                        onClick={() => {
                          actions.open(page.id)
                          setOpen(false)
                        }}
                      >
                        <span className="page-open-name">{page.name}</span>
                        <span className="page-time">{editedAt(page.updatedAt)}</span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Duplicate ${page.name}`}
                        title="Duplicate"
                        onClick={() => actions.duplicate(page.id)}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                          <rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete ${page.name}`}
                        title="Delete"
                        onClick={() => setConfirming(page.id)}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                          <path
                            d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="page-panel-foot">
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                actions.create()
                setOpen(false)
              }}
            >
              New page
            </button>
            <span className={status === 'saved' ? 'page-note' : 'page-note warning'}>{statusNotes[status]}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
