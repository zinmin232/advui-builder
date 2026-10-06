import {
  BooleanEditor,
  ColorEditor,
  IconEditor,
  JsonEditor,
  NumberEditor,
  RadiusEditor,
  ResponsiveEditor,
  responsiveTypes,
  SelectEditor,
  SpacingEditor,
  StringEditor,
  TypographyEditor,
} from '../../components/property-editors/editors'
import type { BreakpointMetadata, ComponentMetadata, PropMetadata } from '../../registry/metadata'

export function PropertyEditor({
  prop,
  meta,
  values,
  onChange,
  breakpoints = [],
  breakpoint = 'base',
}: {
  prop: PropMetadata
  meta: ComponentMetadata
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** The registry's breakpoints and the one the preview is at, for responsive props. */
  breakpoints?: readonly BreakpointMetadata[]
  breakpoint?: string
}) {
  const single = <SingleEditor prop={prop} meta={meta} values={values} onChange={onChange} />
  if (!prop.responsive || breakpoints.length === 0 || !responsiveTypes.has(prop.type)) return single
  return (
    <ResponsiveEditor
      prop={prop}
      value={values[prop.key]}
      onChange={(next) => onChange(prop.key, next)}
      breakpoints={breakpoints}
      active={breakpoint}
      single={single}
    />
  )
}

function SingleEditor({
  prop,
  meta,
  values,
  onChange,
}: {
  prop: PropMetadata
  meta: ComponentMetadata
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  // Typed fields show the default as a placeholder, so a cleared field stays empty instead of refilling.
  const typed = prop.textContent || ['string', 'number', 'spacing', 'radius'].includes(prop.type)
  const value = typed ? values[prop.key] : (values[prop.key] ?? prop.defaultValue)
  const change = (next: unknown) => onChange(prop.key, next)

  switch (prop.type) {
    case 'string':
      return <StringEditor prop={prop} value={value} onChange={change} />
    case 'number':
      return <NumberEditor prop={prop} value={value} onChange={change} />
    case 'boolean':
      return <BooleanEditor prop={prop} value={value ?? false} onChange={change} />
    case 'select':
      return <SelectEditor prop={prop} value={value} onChange={change} />
    case 'color':
      return <ColorEditor prop={prop} value={value} onChange={change} />
    case 'spacing':
      return <SpacingEditor prop={prop} value={value} onChange={change} />
    case 'radius':
      return <RadiusEditor prop={prop} value={value} onChange={change} />
    case 'typography':
      return <TypographyEditor meta={meta} values={values} onChange={onChange} />
    case 'icon':
      return <IconEditor prop={prop} value={value} onChange={change} />
    case 'object':
    case 'array':
      return <JsonEditor prop={prop} value={value} onChange={change} />
    default:
      return null
  }
}
