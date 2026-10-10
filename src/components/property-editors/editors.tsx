import { useEffect, useState, type ReactNode } from 'react'
import type { BreakpointMetadata, ComponentMetadata, PropMetadata } from '../../registry/metadata'
import { BASE, breakpointKeys, isResponsiveMap, ownValue, valueAt, withValueAt } from '../../registry/responsive'

interface EditorProps {
  prop: PropMetadata
  value: unknown
  onChange: (value: unknown) => void
}

function LabelText({ label, description }: { label: string; description?: string }) {
  return (
    <span className={description ? 'field-label has-tip' : 'field-label'}>
      {label}
      {description ? (
        <span className="field-tip" role="tooltip">
          {description}
        </span>
      ) : null}
    </span>
  )
}

function Field({
  label,
  children,
  description,
  message,
}: {
  label: string
  children: ReactNode
  description?: string
  message?: string
}) {
  return (
    <div className="field">
      <label>
        <LabelText label={label} description={description} />
        {children}
      </label>
      {message ? <span className="field-help">{message}</span> : null}
    </div>
  )
}

export function StringEditor({ prop, value, onChange }: EditorProps) {
  return (
    <Field label={prop.label} description={prop.description}>
      <input
        className="control"
        type="text"
        aria-label={prop.label}
        value={typeof value === 'string' ? value : ''}
        placeholder={prop.defaultValue != null ? String(prop.defaultValue) : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

export function NumberEditor({ prop, value, onChange }: EditorProps) {
  const current = typeof value === 'number' ? value : ''
  return (
    <Field label={prop.label} description={prop.description}>
      <input
        className="control"
        type="number"
        aria-label={prop.label}
        min={prop.min}
        max={prop.max}
        step={prop.step ?? 1}
        value={current}
        placeholder={prop.defaultValue != null ? String(prop.defaultValue) : ''}
        onChange={(event) => {
          const next = event.target.value
          onChange(next === '' ? undefined : Number(next))
        }}
      />
    </Field>
  )
}

export function BooleanEditor({ prop, value, onChange }: EditorProps) {
  const checked = Boolean(value)
  return (
    <div className="field field-check">
      <label>
        <input type="checkbox" aria-label={prop.label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <LabelText label={prop.label} description={prop.description} />
      </label>
    </div>
  )
}

export function SelectEditor({ prop, value, onChange }: EditorProps) {
  const current = value == null || value === '' ? '' : String(value)
  return (
    <Field label={prop.label} description={prop.description}>
      <select className="control" aria-label={prop.label} value={current} onChange={(event) => onChange(event.target.value)}>
        {prop.defaultValue == null ? <option value="">Default</option> : null}
        {(prop.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function ColorEditor({ prop, value, onChange }: EditorProps) {
  const hex = typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  const [draft, setDraft] = useState(typeof value === 'string' ? value : '')
  useEffect(() => {
    setDraft(typeof value === 'string' ? value : '')
  }, [value])
  return (
    <Field label={prop.label} description={prop.description}>
      <span className="color-row">
        <input
          aria-label={`${prop.label} swatch`}
          className="swatch"
          type="color"
          value={hex}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          className="control"
          type="text"
          value={draft}
          placeholder="#RRGGBB or $token"
          onChange={(event) => {
            const next = event.target.value
            setDraft(next)
            if (next === '') onChange(undefined)
            else if (/^#[0-9a-fA-F]{6}$/.test(next) || next.startsWith('$')) onChange(next)
          }}
        />
      </span>
    </Field>
  )
}

export function SpacingEditor({ prop, value, onChange }: EditorProps) {
  return (
    <Field label={prop.label} description={prop.description}>
      <span className="unit-row">
        <input
          className="control"
          type="number"
          aria-label={prop.label}
          min={prop.min ?? 0}
          max={prop.max ?? 64}
          step={prop.step ?? 1}
          value={typeof value === 'number' ? value : ''}
          placeholder={prop.defaultValue != null ? String(prop.defaultValue) : ''}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === '' ? undefined : Number(next))
          }}
        />
        <span className="unit">px</span>
      </span>
    </Field>
  )
}

export function RadiusEditor(props: EditorProps) {
  return <SpacingEditor {...props} />
}

/** Prop types the per-breakpoint editor can show in a row. */
export const responsiveTypes = new Set<PropMetadata['type']>(['select', 'number', 'spacing', 'string'])

/** One bare input for a breakpoint row. Empty means `inherited`, the value from the breakpoint below. */
function BreakpointControl({
  prop,
  value,
  onChange,
  label,
  inherited,
  base,
}: EditorProps & { label: string; inherited: unknown; base: boolean }) {
  const hint = inherited != null ? String(inherited) : ''
  const clear = (raw: string) => (raw === '' ? undefined : raw)
  if (prop.type === 'select') {
    const shown = prop.options?.find((option) => option.value === hint)?.label ?? hint
    const empty = hint ? `${base ? 'Default' : 'Inherit'} (${shown})` : 'Default'
    return (
      <select
        className="control"
        aria-label={label}
        value={value == null ? '' : String(value)}
        onChange={(event) => onChange(clear(event.target.value))}
      >
        <option value="">{empty}</option>
        {(prop.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (prop.type === 'string') {
    return (
      <input
        className="control"
        type="text"
        aria-label={label}
        value={typeof value === 'string' ? value : ''}
        placeholder={hint}
        onChange={(event) => onChange(clear(event.target.value))}
      />
    )
  }
  return (
    <input
      className="control"
      type="number"
      aria-label={label}
      min={prop.min}
      max={prop.max}
      step={prop.step ?? 1}
      value={typeof value === 'number' ? value : ''}
      placeholder={hint}
      onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
    />
  )
}

/**
 * A responsive prop: one value in the prop's usual editor (`single`), or a value per breakpoint, mobile-first. An
 * empty breakpoint inherits the value below it. The row for the preview's breakpoint is marked.
 */
export function ResponsiveEditor({
  prop,
  value,
  onChange,
  breakpoints,
  active,
  single,
}: EditorProps & { breakpoints: readonly BreakpointMetadata[]; active: string; single: ReactNode }) {
  const keys = breakpointKeys(breakpoints)
  const map = isResponsiveMap(value)
  const [open, setOpen] = useState(false)
  const expanded = open || map
  const toggle = (
    <button
      type="button"
      className="text-btn breakpoint-toggle"
      aria-pressed={expanded}
      aria-label={`${prop.label} per breakpoint`}
      title={expanded ? 'Use one value for every screen size' : 'Set a value per screen size'}
      onClick={() => {
        // Back to one value: keep the one the preview shows now.
        if (map) onChange(valueAt(value, active, keys))
        setOpen(!expanded)
      }}
    >
      Per size
    </button>
  )
  if (!expanded) {
    return (
      <div className="responsive-field">
        {toggle}
        {single}
      </div>
    )
  }
  const minWidth = (key: string) => breakpoints.find((breakpoint) => breakpoint.name === key)?.minWidth
  return (
    <div className="field responsive-field">
      {toggle}
      <LabelText label={prop.label} description={prop.description} />
      <div className="breakpoint-rows" role="group" aria-label={`${prop.label} by breakpoint`}>
        {keys.map((key, index) => (
          <div
            key={key}
            className={key === active ? 'breakpoint-row active' : 'breakpoint-row'}
            aria-current={key === active || undefined}
          >
            <span className="breakpoint-name">
              {key === BASE ? 'Base' : key}
              {key === BASE ? null : <small>{minWidth(key)}+</small>}
            </span>
            <BreakpointControl
              prop={prop}
              label={`${prop.label} at ${key}`}
              base={index === 0}
              value={ownValue(value, key)}
              inherited={(index === 0 ? undefined : valueAt(value, keys[index - 1], keys)) ?? prop.defaultValue}
              onChange={(next) => onChange(withValueAt(value, key, next, keys))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function TypographyEditor({
  meta,
  values,
  onChange,
}: {
  meta: ComponentMetadata
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const fields = meta.props.filter((prop) => prop.type === 'select' && ['size', 'weight', 'tone'].includes(prop.key))
  return (
    <div className="stack">
      {fields.map((prop) => (
        <SelectEditor
          key={prop.key}
          prop={prop}
          value={values[prop.key] ?? prop.defaultValue}
          onChange={(value) => onChange(prop.key, value)}
        />
      ))}
    </div>
  )
}

export function IconEditor({ prop, value, onChange }: EditorProps) {
  return (
    <Field label={prop.label} description={prop.description}>
      <input
        className="control"
        type="text"
        value={typeof value === 'string' ? value : ''}
        placeholder="Icon name"
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

export function JsonEditor({ prop, value, onChange }: EditorProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(value ?? (prop.type === 'array' ? [] : {}), null, 2))
  const [error, setError] = useState<string | null>(null)
  return (
    <Field label={prop.label} description={prop.description} message={error ?? undefined}>
      <textarea
        className="control code-input"
        rows={4}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          try {
            onChange(JSON.parse(draft))
            setError(null)
          } catch {
            setError('Enter valid JSON')
          }
        }}
      />
    </Field>
  )
}
