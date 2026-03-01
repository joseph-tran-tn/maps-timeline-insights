import { useTimeline } from '@/context/TimelineContext'

export function ShowLinesToggle() {
  const { showLines, setShowLines } = useTimeline()
  return (
    <label className="show-lines-toggle">
      <input
        type="checkbox"
        checked={showLines}
        onChange={(e) => setShowLines(e.target.checked)}
      />
      <span>Show path between points</span>
    </label>
  )
}
