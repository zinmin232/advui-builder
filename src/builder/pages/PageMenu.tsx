import { useEffect, useId, useRef, useState } from 'react'
import { downloadFile } from '../download'
import { pageDocument } from '../state/builderState'
import { useBuilderState, usePageActions, usePages, useRegistry } from '../state/BuilderProvider'
import { componentName, pageFileName, pageFileText, PAGE_FILE_LIMIT, pascalCase, readPageFile } from './pageFile'
import { pageName, pagesByRecency, type SavedPage } from './pageStore'

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

/** Shows the stored value and commits the draft on blur (or Enter), so the field shows what the store kept. */
function SettingField({
  label,
  value,
  placeholder,
  multiline,
  onCommit,
}: {
  label: string
  value: string
  placeholder?: string
  multiline?: boolean
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const field = {
    className: 'page-name',
    value: draft ?? value,
    placeholder,
    onFocus: () => setDraft(value),
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onBlur: () => {
      if (draft !== null && draft !== value) onCommit(draft)
      setDraft(null)
    },
  }
  return (
    <label className="page-field">
      <span>{label}</span>
      {multiline ? (
        <textarea {...field} rows={2} maxLength={300} />
      ) : (
        <input
          {...field}
          maxLength={120}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      )}
    </label>
  )
}

/** What the exported file says beyond the tree: the component's name and, on web, the document metadata. */
function PageSettingsFields({ page }: { page: SavedPage }) {
  const actions = usePageActions()
  const settings = page.settings ?? {}
  return (
    <details className="page-settings">
      <summary>Page settings</summary>
      <SettingField
        label="Component name"
        value={settings.component ?? ''}
        placeholder={componentName(page.name)}
        onCommit={(value) => actions.configure(page.id, { component: pascalCase(value) ?? '' })}
      />
      <SettingField
        label="Title"
        value={settings.title ?? ''}
        onCommit={(value) => actions.configure(page.id, { title: value })}
      />
      <SettingField
        label="Description"
        value={settings.description ?? ''}
        multiline
        onCommit={(value) => actions.configure(page.id, { description: value })}
      />
      <p className="page-note">
        The Code tab exports the page as this component. On web it sets the title and description with React’s{' '}
        <code>&lt;title&gt;</code> and <code>&lt;meta&gt;</code>.
      </p>
    </details>
  )
}

/**
 * The page name in the top bar. It opens the saved pages: rename, open, duplicate, delete, start a new one, change
 * the page's settings, or move a page between browsers as a file.
 */
export function PageMenu() {
  const { pages, current, status } = usePages()
  const actions = usePageActions()
  const registry = useRegistry()
  const tree = pageDocument(useBuilderState())
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  // Null while the name field is not being edited, so it shows the stored name (like SettingField).
  const [draft, setDraft] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const name = current?.name ?? 'Untitled page'

  const toggle = () => {
    if (!open) {
      setConfirming(null)
      setImportError(null)
    }
    setOpen(!open)
  }

  useEffect(() => {
    if (!open) return
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
    if (current && draft !== null && draft !== current.name && pageName(draft)) actions.rename(current.id, draft)
    setDraft(null)
  }

  const exportPage = () => {
    if (current && tree) downloadFile(pageFileName(current.name), pageFileText(current, tree), 'application/json')
  }

  const importPage = async (file: File) => {
    if (file.size > PAGE_FILE_LIMIT) {
      setImportError('This file is too large to be a page.')
      return
    }
    const result = readPageFile(registry, await file.text())
    if (!result.ok) {
      setImportError(result.error)
      return
    }
    actions.importPage(result.page)
    setOpen(false)
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
        onClick={toggle}
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
            <>
              <input
                className="page-name"
                aria-label="Page name"
                value={draft ?? current.name}
                maxLength={80}
                onFocus={() => setDraft(current.name)}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                }}
              />
              <PageSettingsFields page={current} />
            </>
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
                          <rect
                            x="8"
                            y="8"
                            width="12"
                            height="12"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
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
            <div className="page-panel-actions">
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
              <span className="spacer" />
              <button
                type="button"
                className="text-btn"
                title="Open a .page.json file as a new page"
                onClick={() => fileRef.current?.click()}
              >
                Import
              </button>
              <button
                type="button"
                className="text-btn"
                title="Download this page as a .page.json file"
                disabled={!current || !tree}
                onClick={exportPage}
              >
                Export
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                hidden
                aria-label="Page file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  setImportError(null)
                  if (file) void importPage(file)
                }}
              />
            </div>
            {importError ? (
              <p className="page-note warning" role="alert">
                {importError}
              </p>
            ) : null}
            <span className={status === 'saved' ? 'page-note' : 'page-note warning'}>{statusNotes[status]}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
