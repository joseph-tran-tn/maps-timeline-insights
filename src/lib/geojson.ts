import type { TimelinePoint } from '@/types/timeline'
import * as turf from '@turf/turf'

/**
 * TimelinePoint[] → GeoJSON FeatureCollection of Points (with timestamp, placeId in props)
 */
export function pointsToGeoJSON(points: TimelinePoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = points.map((p) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [p.lng, p.lat],
    },
    properties: {
      id: p.id,
      timestamp: p.timestamp,
      placeId: p.placeId ?? undefined,
      accuracy: p.accuracy,
      isOutlier: p.isOutlier,
    },
  }))
  return { type: 'FeatureCollection', features }
}

/**
 * TimelinePoint[] → GeoJSON LineString (ordered by timestamp)
 */
export function pointsToLineGeoJSON(
  points: TimelinePoint[]
): GeoJSON.Feature<GeoJSON.LineString> | null {
  if (points.length < 2) return null
  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const coords = sorted.map((p) => [p.lng, p.lat] as [number, number])
  const line = turf.lineString(coords)
  return line as GeoJSON.Feature<GeoJSON.LineString>
}

/**
 * Calculate total length (km) of LineString from points
 */
export function lineLengthKm(points: TimelinePoint[]): number {
  const line = pointsToLineGeoJSON(points)
  if (!line) return 0
  return turf.length(line, { units: 'kilometers' })
}

/**
 * Bbox from points for fitBounds [west, south, east, north]
 */
export function bboxFromPoints(points: TimelinePoint[]): [number, number, number, number] | null {
  if (points.length === 0) return null
  if (points.length === 1) {
    const p = points[0]
    const pad = 0.01
    return [p.lng - pad, p.lat - pad, p.lng + pad, p.lat + pad]
  }
  const fc = pointsToGeoJSON(points)
  const bbox = turf.bbox(fc)
  return bbox as [number, number, number, number]
}
