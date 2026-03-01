import { useEffect, useState, useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import {
  getCountriesFromPoints,
  sortCountryVisits,
  formatTimeAgo,
  type WorldSortOption,
} from "@/lib/countries";
import { getCitiesFromPoints, sortCityVisits } from "@/lib/cities";
import { fetchCountryImageUrlsByNames } from "@/lib/countryImages";
import type { CountryVisit } from "@/types/timeline";

const SORT_OPTIONS: { value: WorldSortOption; label: string }[] = [
  { value: "lastVisit", label: "Last visited" },
  { value: "name", label: "Name" },
  { value: "cities", label: "City count" },
];

export function WorldTab() {
  const {
    mergedPoints,
    placeCache,
    setPlaceCache,
    worldCountryVisits,
    setWorldCountryVisits,
    selectedCountryCode,
    setSelectedCountryCode,
    pointsInSelectedCountry,
  } = useTimeline();
  const [sortBy, setSortBy] = useState<WorldSortOption>("lastVisit");
  const [loading, setLoading] = useState(false);
  const [countryImageUrls, setCountryImageUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (mergedPoints.length === 0) {
      setWorldCountryVisits(null);
      return;
    }
    setLoading(true);
    getCountriesFromPoints(mergedPoints, placeCache)
      .then((list) => {
        setWorldCountryVisits(list);
      })
      .finally(() => setLoading(false));
  }, [mergedPoints, placeCache, setWorldCountryVisits]);

  useEffect(() => {
    if (!worldCountryVisits || worldCountryVisits.length === 0) return;
    const names = worldCountryVisits.map((c) => c.countryName);
    fetchCountryImageUrlsByNames(names).then(setCountryImageUrls);
  }, [worldCountryVisits]);

  const sorted = useMemo(() => {
    if (!worldCountryVisits) return [];
    return sortCountryVisits(worldCountryVisits, sortBy);
  }, [worldCountryVisits, sortBy]);

  const count = sorted.length;

  const selectedCountry = useMemo(
    () =>
      worldCountryVisits?.find((c) => c.countryCode === selectedCountryCode) ??
      null,
    [worldCountryVisits, selectedCountryCode],
  );

  const citiesInCountry = useMemo(() => {
    if (!pointsInSelectedCountry || pointsInSelectedCountry.length === 0)
      return [];
    return sortCityVisits(
      getCitiesFromPoints(
        pointsInSelectedCountry,
        placeCache,
        setPlaceCache,
      ),
      "lastVisit",
    );
  }, [pointsInSelectedCountry, placeCache, setPlaceCache]);

  if (loading) {
    return (
      <div className="world-tab">
        <p className="world-tab-loading">Loading country list…</p>
      </div>
    );
  }

  if (mergedPoints.length === 0) {
    return (
      <div className="world-tab">
        <p className="world-tab-empty">Upload data to see countries visited.</p>
      </div>
    );
  }

  if (selectedCountryCode && selectedCountry) {
    return (
      <div className="world-tab">
        <button
          type="button"
          className="world-tab-back"
          onClick={() => setSelectedCountryCode(null)}
        >
          ← Back to countries
        </button>
        <h2 className="world-tab-country-title">{selectedCountry.countryName}</h2>
        <div className="world-tab-cities-summary">
          {pointsInSelectedCountry === null
            ? "Loading cities…"
            : `${citiesInCountry.length} cit${citiesInCountry.length !== 1 ? "ies" : "y"} in this country`}
        </div>
        {pointsInSelectedCountry !== null && citiesInCountry.length > 0 && (
          <ul className="world-tab-cities-list">
            {citiesInCountry.map((city) => (
              <li key={city.cityName} className="world-tab-city-item">
                <span className="world-tab-city-name">{city.cityName}</span>
                <span className="world-tab-city-meta">
                  {city.placeCount} place{city.placeCount !== 1 ? "s" : ""} ·{" "}
                  {formatTimeAgo(city.lastVisitDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="world-tab">
      <div className="world-tab-header">
        <span className="world-tab-summary">
          {count} country{count !== 1 ? "s" : ""}/regions visited
        </span>
        <div className="world-tab-sort">
          <label htmlFor="world-sort" className="world-tab-sort-label">
            Sort by
          </label>
          <select
            id="world-sort"
            className="world-tab-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as WorldSortOption)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="world-tab-grid">
        {sorted.map((c) => (
          <CountryCard
            key={c.countryCode}
            visit={c}
            imageUrl={countryImageUrls[c.countryName]}
            isSelected={selectedCountryCode === c.countryCode}
            onSelect={() =>
              setSelectedCountryCode(
                selectedCountryCode === c.countryCode ? null : c.countryCode,
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function CountryCard({
  visit,
  imageUrl,
  isSelected,
  onSelect,
}: {
  visit: CountryVisit;
  imageUrl?: string | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const timeAgo = formatTimeAgo(visit.lastVisitDate);
  const thumbUrl =
    imageUrl ??
    `https://placehold.co/400x200/2a2a2a/888?text=${encodeURIComponent(visit.countryName)}`;

  return (
    <button
      type="button"
      className={`world-card ${isSelected ? "world-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="world-card-image-wrap">
        <img
          src={thumbUrl}
          alt=""
          className="world-card-image"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes("placehold.co")) return;
            target.src = `https://placehold.co/400x200/2a2a2a/888?text=${encodeURIComponent(visit.countryName)}`;
          }}
        />
        <span className="world-card-badge">{visit.cityCount} cities</span>
        <div className="world-card-overlay" />
      </div>
      <div className="world-card-body">
        <span className="world-card-name">{visit.countryName}</span>
        <span className="world-card-time">{timeAgo}</span>
      </div>
    </button>
  );
}
