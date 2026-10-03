export function InspectorBreadcrumb({
  labels,
  ids,
  onSelect,
}: {
  labels: string[]
  ids: string[]
  onSelect: (id: string) => void
}) {
  if (labels.length === 0) return null
  return (
    <nav className="breadcrumb" aria-label="Selection">
      {labels.map((label, index) => {
        const id = ids[index]
        const last = index === labels.length - 1
        return (
          <span key={id} className="crumb">
            {index > 0 ? <span className="crumb-sep">›</span> : null}
            <button
              type="button"
              className={last ? 'crumb-btn current' : 'crumb-btn'}
              aria-current={last ? 'true' : undefined}
              onClick={() => onSelect(id)}
            >
              {label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}
