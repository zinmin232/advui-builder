import { groupedProps, propsForPlatform } from '../../registry/adaptMeta'
import { breakpointAt } from '../../registry/responsive'
import { findPath } from '../selection/selection'
import { useBuilderActions, useBuilderState, useRegistry } from '../state/BuilderProvider'
import { InspectorBreadcrumb } from './InspectorBreadcrumb'
import { PlatformNotes } from './PlatformNotes'
import { PropertyEditor } from './PropertyEditor'

const groupLabels = {
  component: 'Component',
  appearance: 'Appearance',
  layout: 'Layout',
  typography: 'Typography',
  advanced: 'Advanced',
} as const

export function Inspector() {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const registry = useRegistry()
  const path = findPath(state.document, state.selectedId) ?? [state.document]
  const node = path[path.length - 1]
  const meta = registry.get(node.component)
  const sections = groupedProps(propsForPlatform(meta, state.platform))
  const values: Record<string, unknown> = { ...node.props }
  if (node.text != null) values.children = node.text
  const breakpoint = breakpointAt(registry.breakpoints, state.viewportWidth)

  return (
    <aside className="inspector" aria-label="Inspector">
      <InspectorBreadcrumb labels={path.map((item) => item.label)} ids={path.map((item) => item.id)} onSelect={actions.select} />
      <header className="inspector-head">
        <p>{meta.description}</p>
      </header>
      <PlatformNotes meta={meta} platform={state.platform} />
      {sections.map((section) => (
        <section key={section.group} className="prop-section">
          {section.group === 'component' ? null : <h3>{groupLabels[section.group]}</h3>}
          {section.props.map((prop) => (
            <PropertyEditor
              key={prop.key}
              prop={prop}
              meta={meta}
              values={values}
              breakpoints={registry.breakpoints}
              breakpoint={breakpoint}
              onChange={(key, value) => {
                const target = meta.props.find((item) => item.key === key)
                if (target?.textContent) {
                  actions.setText(node.id, String(value))
                  return
                }
                actions.setProp(node.id, key, value)
              }}
            />
          ))}
        </section>
      ))}
    </aside>
  )
}
