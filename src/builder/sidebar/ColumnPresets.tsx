import { useMemo, useState, type FormEvent } from 'react'
import { COLUMN_PRESETS, GRID_COLUMNS, parseSpans } from '../../registry/columns'
import type { ConfigNode } from '../../registry/metadata'
import { useDragSource } from '../dnd/BuilderDnd'
import { useBuilderActions, useRegistry } from '../state/BuilderProvider'

/**
 * Layout presets: rows of columns whose spans add up to 12. Click one to add it inside the insertion
 * target, or drag it onto the canvas or the Layers tree. Shown only when the registry builds columns.
 */
export function ColumnPresets({ target }: { target: ConfigNode | null }) {
  const registry = useRegistry()
  const actions = useBuilderActions()
  const [open, setOpen] = useState(true)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState(false)
  // The drop rules check the row's root component, which is the same for every split.
  const root = useMemo(
    () => (registry.hasColumns ? registry.createColumns([GRID_COLUMNS]).component : null),
    [registry],
  )
  if (!root) return null
  const canInsert = target != null && registry.canPlace(root, target)
  const hint = target == null
    ? 'Select a layer that can hold components, or drag onto the canvas'
    : canInsert
      ? `Add inside ${target.label}`
      : `${target.label} cannot hold columns`

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const spans = parseSpans(custom)
    setError(spans == null)
    if (!spans || !canInsert) return
    actions.insertColumns(spans)
    setCustom('')
  }

  return (
    <section className="component-group">
      <h2>
        <button type="button" className="group-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          Columns
        </button>
      </h2>
      {open ? (
        <>
          <ul className="column-presets">
            {COLUMN_PRESETS.map((spans) => (
              <li key={spans.join('-')}>
                <ColumnPreset
                  spans={spans}
                  root={root}
                  disabled={!canInsert}
                  hint={hint}
                  onInsert={() => actions.insertColumns(spans)}
                />
              </li>
            ))}
          </ul>
          <form className="column-custom" onSubmit={submit}>
            <input
              className="control"
              aria-label="Custom columns"
              aria-invalid={error || undefined}
              aria-describedby={error ? 'column-custom-error' : undefined}
              placeholder="Custom, e.g. 3 9"
              value={custom}
              onChange={(event) => {
                setCustom(event.target.value)
                setError(false)
              }}
            />
            <button type="submit" className="text-btn" disabled={!canInsert} title={hint}>
              Add
            </button>
          </form>
          {error ? (
            <p id="column-custom-error" className="column-error">
              Use whole numbers that add up to {GRID_COLUMNS}, like 3 9.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function ColumnPreset({
  spans,
  root,
  disabled,
  hint,
  onInsert,
}: {
  spans: number[]
  root: string
  disabled: boolean
  hint: string
  onInsert: () => void
}) {
  const name = `Columns ${spans.join(' ')}`
  const { setNodeRef, listeners, attributes } = useDragSource(`columns:${spans.join('-')}`, {
    kind: 'columns',
    spans,
    component: root,
    label: name,
  })
  // Not `disabled`: a disabled button gets no pointer events, and the preset can still be dragged.
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="column-preset"
      {...attributes}
      {...listeners}
      aria-label={name}
      aria-disabled={disabled || undefined}
      title={hint}
      onClick={() => {
        if (!disabled) onInsert()
      }}
    >
      <span className="column-bars" aria-hidden="true">
        {spans.map((span, index) => <i key={index} style={{ flexGrow: span }} />)}
      </span>
      <span className="column-label">{spans.join(' ')}</span>
    </button>
  )
}
