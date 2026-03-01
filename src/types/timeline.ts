/**
 * Normalized point from Google Takeout Records.json
 */
export interface TimelinePoint {
  id?: string
  lat: number
  lng: number
  timestamp: string
  accuracy?: number
  sourceId?: string
  placeId?: string
  isOutlier?: boolean
  velocity?: number
  heading?: number
  altitude?: number
  source?: string
  deviceTag?: number
  platformType?: string
}

/**
 * Raw location record from Records.json (locations[] item)
 */
export interface RawLocationRecord {
  timestamp?: string
  timestampMs?: string
  latitudeE7?: number
  longitudeE7?: number
  accuracy?: number
  placeId?: string
  velocity?: number
  heading?: number
  altitude?: number
  verticalAccuracy?: number
  source?: string
  deviceTag?: number
  platformType?: string
  [key: string]: unknown
}

/**
 * Parsed Records.json root (raw location history)
 */
export interface RecordsJson {
  locations?: RawLocationRecord[]
}

/**
 * Semantic / timeline format (e.g. location-history-gpbenem05.json):
 * root array of visit or activity segments.
 */
export interface SemanticVisitCandidate {
  placeID?: string
  placeLocation?: string
  semanticType?: string
  probability?: string
}

export interface SemanticVisit {
  topCandidate?: SemanticVisitCandidate
  hierarchyLevel?: string
  probability?: string
}

export interface SemanticActivityCandidate {
  type?: string
  probability?: string
}

export interface SemanticActivity {
  start?: string
  end?: string
  distanceMeters?: string
  topCandidate?: SemanticActivityCandidate
  probability?: string
}

export interface SemanticTimelineEntry {
  startTime: string
  endTime: string
  visit?: SemanticVisit
  activity?: SemanticActivity
}

export type SemanticTimelineJson = SemanticTimelineEntry[]

/**
 * Single dataset (one upload or one source)
 */
export interface TimelineDataset {
  id: string
  name: string
  points: TimelinePoint[]
  sourceId: string
  createdAt: number
}

/**
 * Place cache entry (matches TimelinePlaceCache.json structure)
 */
export interface PlaceCacheEntry {
  id?: string
  resourceName?: string
  displayName: string
  formattedAddress: string
  location?: { lat: number; lng: number }
  /** City name extracted from formattedAddress or Geocoding API; cached to avoid repeated requests */
  city?: string
  svgIconMaskURI?: string
  iconBackgroundColor?: string
  googleMapsURI?: string
  types?: string[]
}

export type PlaceCache = Record<string, PlaceCacheEntry>

/**
 * Aggregated visit stats for a city (tab Cities)
 */
export interface CityVisit {
  cityName: string
  countryCode?: string
  placeCount: number
  lastVisitDate: string
  /** Centroid [lng, lat] for map marker */
  centroid: [number, number]
}

/**
 * Aggregated visit stats for a country (tab World)
 */
export interface CountryVisit {
  countryCode: string
  countryName: string
  cityCount: number
  lastVisitDate: string
  pointCount: number
  /** Centroid [lng, lat] for map marker */
  centroid: [number, number]
}
