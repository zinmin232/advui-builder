import { useMemo, useState } from 'react'
import { categoryLabels } from '../../registry/advuiMetaTypes'
import { searchComponents, sidebarEntries } from '../../registry/componentRegistry'
import { findNode, insertTargetId } from '../selection/selection'
import { useBuilderActions, useBuilderState, usePreferenceActions, usePreferences } from '../state/BuilderProvider'

export function ComponentSidebar() {
  const { selectedComponent, document, selectedId } = useBuilderState()
  const actions = useBuilderActions()
  const preferences = usePreferences()
  const preferenceActions = usePreferenceActions()
  const [query, setQuery] = useState('')
  const entries = sidebarEntries()
  const categories = useMemo(() => {
    const ids = [...new Set(entries.map((entry) => entry.categoryId))]
    return ids.map((id) => ({ id, label: categoryLabels[id as keyof typeof categoryLabels] ?? id }))
  }, [entries])
  const results = searchComponents(query)
  const recent = preferences.recent
    .map((name) => entries.find((entry) => entry.name === name))
    .filter((entry) => entry != null)
  const favorites = preferences.favorites
    .map((name) => entries.find((entry) => entry.name === name))
    .filter((entry) => entry != null)
  const showGroups = query.trim() === ''
  const targetId = insertTargetId(document, selectedId)
  const target = targetId ? findNode(document, targetId) : null
  const groupProps = {
    selected: selectedComponent,
    favorites: preferences.favorites,
    onOpen: actions.selectComponent,
    onFavorite: preferenceActions.toggleFavorite,
    onInsert: actions.insertComponent,
    insertLabel: target?.label ?? null,
  }

  return (
    <aside className="sidebar" aria-label="Components">
      <div className="sidebar-head">
        <h2>Components</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Collapse components"
          aria-pressed={false}
          onClick={() => preferenceActions.update({ sidebarCollapsed: true })}
        >
          ☰
        </button>
      </div>
      <label className="search">
        <span className="sr">Search components</span>
        <input
          placeholder="Search components..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="sidebar-scroll">
        <p className="insert-hint">
          {target ? `Add inside ${target.label}` : 'Select a layout, Card, Header, Content, or Footer to add a component'}
        </p>
        {showGroups && favorites.length > 0 ? (
          <ComponentGroup title="Favorites" entries={favorites} {...groupProps} />
        ) : null}
        {showGroups && recent.length > 0 ? (
          <ComponentGroup title="Recent" entries={recent} {...groupProps} />
        ) : null}
        {showGroups
          ? categories.map((item) => (
              <ComponentGroup
                key={item.id}
                title={item.label}
                entries={entries.filter((entry) => entry.categoryId === item.id)}
                {...groupProps}
              />
            ))
          : (
            <ComponentGroup
              title="Results"
              entries={results}
              {...groupProps}
            />
          )}
        {!showGroups && results.length === 0 ? <p className="empty">No components match.</p> : null}
      </div>
    </aside>
  )
}

function ComponentGroup({
  title,
  entries,
  selected,
  favorites,
  onOpen,
  onFavorite,
  onInsert,
  insertLabel,
}: {
  title: string
  entries: { name: string; description: string }[]
  selected: string
  favorites: string[]
  onOpen: (name: string) => void
  onFavorite: (name: string) => void
  onInsert: (name: string) => void
  insertLabel: string | null
}) {
  const [open, setOpen] = useState(true)
  if (entries.length === 0) return null
  return (
    <section className="component-group">
      <h2>
        <button
          type="button"
          className="group-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          {title}
        </button>
      </h2>
      {open ? <ul>
        {entries.map((entry) => {
          const favorite = favorites.includes(entry.name)
          return (
            <li key={`${title}-${entry.name}`}>
              <button
                type="button"
                className={selected === entry.name ? 'component-item active' : 'component-item'}
                onClick={() => onOpen(entry.name)}
              >
                <span>{entry.name}</span>
              </button>
              <button
                type="button"
                className="insert"
                aria-label={insertLabel ? `Add ${entry.name} inside ${insertLabel}` : `Add ${entry.name}`}
                title={insertLabel ? `Add inside ${insertLabel}` : 'Select a layer that can hold components'}
                disabled={insertLabel == null}
                onClick={() => onInsert(entry.name)}
              >
                +
              </button>
              <button
                type="button"
                className={favorite ? 'star on' : 'star'}
                aria-pressed={favorite}
                aria-label={`${favorite ? 'Remove' : 'Add'} ${entry.name} favorite`}
                onClick={() => onFavorite(entry.name)}
              >
                {favorite ? '★' : '☆'}
              </button>
            </li>
          )
        })}
      </ul> : null}
    </section>
  )
}
