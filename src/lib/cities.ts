import * as turf from "@turf/turf";
import type { TimelinePoint } from "@/types/timeline";
import type { CityVisit } from "@/types/timeline";
import type { PlaceCache } from "@/types/timeline";
import { formatTimeAgo } from "@/lib/countries";

const GRID_ROUND = 2;
const CACHE_KEY = (lat: number, lng: number) =>
  `${Math.round(lat * 10 ** GRID_ROUND)},${Math.round(lng * 10 ** GRID_ROUND)}`;

/** Aliases → canonical city name (for grouping same city with different names). */
const CITY_CANONICAL: Record<string, string> = {
  "Ho Chi Minh City": "Thành phố Hồ Chí Minh",
  "Da Nang": "Đà Nẵng",
};

/**
 * Strip zipcode from city string:
 * - Trailing (e.g. Asia): "Thành phố Hồ Chí Minh 70000" -> "Thành phố Hồ Chí Minh"
 * - Leading (e.g. Europe): "24114 Kiel" -> "Kiel", "8300 Odder" -> "Odder"
 */
function stripZipcodeFromCity(city: string): string {
  return city
    .replace(/\s+\d{4,}(-\d{4})?\s*$/, "") // trailing zipcode
    .replace(/^\s*\d[\d\s-]*\s*/, "") // leading zipcode (e.g. 24114 Kiel, 8300 Odder)
    .trim();
}

/**
 * Normalize city name for grouping: strip zipcode, then map known aliases to canonical name.
 */
function normalizeCityKey(city: string): string {
  const trimmed = stripZipcodeFromCity(city.trim());
  return CITY_CANONICAL[trimmed] ?? trimmed;
}

/**
 * Remove diacritics for grouping (e.g. "Kiên Giang" → "Kien Giang").
 * Vietnamese Đ/đ (U+0110/U+0111) don't decompose in NFD, so map them to D/d explicitly.
 */
function removeDiacritics(s: string): string {
  return s
    .replace(/\u0110/g, "D")
    .replace(/\u0111/g, "d")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function hasDiacritics(s: string): boolean {
  return s !== removeDiacritics(s);
}

/**
 * Key for grouping cities: canonical name without diacritics so "Kiên Giang" and "Kien Giang" merge.
 */
function cityKeyForGrouping(city: string): string {
  return removeDiacritics(normalizeCityKey(city));
}

/**
 * Parse city from formattedAddress (segment before country, without zipcode).
 * e.g. "106C Đ. Phan Văn Trị, Phường 12, Bình Thạnh, Thành phố Hồ Chí Minh 70000, Vietnam" -> "Thành phố Hồ Chí Minh"
 */
export function parseCityFromFormattedAddress(
  formattedAddress: string,
): string | null {
  if (!formattedAddress || typeof formattedAddress !== "string") return null;
  const parts = formattedAddress.split(",").map((s) => s.trim());
  if (parts.length < 2) return null;
  const raw = parts[parts.length - 2] ?? null;
  return raw ? stripZipcodeFromCity(raw) : null;
}

/**
 * Get city for a point (read-only from cache). No side effects.
 */
export function getCityForPoint(
  p: TimelinePoint,
  placeCache: PlaceCache,
): string | null {
  if (!p.placeId) return null;
  const cached = placeCache[p.placeId];
  if (!cached) return null;
  if (cached.city) return stripZipcodeFromCity(cached.city);
  if (cached.formattedAddress) {
    return parseCityFromFormattedAddress(cached.formattedAddress);
  }
  return null;
}

/**
 * Get city for a point and optionally update placeCache when parsed from formattedAddress.
 */
function resolveCityForPoint(
  p: TimelinePoint,
  placeCache: PlaceCache,
  setPlaceCache?: (update: (prev: PlaceCache) => PlaceCache) => void,
): string | null {
  if (!p.placeId) return null;
  const cached = placeCache[p.placeId];
  if (!cached) return null;
  if (cached.city) return stripZipcodeFromCity(cached.city);
  if (cached.formattedAddress) {
    const city = parseCityFromFormattedAddress(cached.formattedAddress);
    if (city) {
      setPlaceCache?.((prev) => ({
        ...prev,
        [p.placeId!]: { ...prev[p.placeId!], city },
      }));
      return city;
    }
  }
  return null;
}

/**
 * Filter points that belong to the given city (by placeCache).
 * Uses grouping key (canonical + no diacritics) so "Kiên Giang" / "Kien Giang" and alias names match.
 */
export function getPointsInCity(
  points: TimelinePoint[],
  placeCache: PlaceCache,
  cityName: string,
): TimelinePoint[] {
  const groupKey = cityKeyForGrouping(cityName);
  return points.filter((p) => {
    const city = getCityForPoint(p, placeCache);
    return city !== null && cityKeyForGrouping(city) === groupKey;
  });
}

export interface PlaceInCity {
  placeId: string;
  displayName: string;
  lastVisitDate: string;
  visitCount: number;
}

/**
 * Get unique places in a city (grouped by placeId) with display name and last visit.
 */
export function getPlacesInCity(
  points: TimelinePoint[],
  placeCache: PlaceCache,
  cityName: string,
): PlaceInCity[] {
  const inCity = getPointsInCity(points, placeCache, cityName);
  const byPlace = new Map<
    string,
    { points: TimelinePoint[] }
  >();
  for (const p of inCity) {
    const id = p.placeId ?? `${p.lat},${p.lng}`;
    if (!byPlace.has(id)) byPlace.set(id, { points: [] });
    byPlace.get(id)!.points.push(p);
  }
  const result: PlaceInCity[] = [];
  for (const [placeId, { points: pts }] of byPlace) {
    const sorted = [...pts].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const cached = placeId ? placeCache[placeId] : undefined;
    const displayName =
      cached && typeof cached === "object" && "displayName" in cached
        ? cached.displayName
        : "Unknown place";
    result.push({
      placeId,
      displayName,
      lastVisitDate: sorted[0]?.timestamp ?? "",
      visitCount: pts.length,
    });
  }
  return result.sort(
    (a, b) =>
      new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime(),
  );
}

/**
 * Aggregate points by city; compute place count, last visit, centroid.
 * Uses placeCache only (formattedAddress) – no API calls.
 */
export function getCitiesFromPoints(
  points: TimelinePoint[],
  placeCache: PlaceCache,
  setPlaceCache?: (update: (prev: PlaceCache) => PlaceCache) => void,
): CityVisit[] {
  if (points.length === 0) return [];

  const gridCache = new Map<string, string | null>();
  const byCity = new Map<
    string,
    { cityName: string; points: TimelinePoint[] }
  >();

  for (const p of points) {
    const gridKey = CACHE_KEY(p.lat, p.lng);
    let city: string | null = null;

    if (!gridCache.has(gridKey)) {
      city = resolveCityForPoint(p, placeCache, setPlaceCache);
      gridCache.set(gridKey, city);
    } else {
      city = gridCache.get(gridKey) ?? null;
    }

    if (!city) continue;

    const groupKey = cityKeyForGrouping(city);
    const existing = byCity.get(groupKey);
    if (!existing) {
      byCity.set(groupKey, { cityName: city, points: [p] });
    } else {
      existing.points.push(p);
      if (hasDiacritics(city) && !hasDiacritics(existing.cityName)) {
        existing.cityName = city;
      }
    }
  }

  const result: CityVisit[] = [];
  for (const rec of byCity.values()) {
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
      cityName: rec.cityName,
      placeCount: rec.points.length,
      lastVisitDate,
      centroid,
    });
  }

  return result.sort(
    (a, b) =>
      new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime(),
  );
}

export type CitySortOption = "lastVisit" | "name" | "places";

export function sortCityVisits(
  cities: CityVisit[],
  sortBy: CitySortOption,
): CityVisit[] {
  const arr = [...cities];
  switch (sortBy) {
    case "name":
      return arr.sort((a, b) =>
        a.cityName.localeCompare(b.cityName, "en"),
      );
    case "places":
      return arr.sort((a, b) => b.placeCount - a.placeCount);
    case "lastVisit":
    default:
      return arr.sort(
        (a, b) =>
          new Date(b.lastVisitDate).getTime() -
          new Date(a.lastVisitDate).getTime(),
      );
  }
}

export { formatTimeAgo };
