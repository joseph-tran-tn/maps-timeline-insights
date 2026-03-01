import type { TimelinePoint } from '@/types/timeline'
import * as turf from '@turf/turf'

const DISTANCE_KM_THRESHOLD = 50
const ACCURACY_M_THRESHOLD = 500
const MAX_VELOCITY_MS = 300

/**
 * Mark points that are likely outliers (jump too far in too short time, or bad accuracy).
 * Mutates points in place: sets isOutlier on each point.
 */
export function markOutliers(points: TimelinePoint[]): void {
  if (points.length === 0) return
  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    let bad = false
    if (p.accuracy != null && p.accuracy > ACCURACY_M_THRESHOLD) bad = true
    if (i > 0) {
      const prev = sorted[i - 1]
      const from = turf.point([prev.lng, prev.lat])
      const to = turf.point([p.lng, p.lat])
      const distKm = turf.distance(from, to, { units: 'kilometers' })
      const dtMs = new Date(p.timestamp).getTime() - new Date(prev.timestamp).getTime()
      const dtSec = dtMs / 1000
      if (dtSec > 0 && distKm > DISTANCE_KM_THRESHOLD) {
        const velocityMs = (distKm * 1000) / dtSec
        if (velocityMs > MAX_VELOCITY_MS) bad = true
        else if (distKm > DISTANCE_KM_THRESHOLD * 2) bad = true
      }
    }
    p.isOutlier = bad
  }
}
