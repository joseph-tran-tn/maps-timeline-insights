import type {
  RawLocationRecord,
  TimelinePoint,
  SemanticTimelineEntry,
  SemanticTimelineJson,
} from "@/types/timeline";

const E7 = 1e7;

function parseGeo(geo: string): { lat: number; lng: number } | null {
  if (!geo || !geo.startsWith("geo:")) return null;
  const part = geo.slice(4).trim();
  const [latStr, lngStr] = part.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Convert a raw location record to TimelinePoint. Skips if missing timestamp or coords.
 */
export function rawToPoint(
  record: RawLocationRecord,
  sourceId?: string,
): TimelinePoint | null {
  const latE7 = record.latitudeE7;
  const lngE7 = record.longitudeE7;
  const ts = record.timestamp ?? record.timestampMs;
  if (latE7 == null || lngE7 == null || !ts) return null;

  const timestamp =
    typeof ts === "string" && /^\d+$/.test(ts)
      ? new Date(parseInt(ts, 10)).toISOString()
      : ts;

  return {
    lat: latE7 / E7,
    lng: lngE7 / E7,
    timestamp,
    accuracy: record.accuracy,
    placeId: record.placeId,
    velocity: record.velocity,
    heading: record.heading,
    altitude: record.altitude,
    source: record.source,
    deviceTag: record.deviceTag,
    platformType: record.platformType,
    sourceId,
  };
}

/**
 * Parse Records.json (locations array) into TimelinePoint[].
 */
export function parseLocations(
  locations: RawLocationRecord[],
  sourceId?: string,
): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  for (const record of locations) {
    const point = rawToPoint(record, sourceId);
    if (point) points.push(point);
  }
  return points;
}

/**
 * Parse full Records.json file content (object with locations array).
 */
export function parseRecordsJson(
  data: { locations?: RawLocationRecord[] },
  sourceId?: string,
): TimelinePoint[] {
  const locations = data?.locations;
  if (!Array.isArray(locations)) return [];
  return parseLocations(locations, sourceId);
}

/**
 * Parse Semantic Timeline format (root array of visit/activity segments)
 * e.g. location-history-gpbenem05.json
 */
export function parseSemanticTimeline(
  entries: SemanticTimelineJson,
  sourceId?: string,
): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  let index = 0;
  for (const entry of entries) {
    const startTime = entry.startTime;
    const endTime = entry.endTime;
    if (entry.visit?.topCandidate) {
      const loc = entry.visit.topCandidate.placeLocation;
      const coords = loc ? parseGeo(loc) : null;
      if (coords) {
        points.push({
          id: `sem-${index++}`,
          lat: coords.lat,
          lng: coords.lng,
          timestamp: startTime,
          placeId: entry.visit.topCandidate.placeID,
          sourceId,
        });
      }
    }
    if (entry.activity) {
      const startCoords = entry.activity.start
        ? parseGeo(entry.activity.start)
        : null;
      const endCoords = entry.activity.end
        ? parseGeo(entry.activity.end)
        : null;
      if (startCoords) {
        points.push({
          id: `sem-${index++}`,
          lat: startCoords.lat,
          lng: startCoords.lng,
          timestamp: startTime,
          sourceId,
        });
      }
      if (endCoords) {
        points.push({
          id: `sem-${index++}`,
          lat: endCoords.lat,
          lng: endCoords.lng,
          timestamp: endTime,
          sourceId,
        });
      }
    }
  }
  return points.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

/**
 * Detect format and parse to TimelinePoint[].
 * Supports: Records.json (object with locations[]) and Semantic Timeline (root array).
 */
export function parseTimelineData(
  data: unknown,
  sourceId?: string,
): TimelinePoint[] {
  if (Array.isArray(data)) {
    return parseSemanticTimeline(data as SemanticTimelineEntry[], sourceId);
  }
  if (data && typeof data === "object" && "locations" in data) {
    return parseRecordsJson(
      data as { locations?: RawLocationRecord[] },
      sourceId,
    );
  }
  return [];
}
