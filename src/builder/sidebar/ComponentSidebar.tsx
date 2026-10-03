import { useMemo, useState } from 'react'
import { useDragSource } from '../dnd/BuilderDnd'
import { findNode } from '../selection/selection'
import { insertionTarget } from '../state/builderState'
import {
  useBuilderActions,
  useBuilderState,
  usePreferenceActions,
  usePreferences,
  useRegistry,
} from '../state/BuilderProvider'

export function ComponentSidebar() {
  const state = useBuilderState()
  const { document, mode } = state
  const actions = useBuilderActions()
  const preferences = usePreferences()
  const preferenceActions = usePreferenceActions()
  const registry = useRegistry()
  const [query, setQuery] = useState('')
  const entries = registry.sidebarEntries()
  // Groups follow the first entry of each category; the label comes from that entry's metadata.
  const categories = useMemo(() => {
    const groups = new Map<string, string>()
    for (const entry of entries) if (!groups.has(entry.categoryId)) groups.set(entry.categoryId, entry.category)
    return [...groups].map(([id, label]) => ({ id, label }))
  }, [entries])
  const results = registry.search(query)
  const recent = preferences.recent
    .map((name) => entries.find((entry) => entry.name === name))
    .filter((entry) => entry != null)
  const favorites = preferences.favorites
    .map((name) => entries.find((entry) => entry.name === name))
    .filter((entry) => entry != null)
  const showGroups = query.trim() === ''
  const targetId = insertionTarget(registry, state)
  const target = targetId ? findNode(document, targetId) : null
  const groupProps = {
    // In Page mode a click adds to the page, so no entry is the "open" one.
    selected: mode === 'page' ? null : state.selectedComponent,
    favorites: preferences.favorites,
    onOpen: actions.openComponent,
    onFavorite: preferenceActions.toggleFavorite,
    onInsert: actions.insertComponent,
    insertLabel: target?.label ?? null,
    canInsert: (name: string) => target != null && registry.canPlace(name, target),
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
          {target ? `Add inside ${target.label}` : 'Select a layer that can hold components to add one'}
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
  canInsert,
}: {
  title: string
  entries: { name: string; description: string }[]
  selected: string | null
  favorites: string[]
  onOpen: (name: string) => void
  onFavorite: (name: string) => void
  onInsert: (name: string) => void
  insertLabel: string | null
  canInsert: (name: string) => boolean
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
              <PaletteItem
                group={title}
                name={entry.name}
                active={selected === entry.name}
                onOpen={() => onOpen(entry.name)}
              />
              <button
                type="button"
                className="insert"
                aria-label={insertLabel ? `Add ${entry.name} inside ${insertLabel}` : `Add ${entry.name}`}
                title={
                  insertLabel == null
                    ? 'Select a layer that can hold components'
                    : canInsert(entry.name)
                      ? `Add inside ${insertLabel}`
                      : `${insertLabel} cannot hold ${entry.name}`
                }
                disabled={!canInsert(entry.name)}
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

/** A sidebar entry: click to open or add it, or drag it onto the canvas or the Layers tree. */
function PaletteItem({
  group,
  name,
  active,
  onOpen,
}: {
  group: string
  name: string
  active: boolean
  onOpen: () => void
}) {
  // The same component can be listed under Favorites, Recent, and its category, so the id includes the group.
  const { setNodeRef, listeners, attributes } = useDragSource(`palette:${group}:${name}`, {
    kind: 'palette',
    component: name,
    label: name,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={active ? 'component-item active' : 'component-item'}
      {...attributes}
      {...listeners}
      onClick={onOpen}
    >
      <span>{name}</span>
    </button>
  )
}
