import type { PlaceCacheEntry } from '@/types/timeline'

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined
const BASE = 'https://places.googleapis.com/v1'

/**
 * Fetch place details from Google Places API (New).
 * Maps response to PlaceCacheEntry format.
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceCacheEntry | null> {
  if (!API_KEY) return null
  const name = `places/${placeId}`
  const url = `${BASE}/${name}?key=${API_KEY}`
  try {
    const res = await fetch(url, {
      headers: {
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types',
      },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      id?: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude?: number; longitude?: number }
      types?: string[]
    }
    const displayName = data.displayName?.text ?? ''
    const location = data.location
      ? { lat: data.location.latitude ?? 0, lng: data.location.longitude ?? 0 }
      : undefined
    return {
      id: data.id,
      resourceName: data.id ? `places/${data.id}` : undefined,
      displayName,
      formattedAddress: data.formattedAddress ?? '',
      location,
      types: data.types,
    }
  } catch {
    return null
  }
}
