import { useEffect, useState, useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import {
  getCitiesFromPoints,
  getPlacesInCity,
  sortCityVisits,
  formatTimeAgo,
  type CitySortOption,
} from "@/lib/cities";
import { getCityImageUrls } from "@/lib/cityImages";
import type { CityVisit } from "@/types/timeline";

const SORT_OPTIONS: { value: CitySortOption; label: string }[] = [
  { value: "lastVisit", label: "Last visited" },
  { value: "name", label: "Name" },
  { value: "places", label: "Places" },
];

export function CitiesTab() {
  const {
    filteredPoints,
    placeCache,
    setPlaceCache,
    cityVisits,
    setCityVisits,
    selectedCityName,
    setSelectedCityName,
  } = useTimeline();
  const [sortBy, setSortBy] = useState<CitySortOption>("lastVisit");
  const [cityImageUrls, setCityImageUrls] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (filteredPoints.length === 0) {
      setCityVisits(null);
      return;
    }
    const list = getCitiesFromPoints(filteredPoints, placeCache, setPlaceCache);
    setCityVisits(list);
  }, [filteredPoints, placeCache, setPlaceCache, setCityVisits]);

  useEffect(() => {
    if (!cityVisits || cityVisits.length === 0) return;
    const urls = getCityImageUrls(cityVisits);
    setCityImageUrls(urls);
  }, [cityVisits]);

  const sorted = useMemo(() => {
    if (!cityVisits) return [];
    return sortCityVisits(cityVisits, sortBy);
  }, [cityVisits, sortBy]);

  const count = sorted.length;
  const placesInCity = useMemo(() => {
    if (!selectedCityName || filteredPoints.length === 0) return [];
    return getPlacesInCity(filteredPoints, placeCache, selectedCityName);
  }, [selectedCityName, filteredPoints, placeCache]);

  if (filteredPoints.length === 0) {
    return (
      <div className="cities-tab">
        <p className="cities-tab-empty">Upload data to see cities visited.</p>
      </div>
    );
  }

  if (selectedCityName) {
    return (
      <div className="cities-tab">
        <button
          type="button"
          className="cities-tab-back"
          onClick={() => setSelectedCityName(null)}
        >
          ← Back to cities
        </button>
        <h2 className="cities-tab-city-title">{selectedCityName}</h2>
        <div className="cities-tab-places-summary">
          {placesInCity.length} place{placesInCity.length !== 1 ? "s" : ""}
        </div>
        <ul className="cities-tab-places-list">
          {placesInCity.map((place) => (
            <li key={place.placeId} className="cities-tab-place-item">
              <span className="cities-tab-place-name">{place.displayName}</span>
              <span className="cities-tab-place-meta">
                {place.visitCount} visit{place.visitCount !== 1 ? "s" : ""} · {formatTimeAgo(place.lastVisitDate)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="cities-tab">
      <div className="cities-tab-header">
        <span className="cities-tab-summary">
          {count} cit{count !== 1 ? "ies" : "y"} visited
        </span>
        <div className="cities-tab-sort">
          <label htmlFor="cities-sort" className="cities-tab-sort-label">
            Sort by
          </label>
          <select
            id="cities-sort"
            className="cities-tab-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as CitySortOption)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="cities-tab-grid">
        {sorted.map((c) => (
          <CityCard
            key={c.cityName}
            visit={c}
            imageUrl={cityImageUrls[c.cityName]}
            isSelected={false}
            onSelect={() => setSelectedCityName(c.cityName)}
          />
        ))}
      </div>
    </div>
  );
}

function CityCard({
  visit,
  imageUrl,
  isSelected,
  onSelect,
}: {
  visit: CityVisit;
  imageUrl?: string | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const timeAgo = formatTimeAgo(visit.lastVisitDate);
  const thumbUrl =
    imageUrl ??
    `https://placehold.co/400x200/2a2a2a/888?text=${encodeURIComponent(visit.cityName)}`;
  const placesLabel =
    visit.placeCount === 1
      ? "1 place"
      : `${visit.placeCount} places`;

  return (
    <button
      type="button"
      className={`city-card ${isSelected ? "city-card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="city-card-image-wrap">
        <img
          src={thumbUrl}
          alt=""
          className="city-card-image"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.includes("placehold.co")) return;
            target.src = `https://placehold.co/400x200/2a2a2a/888?text=${encodeURIComponent(visit.cityName)}`;
          }}
        />
        <span className="city-card-badge">{placesLabel}</span>
        <div className="city-card-overlay" />
      </div>
      <div className="city-card-body">
        <span className="city-card-name">{visit.cityName}</span>
        <span className="city-card-time">{timeAgo}</span>
      </div>
    </button>
  );
}
