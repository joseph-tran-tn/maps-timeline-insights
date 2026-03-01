import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTimeline } from "@/context/TimelineContext";
import {
  pointsToGeoJSON,
  pointsToLineGeoJSON,
  bboxFromPoints,
} from "@/lib/geojson";
import { getPointsInCity } from "@/lib/cities";
import { fetchPlaceDetails } from "@/lib/placesApi";
import type { TimelinePoint } from "@/types/timeline";
import type { CountryVisit } from "@/types/timeline";
import type { CityVisit } from "@/types/timeline";

mapboxgl.accessToken =
  typeof import.meta.env.VITE_MAPBOX_TOKEN === "string"
    ? import.meta.env.VITE_MAPBOX_TOKEN
    : "";

type TabId = "Day" | "Trips" | "Insights" | "Places" | "Cities" | "World";

function countryVisitsToGeoJSON(
  visits: CountryVisit[],
  selectedCode: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = visits.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: c.centroid },
    properties: {
      countryCode: c.countryCode,
      countryName: c.countryName,
      selected: selectedCode === c.countryCode,
    },
  }));
  return { type: "FeatureCollection", features };
}

function cityVisitsToGeoJSON(
  visits: CityVisit[],
  selectedName: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = visits.map((c) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: c.centroid },
    properties: {
      cityName: c.cityName,
      selected: selectedName === c.cityName,
    },
  }));
  return { type: "FeatureCollection", features };
}

export function MapView({ activeTab }: { activeTab: TabId }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const {
    visiblePoints,
    filteredPoints,
    placeCache,
    setPlaceCache,
    showLines,
    worldCountryVisits,
    selectedCountryCode,
    pointsInSelectedCountry,
    cityVisits,
    selectedCityName,
  } = useTimeline();

  const pointsInCity =
    activeTab === "Cities" && selectedCityName
      ? getPointsInCity(filteredPoints, placeCache, selectedCityName)
      : [];

  const pointsInCountry =
    activeTab === "World" && selectedCountryCode && pointsInSelectedCountry
      ? pointsInSelectedCountry
      : [];

  const pointsToDisplay =
    activeTab === "Cities" && selectedCityName
      ? pointsInCity
      : activeTab === "World" && selectedCountryCode
        ? pointsInCountry
        : activeTab === "World" || activeTab === "Cities"
          ? []
          : visiblePoints;

  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const isCountryDetail =
      activeTab === "World" &&
      selectedCountryCode &&
      pointsInCountry.length > 0;
    const isCityDetail =
      activeTab === "Cities" && selectedCityName && pointsInCity.length > 0;
    const points = isCountryDetail
      ? pointsInCountry
      : isCityDetail
        ? pointsInCity
        : visiblePoints;
    if (points.length === 0) return;
    const bbox = bboxFromPoints(points);
    if (!bbox) return;
    const [west, south, east, north] = bbox;
    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 40, maxZoom: 10 },
    );
  }, [
    activeTab,
    selectedCityName,
    selectedCountryCode,
    pointsInCity,
    pointsInCountry,
    visiblePoints,
  ]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [106.7, 10.8],
      zoom: 10,
    });
    mapRef.current = map;
    map.on("load", () => setMapReady(true));
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  const isWorldView = activeTab === "World";
  const isCitiesView = activeTab === "Cities";

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const pointsGeoJSON = pointsToGeoJSON(pointsToDisplay);
    const lineGeoJSON = pointsToLineGeoJSON(pointsToDisplay);

    if (!map.getSource("timeline-points")) {
      map.addSource("timeline-points", {
        type: "geojson",
        data: pointsGeoJSON,
      });
      map.addLayer({
        id: "timeline-points-layer",
        type: "circle",
        source: "timeline-points",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ff0000",
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255, 255, 255, .5)",
        },
      });
      map.addSource("timeline-line", {
        type: "geojson",
        data: lineGeoJSON ?? { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "timeline-line-layer",
        type: "line",
        source: "timeline-line",
        paint: {
          "line-color": "#aaaaaa",
          "line-width": 2,
        },
      });
    } else {
      (map.getSource("timeline-points") as mapboxgl.GeoJSONSource).setData(
        pointsGeoJSON,
      );
      const lineData =
        lineGeoJSON ??
        ({
          type: "FeatureCollection",
          features: [],
        } as GeoJSON.FeatureCollection);
      (map.getSource("timeline-line") as mapboxgl.GeoJSONSource).setData(
        lineData,
      );
    }

    const showPoints = pointsToDisplay.length > 0;
    const isCityDetail = isCitiesView && !!selectedCityName;
    const showLine = pointsToDisplay.length > 1 && showLines && !isCityDetail;

    map.setLayoutProperty(
      "timeline-points-layer",
      "visibility",
      showPoints ? "visible" : "none",
    );
    map.setLayoutProperty(
      "timeline-line-layer",
      "visibility",
      showLine ? "visible" : "none",
    );

    if (showPoints) fitBounds();
  }, [
    mapReady,
    pointsToDisplay,
    showLines,
    isWorldView,
    isCitiesView,
    selectedCityName,
    fitBounds,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const visits = isCitiesView ? (cityVisits ?? []) : [];
    const cityData = cityVisitsToGeoJSON(visits, selectedCityName);

    if (!map.getSource("cities-points")) {
      map.addSource("cities-points", {
        type: "geojson",
        data: cityData,
      });
      map.addLayer({
        id: "cities-points-layer",
        type: "circle",
        source: "cities-points",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 10, 6],
          "circle-color": ["case", ["get", "selected"], "#4a9eff", "#dc3545"],
          "circle-stroke-width": ["case", ["get", "selected"], 3, 1],
          "circle-stroke-color": "#fff",
        },
      });
    } else {
      (map.getSource("cities-points") as mapboxgl.GeoJSONSource).setData(
        cityData,
      );
    }

    map.setLayoutProperty(
      "cities-points-layer",
      "visibility",
      isCitiesView && !selectedCityName && visits.length > 0
        ? "visible"
        : "none",
    );

    if (isCitiesView && !selectedCityName && visits.length > 0) {
      const lngs = visits.map((c) => c.centroid[0]);
      const lats = visits.map((c) => c.centroid[1]);
      const padding = 60;
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding, maxZoom: 4 },
      );
    }
  }, [mapReady, isCitiesView, cityVisits, selectedCityName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const visits = isWorldView ? (worldCountryVisits ?? []) : [];
    const worldData = countryVisitsToGeoJSON(visits, selectedCountryCode);

    if (!map.getSource("world-countries")) {
      map.addSource("world-countries", {
        type: "geojson",
        data: worldData,
      });
      map.addLayer({
        id: "world-countries-layer",
        type: "circle",
        source: "world-countries",
        paint: {
          "circle-radius": ["case", ["get", "selected"], 10, 6],
          "circle-color": ["case", ["get", "selected"], "#ff0000", "#dc3545"],
          "circle-stroke-width": ["case", ["get", "selected"], 3, 1],
          "circle-stroke-color": "#fff",
        },
      });
    } else {
      (map.getSource("world-countries") as mapboxgl.GeoJSONSource).setData(
        worldData,
      );
    }

    const showWorldMarkers =
      isWorldView && visits.length > 0 && !selectedCountryCode;
    map.setLayoutProperty(
      "world-countries-layer",
      "visibility",
      showWorldMarkers ? "visible" : "none",
    );

    if (isWorldView && visits.length > 0 && !selectedCountryCode) {
      const lngs = visits.map((c) => c.centroid[0]);
      const lats = visits.map((c) => c.centroid[1]);
      const padding = 60;
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding, maxZoom: 4 },
      );
    }
  }, [mapReady, isWorldView, worldCountryVisits, selectedCountryCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const fs = map.queryRenderedFeatures(e.point, {
        layers: ["timeline-points-layer"],
      });
      if (!fs.length) return;
      const f = fs[0];
      const props = f.properties as { timestamp?: string; placeId?: string };
      const coords = (f.geometry as GeoJSON.Point).coordinates;
      const point = pointsToDisplay.find(
        (p) =>
          p.lng === coords[0] &&
          p.lat === coords[1] &&
          p.timestamp === props.timestamp,
      ) as TimelinePoint | undefined;
      if (!point) return;

      popupRef.current?.remove();
      const placeId = point.placeId ?? props.placeId;
      const cached = placeId ? placeCache[placeId] : null;

      const popupNode = document.createElement("div");
      popupNode.className = "map-popup";
      popupNode.innerHTML = `
        <div class="map-popup-time">${new Date(point.timestamp).toLocaleString()}</div>
        ${point.accuracy != null ? `<div class="map-popup-accuracy">Accuracy: ${point.accuracy} m</div>` : ""}
        <div class="map-popup-place">${cached?.displayName ?? "—"}</div>
        <div class="map-popup-addr">${cached?.formattedAddress ?? ""}</div>
        ${placeId && !cached ? '<button type="button" class="map-popup-fetch">Fetch info</button>' : ""}
      `;
      if (placeId && !cached) {
        const btn = popupNode.querySelector(".map-popup-fetch");
        btn?.addEventListener("click", async () => {
          const entry = await fetchPlaceDetails(placeId);
          if (entry) {
            setPlaceCache((prev) => ({ ...prev, [placeId]: entry }));
            const placeEl = popupNode.querySelector(".map-popup-place");
            const addrEl = popupNode.querySelector(".map-popup-addr");
            if (placeEl) placeEl.textContent = entry.displayName;
            if (addrEl) addrEl.textContent = entry.formattedAddress;
            btn?.remove();
          }
        });
      }

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: true })
        .setLngLat([coords[0], coords[1]])
        .setDOMContent(popupNode)
        .addTo(map);
      popupRef.current = popup;
      popup.on("close", () => {
        popupRef.current = null;
      });
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      popupRef.current?.remove();
    };
  }, [mapReady, pointsToDisplay, placeCache, setPlaceCache]);

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map" />
      <button
        type="button"
        className="recentre-btn"
        onClick={fitBounds}
        aria-label="Re-centre map"
      >
        Re-centre
      </button>
    </div>
  );
}
