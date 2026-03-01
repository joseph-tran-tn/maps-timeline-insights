/**
 * Google Geocoding API - reverse geocoding (lat/lng -> address components).
 * Uses same API key as Places (VITE_GOOGLE_PLACES_API_KEY).
 */

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined
const BASE = "https://maps.googleapis.com/maps/api/geocode/json"

const coordCache = new Map<string, string>()

/**
 * Round coords to ~1km grid for cache key.
 */
function coordKey(lat: number, lng: number): string {
  return `${Math.round(lat * 100)},${Math.round(lng * 100)}`
}

/**
 * Extract city name from Geocoding API address_components.
 * Prefer locality, fallback to administrative_area_level_2.
 */
function parseCityFromComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
): string | null {
  for (const c of components) {
    if (c.types.includes("locality")) return c.long_name
  }
  for (const c of components) {
    if (c.types.includes("administrative_area_level_2")) return c.long_name
  }
  for (const c of components) {
    if (c.types.includes("administrative_area_level_1")) return c.long_name
  }
  return null
}

/**
 * Reverse geocode lat/lng to city name. Results cached by grid cell.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = coordKey(lat, lng)
  const cached = coordCache.get(key)
  if (cached) return cached

  if (!API_KEY) return null

  const url = `${BASE}?latlng=${lat},${lng}&key=${API_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as {
      results?: Array<{
        address_components?: Array<{
          long_name: string
          short_name: string
          types: string[]
        }>
      }>
    }
    const results = data.results ?? []
    for (const r of results) {
      const comps = r.address_components ?? []
      const city = parseCityFromComponents(comps)
      if (city) {
        coordCache.set(key, city)
        return city
      }
    }
  } catch {
    // ignore
  }
  return null
}
