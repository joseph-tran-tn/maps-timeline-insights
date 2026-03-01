import { useTimeline } from '@/context/TimelineContext'

export function PointList() {
  const { filteredPoints, placeCache, removePoint } = useTimeline()

  if (filteredPoints.length === 0) return null

  const outliers = filteredPoints.filter((p) => p.isOutlier)

  return (
    <div className="point-list">
      <h3 className="point-list-title">Points ({filteredPoints.length})</h3>
      {outliers.length > 0 && (
        <p className="point-list-outliers">{outliers.length} possible outliers</p>
      )}
      <ul className="point-list-ul">
        {filteredPoints.slice(0, 50).map((p) => (
          <li key={p.id} className="point-list-li">
            <span className="point-list-time">
              {new Date(p.timestamp).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="point-list-place">
              {p.placeId && placeCache[p.placeId]
                ? placeCache[p.placeId].displayName
                : `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
            </span>
            {p.isOutlier && <span className="point-list-badge">Outlier</span>}
            <button
              type="button"
              className="point-list-delete"
              onClick={() => p.id && removePoint(p.id)}
              aria-label="Delete point"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {filteredPoints.length > 50 && (
        <p className="point-list-more">… and {filteredPoints.length - 50} more</p>
      )}
    </div>
  )
}
