import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  TimelineDataset,
  TimelinePoint,
  PlaceCache,
  CountryVisit,
  CityVisit,
} from "@/types/timeline";
import { markOutliers } from "@/lib/outliers";
import { parseTimelineData } from "@/lib/parseRecords";
import { parseCityFromFormattedAddress } from "@/lib/cities";
import { getPointsInCountry } from "@/lib/countries";

export interface TimeRange {
  start: number;
  end: number;
}

interface TimelineState {
  datasets: TimelineDataset[];
  placeCache: PlaceCache;
  selectedDatasetIds: Set<string>;
  timeRange: TimeRange | null;
  deletedPointIds: Set<string>;
  showLines: boolean;
  worldCountryVisits: CountryVisit[] | null;
  selectedCountryCode: string | null;
  pointsInSelectedCountry: TimelinePoint[] | null;
  cityVisits: CityVisit[] | null;
  selectedCityName: string | null;
}

interface TimelineContextValue extends TimelineState {
  addDataset: (
    name: string,
    points: TimelinePoint[],
    sourceId?: string,
  ) => void;
  removeDataset: (id: string) => void;
  setPlaceCache: (
    cache: PlaceCache | ((prev: PlaceCache) => PlaceCache),
  ) => void;
  toggleDataset: (id: string) => void;
  setTimeRange: (range: TimeRange | null) => void;
  setShowLines: (show: boolean) => void;
  setWorldCountryVisits: (visits: CountryVisit[] | null) => void;
  setSelectedCountryCode: (code: string | null) => void;
  setCityVisits: (visits: CityVisit[] | null) => void;
  setSelectedCityName: (name: string | null) => void;
  removePoint: (id: string) => void;
  mergedPoints: TimelinePoint[];
  filteredPoints: TimelinePoint[];
  visiblePoints: TimelinePoint[];
  timeRangeBounds: { min: number; max: number } | null;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

const nextId = (() => {
  let n = 0;
  return () => `ds-${Date.now()}-${++n}`;
})();

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimelineState>({
    datasets: [],
    placeCache: {},
    selectedDatasetIds: new Set(),
    timeRange: null,
    deletedPointIds: new Set(),
    showLines: false,
    worldCountryVisits: null,
    selectedCountryCode: null,
    pointsInSelectedCountry: null,
    cityVisits: null,
    selectedCityName: null,
  });

  useEffect(() => {
    const load = async () => {
      let cache: PlaceCache = {};
      try {
        const res = await fetch("/TimelinePlaceCache.json");
        if (res.ok) {
          const data = (await res.json()) as PlaceCache;
          if (data && typeof data === "object") cache = { ...cache, ...data };
        }
      } catch {}
      try {
        const stored = localStorage.getItem("timeline-place-cache");
        if (stored) {
          const data = JSON.parse(stored) as PlaceCache;
          if (data && typeof data === "object") cache = { ...cache, ...data };
        }
      } catch {}
      if (Object.keys(cache).length > 0) {
        const enriched = { ...cache };
        for (const [placeId, entry] of Object.entries(enriched)) {
          if (!entry.city && entry.formattedAddress) {
            const city = parseCityFromFormattedAddress(entry.formattedAddress);
            if (city) {
              enriched[placeId] = { ...entry, city };
            }
          }
        }
        setState((s) => ({ ...s, placeCache: enriched }));
        try {
          localStorage.setItem(
            "timeline-place-cache",
            JSON.stringify(enriched),
          );
        } catch {}
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (Object.keys(state.placeCache).length === 0) return;
    try {
      localStorage.setItem(
        "timeline-place-cache",
        JSON.stringify(state.placeCache),
      );
    } catch {}
  }, [state.placeCache]);

  const addDataset = useCallback(
    (name: string, points: TimelinePoint[], sourceId?: string) => {
      const id = nextId();
      const ds: TimelineDataset = {
        id,
        name,
        points,
        sourceId: sourceId ?? id,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        datasets: [...prev.datasets, ds],
        selectedDatasetIds: new Set([...prev.selectedDatasetIds, id]),
      }));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/Timeline.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const points = parseTimelineData(data);
        if (points.length > 0) addDataset("Timeline", points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [addDataset]);

  const removeDataset = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      datasets: prev.datasets.filter((d) => d.id !== id),
      selectedDatasetIds: (() => {
        const next = new Set(prev.selectedDatasetIds);
        next.delete(id);
        return next;
      })(),
    }));
  }, []);

  const setPlaceCache = useCallback(
    (update: PlaceCache | ((prev: PlaceCache) => PlaceCache)) => {
      setState((prev) => ({
        ...prev,
        placeCache:
          typeof update === "function" ? update(prev.placeCache) : update,
      }));
    },
    [],
  );

  const toggleDataset = useCallback((id: string) => {
    setState((prev) => {
      const next = new Set(prev.selectedDatasetIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, selectedDatasetIds: next };
    });
  }, []);

  const mergedPoints = useMemo(() => {
    const selected = state.datasets.filter((d) =>
      state.selectedDatasetIds.has(d.id),
    );
    const all: TimelinePoint[] = [];
    for (const ds of selected) {
      for (const p of ds.points) {
        all.push({ ...p, sourceId: p.sourceId ?? ds.sourceId });
      }
    }
    all.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    all.forEach((p, i) => {
      p.id = `m-${i}`;
    });
    markOutliers(all);
    return all;
  }, [state.datasets, state.selectedDatasetIds]);

  const setTimeRange = useCallback((range: TimeRange | null) => {
    setState((prev) => ({ ...prev, timeRange: range }));
  }, []);

  const setShowLines = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showLines: show }));
  }, []);

  const setWorldCountryVisits = useCallback((visits: CountryVisit[] | null) => {
    setState((prev) => ({ ...prev, worldCountryVisits: visits }));
  }, []);

  const setSelectedCountryCode = useCallback((code: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedCountryCode: code,
      pointsInSelectedCountry: null,
    }));
  }, []);

  const setCityVisits = useCallback((visits: CityVisit[] | null) => {
    setState((prev) => ({ ...prev, cityVisits: visits }));
  }, []);

  const setSelectedCityName = useCallback((name: string | null) => {
    setState((prev) => ({ ...prev, selectedCityName: name }));
  }, []);

  const filteredPoints = useMemo(() => {
    const range = state.timeRange;
    if (!range) return mergedPoints;
    return mergedPoints.filter((p) => {
      const t = new Date(p.timestamp).getTime();
      return t >= range.start && t <= range.end;
    });
  }, [mergedPoints, state.timeRange]);

  const removePoint = useCallback((id: string) => {
    setState((prev) => {
      const next = new Set(prev.deletedPointIds);
      next.add(id);
      return { ...prev, deletedPointIds: next };
    });
  }, []);

  const visiblePoints = useMemo(
    () =>
      filteredPoints.filter((p) => p.id && !state.deletedPointIds.has(p.id)),
    [filteredPoints, state.deletedPointIds],
  );

  const timeRangeBounds = useMemo(() => {
    if (mergedPoints.length === 0) return null;
    const times = mergedPoints.map((p) => new Date(p.timestamp).getTime());
    return { min: Math.min(...times), max: Math.max(...times) };
  }, [mergedPoints]);

  useEffect(() => {
    const bounds = timeRangeBounds;
    if (!bounds) return;
    setState((prev) => ({
      ...prev,
      timeRange: { start: bounds.min, end: bounds.max },
    }));
  }, [timeRangeBounds?.min, timeRangeBounds?.max]);

  useEffect(() => {
    const code = state.selectedCountryCode;
    if (!code || filteredPoints.length === 0) {
      if (state.pointsInSelectedCountry !== null) {
        setState((prev) => ({ ...prev, pointsInSelectedCountry: null }));
      }
      return;
    }
    let cancelled = false;
    getPointsInCountry(filteredPoints, state.placeCache, code).then(
      (pts) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, pointsInSelectedCountry: pts }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [state.selectedCountryCode, state.placeCache, filteredPoints]);

  const value = useMemo<TimelineContextValue>(
    () => ({
      ...state,
      addDataset,
      removeDataset,
      setPlaceCache,
      toggleDataset,
      setTimeRange,
      setShowLines,
      setWorldCountryVisits,
      setSelectedCountryCode,
      setCityVisits,
      setSelectedCityName,
      removePoint,
      mergedPoints,
      filteredPoints,
      visiblePoints,
      timeRangeBounds,
    }),
    [
      state,
      addDataset,
      removeDataset,
      setPlaceCache,
      toggleDataset,
      setTimeRange,
      setShowLines,
      setWorldCountryVisits,
      setSelectedCountryCode,
      setCityVisits,
      setSelectedCityName,
      removePoint,
      mergedPoints,
      filteredPoints,
      visiblePoints,
      timeRangeBounds,
    ],
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error("useTimeline must be used within TimelineProvider");
  return ctx;
}
