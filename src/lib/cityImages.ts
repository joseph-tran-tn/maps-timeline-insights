/**
 * City thumbnail images for Cities tab.
 * Uses Static Map API when key available; otherwise placehold.co.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined
const CACHE: Record<string, string> = {}

function cacheKey(lng: number, lat: number): string {
  return `${lng.toFixed(2)},${lat.toFixed(2)}`
}

/**
 * Get static map image URL for city centroid.
 */
function getStaticMapUrl(lng: number, lat: number): string | null {
  if (!API_KEY) return null
  const center = `${lat},${lng}`
  return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=11&size=400x200&scale=2&maptype=roadmap&style=element:geometry|color:0x1d2c4d&style=element:labels.text.fill|color:0x8ec3b9&key=${API_KEY}`
}

/**
 * Fetch thumbnail URLs for city visits.
 * Returns map of cityName -> image URL.
 */
export function getCityImageUrls(
  cities: Array<{ cityName: string; centroid: [number, number] }>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const c of cities) {
    const [lng, lat] = c.centroid
    const key = cacheKey(lng, lat)
    if (CACHE[key]) {
      result[c.cityName] = CACHE[key]
      continue
    }
    const staticUrl = getStaticMapUrl(lng, lat)
    if (staticUrl) {
      CACHE[key] = staticUrl
      result[c.cityName] = staticUrl
    } else {
      const fallback = `https://placehold.co/400x200/2a2a2a/888?text=${encodeURIComponent(c.cityName)}`
      result[c.cityName] = fallback
    }
  }
  return result
}
