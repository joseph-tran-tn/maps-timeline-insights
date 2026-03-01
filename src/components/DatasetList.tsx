import { useTimeline } from '@/context/TimelineContext'

export function DatasetList() {
  const { datasets, selectedDatasetIds, toggleDataset, removeDataset } = useTimeline()

  if (datasets.length === 0) return null

  return (
    <div className="dataset-list">
      <h3 className="dataset-list-title">Datasets ({datasets.length})</h3>
      <p className="dataset-list-hint">Toggle to include in timeline. Merged by time.</p>
      <ul className="dataset-list-ul">
        {datasets.map((ds) => {
          const checked = selectedDatasetIds.has(ds.id)
          const start = ds.points.length
            ? new Date(ds.points[0].timestamp).toLocaleDateString()
            : '—'
          const end = ds.points.length
            ? new Date(ds.points[ds.points.length - 1].timestamp).toLocaleDateString()
            : '—'
          return (
            <li key={ds.id} className="dataset-list-li">
              <label className="dataset-list-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDataset(ds.id)}
                  className="dataset-list-checkbox"
                />
                <span className="dataset-list-name">{ds.name}</span>
              </label>
              <span className="dataset-list-meta">
                {ds.points.length} points · {start} → {end}
              </span>
              <button
                type="button"
                className="dataset-list-remove"
                onClick={() => removeDataset(ds.id)}
                aria-label={`Remove ${ds.name}`}
              >
                Remove
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
