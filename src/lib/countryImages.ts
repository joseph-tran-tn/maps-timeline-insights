/**
 * Fetch country flag image URLs from Rest Countries API (free, no key).
 * Used for World tab country cards.
 */

const REST_COUNTRIES_BASE = 'https://restcountries.com/v3.1'
const REST_COUNTRIES_URL = `${REST_COUNTRIES_BASE}/alpha`
const CACHE: Record<string, string> = {}

interface RestCountryFlags {
  png?: string
  svg?: string
}

interface RestCountryItem {
  cca2?: string
  cca3?: string
  flags?: RestCountryFlags
}

function normalizeCode(code: string): string {
  const s = code?.trim().toUpperCase() ?? ''
  return s.length === 2 ? s : s
}

/**
 * Fetch flag image URLs for a list of country codes (2 or 3 letter).
 * Returns a map of countryCode -> image URL (PNG). Uses cache and batch request.
 */
export async function fetchCountryImageUrls(
  codes: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(codes.map(normalizeCode).filter(Boolean))]
  const missing = unique.filter((c) => !CACHE[c])
  if (missing.length === 0) {
    return { ...CACHE }
  }

  const result: Record<string, string> = { ...CACHE }
  const batchSize = 50
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize)
    const codesParam = batch.map((c) => c.toLowerCase()).join(',')
    const url = `${REST_COUNTRIES_URL}?codes=${codesParam}&fields=cca2,cca3,flags`
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as RestCountryItem[]
      for (const item of data) {
        const urlPng = item.flags?.png ?? item.flags?.svg ?? ''
        if (!urlPng) continue
        if (item.cca2) {
          CACHE[item.cca2] = urlPng
          result[item.cca2] = urlPng
        }
        if (item.cca3) {
          CACHE[item.cca3] = urlPng
          result[item.cca3] = urlPng
        }
      }
    } catch {
      // ignore network errors, keep cache
    }
  }
  return result
}

/**
 * Get image URL for one country code (from cache only; call fetchCountryImageUrls first to fill cache).
 */
export function getCountryImageUrl(code: string): string | null {
  const c = normalizeCode(code)
  return CACHE[c] ?? null
}

const NAME_CACHE: Record<string, string> = {}

/**
 * Fetch flag image URLs by country names (e.g. from formattedAddress).
 * Uses Rest Countries name API. Returns map of countryName -> image URL (PNG).
 */
export async function fetchCountryImageUrlsByNames(
  names: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(names.map((n) => n?.trim()).filter(Boolean))]
  const result: Record<string, string> = { ...NAME_CACHE }

  for (const name of unique) {
    if (NAME_CACHE[name]) {
      result[name] = NAME_CACHE[name]
      continue
    }
    try {
      const res = await fetch(
        `${REST_COUNTRIES_BASE}/name/${encodeURIComponent(name)}?fields=flags`,
      )
      if (!res.ok) continue
      const data = (await res.json()) as RestCountryItem[]
      const item = Array.isArray(data) ? data[data.length - 1] : data
      const urlPng = (item as RestCountryItem)?.flags?.png
      if (urlPng) {
        NAME_CACHE[name] = urlPng
        result[name] = urlPng
      }
    } catch {
      // ignore
    }
  }
  return result
}
