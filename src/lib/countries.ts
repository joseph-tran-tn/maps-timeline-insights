import * as turf from "@turf/turf";
import type { TimelinePoint } from "@/types/timeline";
import type { CountryVisit } from "@/types/timeline";
import type { PlaceCache } from "@/types/timeline";

const GRID_ROUND = 2;
const CACHE_KEY = (lat: number, lng: number) =>
  `${Math.round(lat * 10 ** GRID_ROUND)},${Math.round(lng * 10 ** GRID_ROUND)}`;

const COUNTRIES_GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson";

type GeoJSONFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

let geoJsonFeatures: GeoJSONFeature[] | null = null;

/**
 * Validate that country code is exactly 2 letters (ISO 3166-1 alpha-2).
 */
export function isTwoLetterCountryCode(code: string): boolean {
  return /^[A-Za-z]{2}$/.test((code ?? "").trim());
}

/**
 * Normalize to 2-letter country code: if input is 2 letters return uppercase, else null.
 */
export function normalizeToTwoLetterCode(value: string): string | null {
  const s = (value ?? "").trim();
  return isTwoLetterCountryCode(s) ? s.toUpperCase() : null;
}

/** Common country name (from address) -> ISO 3166-1 alpha-2. Used when address gives name, not code. */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Vietnam: "VN",
  "South Korea": "KR",
  "North Korea": "KP",
  Thailand: "TH",
  Malaysia: "MY",
  Japan: "JP",
  China: "CN",
  "United States": "US",
  "United States of America": "US",
  USA: "US",
  "United Kingdom": "GB",
  UK: "GB",
  Germany: "DE",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  Denmark: "DK",
  "South Africa": "ZA",
  India: "IN",
  Indonesia: "ID",
  Philippines: "PH",
  Singapore: "SG",
  Australia: "AU",
  "New Zealand": "NZ",
  Canada: "CA",
  Brazil: "BR",
  Netherlands: "NL",
  Switzerland: "CH",
  Sweden: "SE",
  Norway: "NO",
  Finland: "FI",
  Poland: "PL",
  Taiwan: "TW",
  "Hong Kong": "HK",
  Laos: "LA",
  "Sri Lanka": "LK",
  Nepal: "NP",
  Cambodia: "KH",
  Myanmar: "MM",
  Maldives: "MV",
};

/** Prefer 2-letter code; fallback to name when no mapping (keeps unique id for selection). */
function resolveToTwoLetterCode(codeOrName: string, name: string): string {
  const normalized = normalizeToTwoLetterCode(codeOrName);
  if (normalized) return normalized;
  const byName = COUNTRY_NAME_TO_CODE[name] ?? COUNTRY_NAME_TO_CODE[codeOrName];
  return byName ?? codeOrName;
}

/**
 * Parse country name from formattedAddress (last segment after last comma).
 * e.g. "123 Main St, New York, USA" -> "USA"
 *      "272 Gonghang-ro, Jung-gu, Incheon, South Korea" -> "South Korea"
 */
export function parseCountryFromFormattedAddress(
  formattedAddress: string,
): string | null {
  if (!formattedAddress || typeof formattedAddress !== "string") return null;
  const parts = formattedAddress.split(",").map((s) => s.trim());
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : null;
}

async function loadCountriesGeoJSON(): Promise<GeoJSONFeature[]> {
  if (geoJsonFeatures) return geoJsonFeatures;
  const res = await fetch(COUNTRIES_GEOJSON_URL);
  if (!res.ok) return [];
  const fc = (await res.json()) as GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  >;
  geoJsonFeatures = fc.features as GeoJSONFeature[];
  return geoJsonFeatures;
}

function getCountryFromGeoJSON(
  lat: number,
  lng: number,
  features: GeoJSONFeature[],
): { code: string; name: string } | null {
  const pt = turf.point([lng, lat]);
  for (const f of features) {
    if (f.geometry && turf.booleanPointInPolygon(pt, f)) {
      const p = (
        f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> & {
          properties?: {
            ADMIN?: string;
            NAME?: string;
            ISO_A2?: string;
            ADM0_A3?: string;
          };
        }
      ).properties;
      const name = p?.ADMIN ?? (p as { NAME?: string })?.NAME ?? "Unknown";
      const raw = p?.ISO_A2 ?? (p as { ADM0_A3?: string })?.ADM0_A3 ?? "";
      const code = isTwoLetterCountryCode(raw)
        ? raw.toUpperCase()
        : raw
          ? String(raw)
          : "";
      if (code && code !== "-99")
        return { code: String(code), name: String(name) };
    }
  }
  return null;
}

/**
 * Aggregate points by country; compute city count, last visit, centroid.
 * Country name is taken from place cache formattedAddress (last part after last comma).
 * Fallback: GeoJSON point-in-polygon when no placeId/cache or parse returns nothing.
 */
export async function getCountriesFromPoints(
  points: TimelinePoint[],
  placeCache: PlaceCache,
): Promise<CountryVisit[]> {
  if (points.length === 0) return [];

  const features = await loadCountriesGeoJSON();
  const geoLookup =
    features.length > 0
      ? (lat: number, lng: number) => getCountryFromGeoJSON(lat, lng, features)
      : () => null as { code: string; name: string } | null;

  const gridCache = new Map<string, { code: string; name: string } | null>();
  const byCountry = new Map<
    string,
    {
      code: string;
      name: string;
      points: TimelinePoint[];
      cityCells: Set<string>;
    }
  >();

  for (const p of points) {
    let country: { code: string; name: string } | null = null;
    if (p.placeId && placeCache[p.placeId]?.formattedAddress) {
      const name = parseCountryFromFormattedAddress(
        placeCache[p.placeId].formattedAddress,
      );
      if (name) {
        country = { code: name, name };
      }
    }

    if (!country) {
      const key = CACHE_KEY(p.lat, p.lng);
      if (!gridCache.has(key)) {
        gridCache.set(key, geoLookup(p.lat, p.lng));
      }
      country = gridCache.get(key) ?? null;
    }

    if (!country) continue;

    const id = country.code.trim();
    const cityCell = `${Math.round(p.lat * 100)},${Math.round(p.lng * 100)}`;
    if (!byCountry.has(id)) {
      byCountry.set(id, {
        code: country.code,
        name: country.name,
        points: [],
        cityCells: new Set(),
      });
    }
    const rec = byCountry.get(id)!;
    rec.points.push(p);
    rec.cityCells.add(cityCell);
  }

  const byTwoLetter = new Map<
    string,
    {
      code: string;
      name: string;
      points: TimelinePoint[];
      cityCells: Set<string>;
    }
  >();

  for (const rec of byCountry.values()) {
    const twoLetterCode = resolveToTwoLetterCode(rec.code, rec.name);
    if (!byTwoLetter.has(twoLetterCode)) {
      byTwoLetter.set(twoLetterCode, {
        code: twoLetterCode,
        name: rec.name,
        points: [...rec.points],
        cityCells: new Set(rec.cityCells),
      });
    } else {
      const merged = byTwoLetter.get(twoLetterCode)!;
      for (const p of rec.points) merged.points.push(p);
      for (const cell of rec.cityCells) merged.cityCells.add(cell);
      if (
        rec.name &&
        rec.name.length > 0 &&
        (!merged.name || merged.name === twoLetterCode)
      ) {
        merged.name = rec.name;
      }
    }
  }

  const result: CountryVisit[] = [];
  for (const rec of byTwoLetter.values()) {
    const sorted = [...rec.points].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const lastVisitDate = sorted[0]?.timestamp ?? "";
    const fc = turf.featureCollection(
      rec.points.map((p) => turf.point([p.lng, p.lat])),
    );
    const center = turf.center(fc);
    const centroid = center.geometry.coordinates as [number, number];

    result.push({
      countryCode: rec.code,
      countryName: rec.name,
      cityCount: rec.cityCells.size,
      lastVisitDate,
      pointCount: rec.points.length,
      centroid,
    });
  }

  return result.sort(
    (a, b) =>
      new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime(),
  );
}

/**
 * Return points that belong to the given country (2-letter code).
 * Uses same logic as getCountriesFromPoints: address or GeoJSON fallback.
 */
export async function getPointsInCountry(
  points: TimelinePoint[],
  placeCache: PlaceCache,
  countryCode: string,
): Promise<TimelinePoint[]> {
  if (!countryCode || points.length === 0) return [];
  const targetCode = countryCode.trim().toUpperCase();

  const features = await loadCountriesGeoJSON();
  const geoLookup =
    features.length > 0
      ? (lat: number, lng: number) =>
          getCountryFromGeoJSON(lat, lng, features)
      : () => null as { code: string; name: string } | null;

  const gridCache = new Map<string, { code: string; name: string } | null>();
  const result: TimelinePoint[] = [];

  for (const p of points) {
    let country: { code: string; name: string } | null = null;
    if (p.placeId && placeCache[p.placeId]?.formattedAddress) {
      const name = parseCountryFromFormattedAddress(
        placeCache[p.placeId].formattedAddress,
      );
      if (name) country = { code: name, name };
    }
    if (!country) {
      const key = CACHE_KEY(p.lat, p.lng);
      if (!gridCache.has(key)) gridCache.set(key, geoLookup(p.lat, p.lng));
      country = gridCache.get(key) ?? null;
    }
    if (!country) continue;
    const resolved = resolveToTwoLetterCode(country.code, country.name);
    if (resolved.toUpperCase() === targetCode) result.push(p);
  }
  return result;
}

export type WorldSortOption = "lastVisit" | "name" | "cities";

export function sortCountryVisits(
  countries: CountryVisit[],
  sortBy: WorldSortOption,
): CountryVisit[] {
  const arr = [...countries];
  switch (sortBy) {
    case "name":
      return arr.sort((a, b) =>
        a.countryName.localeCompare(b.countryName, "en"),
      );
    case "cities":
      return arr.sort((a, b) => b.cityCount - a.cityCount);
    case "lastVisit":
    default:
      return arr.sort(
        (a, b) =>
          new Date(b.lastVisitDate).getTime() -
          new Date(a.lastVisitDate).getTime(),
      );
  }
}

export function formatTimeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 30)
    return days <= 1
      ? days === 1
        ? "1 day ago"
        : "Today"
      : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}
