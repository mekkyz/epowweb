"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: { stationId: string; valueKw: number; meters: number };
  }[];
};

// --- Module-level LRU geo cache (persists across navigations) ---
class GeoLRUCache {
  private maxSize: number;
  private cache: Map<string, FeatureCollection> = new Map();

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(timestamp: string): FeatureCollection | undefined {
    const entry = this.cache.get(timestamp);

    if (!entry) return undefined;
    this.cache.delete(timestamp);
    this.cache.set(timestamp, entry);

    return entry;
  }

  set(timestamp: string, data: FeatureCollection): void {
    if (this.cache.has(timestamp)) {
      this.cache.delete(timestamp);
    } else if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;

      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(timestamp, data);
  }

  has(timestamp: string): boolean {
    return this.cache.has(timestamp);
  }

  clear(): void {
    this.cache.clear();
  }
}

const geoCache = new GeoLRUCache(50);

// --- Module-level cache for day timestamps (avoids re-fetching) ---
const dayTsCache = new Map<string, string[]>();

// --- Module-level cache for batch-fetched days (avoids re-fetching) ---
const dayGeoCached = new Set<string>();

type MetadataCache = {
  bounds: { min: string | null; max: string | null; count: number } | null;
  selected: string | null;
  availableDates: string[] | null;
  fetchedAt: number;
};
let metadataCache: MetadataCache | null = null;
const CACHE_TTL = 5 * 60 * 1000;

function getValidMetadata(): MetadataCache | null {
  if (metadataCache && Date.now() - metadataCache.fetchedAt < CACHE_TTL) {
    return metadataCache;
  }

  return null;
}

// --- Prefetch infrastructure ---
let prefetchAbort: AbortController | null = null;

async function prefetchGeo(timestamps: string[], readyRef: { current: boolean }): Promise<void> {
  if (!readyRef.current) return;
  prefetchAbort?.abort();
  prefetchAbort = new AbortController();
  const signal = prefetchAbort.signal;

  for (const ts of timestamps) {
    if (signal.aborted) return;
    if (geoCache.has(ts)) continue;

    try {
      const res = await fetch(`/api/heatmap/geo?timestamp=${encodeURIComponent(ts)}`, {
        signal,
        priority: "low",
      } as RequestInit);

      if (!res.ok || signal.aborted) return;
      const body = await res.json();
      const fc = body.data?.featureCollection ?? null;

      if (fc && !signal.aborted) {
        geoCache.set(ts, fc);
      }
    } catch {
      return;
    }
  }
}

/** Extract date part "YYYY-MM-DD" from "YYYY-MM-DD HH:mm:ss" */
export function extractDate(ts: string): string {
  return ts.slice(0, 10);
}

/** Extract time part "HH:mm" from "YYYY-MM-DD HH:mm:ss" */
export function extractTime(ts: string): string {
  return ts.slice(11, 16);
}

export const SPEED_OPTIONS = [
  { label: "0.5x", ms: 2000 },
  { label: "1x", ms: 1000 },
  { label: "2x", ms: 500 },
  { label: "5x", ms: 200 },
  { label: "10x", ms: 100 },
] as const;

/**
 * Batch-fetch all geo data for a day in one request.
 * Populates geoCache so playback hits cache 100% — zero individual requests.
 */
async function fetchDayGeo(date: string): Promise<void> {
  if (dayGeoCached.has(date)) return;

  try {
    const res = await fetch(`/api/heatmap/geo/day?date=${encodeURIComponent(date)}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return;
    const body = await res.json();
    const entries: Record<string, { featureCollection: FeatureCollection }> =
      body.data?.entries ?? {};

    for (const [ts, entry] of Object.entries(entries)) {
      if (entry.featureCollection) {
        geoCache.set(ts, entry.featureCollection);
      }
    }
    dayGeoCached.add(date);
  } catch {
    // Non-fatal: individual fetches will still work as fallback
  }
}

/** Fetch timestamps for a specific date, with module-level caching. */
async function fetchDayTimestamps(date: string): Promise<string[]> {
  const cached = dayTsCache.get(date);

  if (cached) return cached;

  try {
    const res = await fetch(`/api/heatmap/available?date=${encodeURIComponent(date)}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const body = await res.json();
    const timestamps: string[] = body.data?.timestamps ?? [];

    dayTsCache.set(date, timestamps);

    return timestamps;
  } catch {
    return [];
  }
}

export function useHeatmapData(showError: (msg: string) => void) {
  const [bounds, setBounds] = useState<{
    min: string | null;
    max: string | null;
    count: number;
  } | null>(() => getValidMetadata()?.bounds ?? null);
  const [selected, setSelected] = useState<string | null>(
    () => getValidMetadata()?.selected ?? null,
  );
  const [features, setFeatures] = useState<FeatureCollection | null>(() => {
    const meta = getValidMetadata();

    return meta?.selected ? (geoCache.get(meta.selected) ?? null) : null;
  });
  const [availableDates, setAvailableDates] = useState<string[]>(
    () => getValidMetadata()?.availableDates ?? [],
  );
  const [dayTimestamps, setDayTimestamps] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasCachedData = useRef(
    !!getValidMetadata()?.selected && !!geoCache.get(getValidMetadata()!.selected!),
  );
  const lastLoadedTs = useRef<string | null>(getValidMetadata()?.selected ?? null);

  const readyRef = useRef(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoLoadResolveRef = useRef<(() => void) | null>(null);
  const sliderIndexRef = useRef(sliderIndex);

  sliderIndexRef.current = sliderIndex;
  const lastSliderIdxRef = useRef(0);
  const geoAbortRef = useRef<AbortController | null>(null);
  const playingRef = useRef(false);

  const dayTimestampsRef = useRef(dayTimestamps);

  dayTimestampsRef.current = dayTimestamps;

  // Init fetch
  useEffect(() => {
    if (hasCachedData.current) {
      hasCachedData.current = false;
      readyRef.current = true;
      const cached = getValidMetadata();

      if (cached?.selected) {
        const day = extractDate(cached.selected);

        setSelectedDate(day);
        // Load day timestamps + batch geo from cache or API
        Promise.all([fetchDayTimestamps(day), fetchDayGeo(day)]).then(([ts]) => {
          setDayTimestamps(ts);
          const idx = ts.indexOf(cached.selected!);

          if (idx >= 0) setSliderIndex(idx);
        });
      }

      return;
    }

    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const initRes = await fetch("/api/heatmap/init", {
          signal: AbortSignal.timeout(10000),
        });

        if (!active) return;
        if (!initRes.ok) throw new Error(`Failed to load heatmap data (${initRes.status})`);
        const initBody = await initRes.json();
        const b = initBody.data?.bounds ?? null;
        const initial = initBody.data?.initialTimestamp ?? null;
        const fc = initBody.data?.featureCollection ?? null;

        setBounds(b);
        setSelected(initial);
        if (initial) setSelectedDate(extractDate(initial));
        if (fc) {
          setFeatures(fc);
          lastLoadedTs.current = initial;
          if (initial) geoCache.set(initial, fc);
        }

        metadataCache = {
          bounds: b,
          selected: initial,
          availableDates: null,
          fetchedAt: Date.now(),
        };
      } catch (err) {
        console.error("Failed to load heatmap data:", err);
        showError("Failed to load heatmap data");
      } finally {
        if (active) setLoading(false);
      }

      // Load available dates (~365 entries — fast query)
      try {
        const availRes = await fetch("/api/heatmap/available", {
          signal: AbortSignal.timeout(10000),
        });

        if (!active) return;
        if (availRes.ok) {
          const availBody = await availRes.json();
          const dates: string[] = availBody.data?.dates ?? [];

          setAvailableDates(dates);
          if (metadataCache) metadataCache.availableDates = dates;
        }
      } catch (err) {
        console.warn("Failed to load available dates:", err);
      }

      // Load timestamps + batch geo for the initial day
      const sel = metadataCache?.selected;

      if (sel && active) {
        const day = extractDate(sel);
        const [dayTs] = await Promise.all([fetchDayTimestamps(day), fetchDayGeo(day)]);

        if (!active) return;
        setDayTimestamps(dayTs);
        const idx = dayTs.indexOf(sel);

        setSliderIndex(idx >= 0 ? idx : 0);
      }

      if (active) readyRef.current = true;
    };

    loadData();

    return () => {
      active = false;
    };
  }, [showError]);

  // Load geo data when selected changes
  useEffect(() => {
    if (!selected) {
      setFeatures(null);
      lastLoadedTs.current = null;

      return;
    }
    if (selected === lastLoadedTs.current) return;

    const cached = geoCache.get(selected);

    if (cached) {
      setFeatures(cached);
      lastLoadedTs.current = selected;
      if (metadataCache) metadataCache.selected = selected;
      geoLoadResolveRef.current?.();
      geoLoadResolveRef.current = null;
      // Only prefetch when NOT playing — playback manages its own prefetch
      if (readyRef.current && !playingRef.current) {
        const dts = dayTimestampsRef.current;
        const idx = dts.indexOf(selected);

        if (idx >= 0) {
          prefetchGeo(dts.slice(idx + 1, idx + 3), readyRef);
        }
      }

      return;
    }

    geoAbortRef.current?.abort();
    const controller = new AbortController();

    geoAbortRef.current = controller;
    let active = true;

    const loadGeo = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/heatmap/geo?timestamp=${encodeURIComponent(selected)}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Failed to load slice (${res.status})`);
        const body = await res.json();

        if (!active) return;
        const payload = body.data ?? body;
        const fc: FeatureCollection = payload.featureCollection ?? {
          type: "FeatureCollection",
          features: [],
        };

        geoCache.set(selected, fc);
        setFeatures(fc);
        lastLoadedTs.current = selected;
        if (metadataCache) metadataCache.selected = selected;

        // Only prefetch when NOT playing — playback manages its own prefetch
        if (readyRef.current && !playingRef.current) {
          const dts = dayTimestampsRef.current;
          const idx = dts.indexOf(selected);

          if (idx >= 0) {
            prefetchGeo(dts.slice(idx + 1, idx + 3), readyRef);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Failed to load heatmap data:", err);
        showError("Failed to load heatmap data");
      } finally {
        if (active) setLoading(false);
        geoLoadResolveRef.current?.();
        geoLoadResolveRef.current = null;
      }
    };

    loadGeo();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selected, showError]);

  useEffect(() => {
    if (!selected && bounds?.min) {
      setSelected(bounds.min);
    }
  }, [selected, bounds]);

  useEffect(() => {
    if (selected && dayTimestamps.length > 0) {
      const idx = dayTimestamps.indexOf(selected);

      if (idx >= 0 && idx !== sliderIndex) {
        setSliderIndex(idx);
      }
    }
  }, [selected, dayTimestamps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation helpers
  const stepByIndex = useCallback(
    (delta: number) => {
      const newIdx = Math.max(0, Math.min(dayTimestamps.length - 1, sliderIndex + delta));

      setSliderIndex(newIdx);
      setSelected(dayTimestamps[newIdx] ?? null);
    },
    [sliderIndex, dayTimestamps],
  );

  const onSliderChange = useCallback(
    (val: number) => {
      const direction = val > lastSliderIdxRef.current ? 1 : -1;

      lastSliderIdxRef.current = val;
      setSliderIndex(val);

      const ts = dayTimestamps[val];

      if (!ts) return;

      const cached = geoCache.get(ts);

      if (cached) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setFeatures(cached);
        lastLoadedTs.current = ts;
        setSelected(ts);

        const start = direction > 0 ? val + 1 : Math.max(0, val - 3);
        const end = direction > 0 ? val + 4 : val;
        const toPrefetch = dayTimestamps.slice(start, end);

        prefetchGeo(direction > 0 ? toPrefetch : [...toPrefetch].reverse(), readyRef);

        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSelected(ts);
      }, 100);
    },
    [dayTimestamps],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      prefetchAbort?.abort();
      geoAbortRef.current?.abort();
    };
  }, []);

  const switchToDay = useCallback(async (day: string) => {
    setSelectedDate(day);
    const [newDayTs] = await Promise.all([fetchDayTimestamps(day), fetchDayGeo(day)]);

    setDayTimestamps(newDayTs);

    return newDayTs;
  }, []);

  const onDateChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const day = e.target.value;

      if (!day) return;
      const newDayTs = await switchToDay(day);

      if (newDayTs.length > 0) {
        setSliderIndex(0);
        setSelected(newDayTs[0]);
      }
    },
    [switchToDay],
  );

  const stepByDay = useCallback(
    async (delta: -1 | 1) => {
      if (availableDates.length === 0) return;
      const idx = availableDates.indexOf(selectedDate);
      const nextIdx = idx + delta;

      if (nextIdx < 0 || nextIdx >= availableDates.length) return;
      const day = availableDates[nextIdx];

      const newDayTs = await switchToDay(day);

      if (newDayTs.length === 0) return;

      const currentTime = selected ? selected.slice(11) : "";
      let bestIdx = 0;

      if (currentTime) {
        for (let i = 0; i < newDayTs.length; i++) {
          const t = newDayTs[i].slice(11);

          if (t === currentTime) {
            bestIdx = i;
            break;
          }
          if (t <= currentTime) bestIdx = i;
        }
      }

      setSliderIndex(bestIdx);
      setSelected(newDayTs[bestIdx]);
    },
    [availableDates, selectedDate, selected, switchToDay],
  );

  // Playback
  const playSpeedRef = useRef(playSpeed);

  playSpeedRef.current = playSpeed;

  useEffect(() => {
    playingRef.current = isPlaying;
    if (!isPlaying) return;

    let active = true;
    const ts = dayTimestamps;

    const startIdx = sliderIndexRef.current;

    prefetchGeo(ts.slice(startIdx + 1, startIdx + 3), readyRef);

    const advance = async () => {
      if (!active || !playingRef.current) return;

      const prev = sliderIndexRef.current;
      const next = prev + 1;

      if (next >= ts.length) {
        setIsPlaying(false);

        return;
      }

      const nextTs = ts[next];

      prefetchGeo(ts.slice(next + 1, next + 3), readyRef);

      const cached = geoCache.get(nextTs);

      if (cached) {
        setSliderIndex(next);
        setFeatures(cached);
        lastLoadedTs.current = nextTs;
        setSelected(nextTs);
        await new Promise((r) => setTimeout(r, SPEED_OPTIONS[playSpeedRef.current].ms));
      } else {
        const geoLoaded = new Promise<void>((resolve) => {
          geoLoadResolveRef.current = resolve;
        });

        setSliderIndex(next);
        setSelected(nextTs);
        await Promise.all([
          geoLoaded,
          new Promise((r) => setTimeout(r, SPEED_OPTIONS[playSpeedRef.current].ms)),
        ]);
      }

      if (!active || !playingRef.current) return;
      advance();
    };

    advance();

    return () => {
      active = false;
      prefetchAbort?.abort();
      geoLoadResolveRef.current?.();
      geoLoadResolveRef.current = null;
    };
  }, [isPlaying, dayTimestamps]);

  const stopPlayback = useCallback(() => {
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const currentTs = dayTimestamps[sliderIndex] ?? selected ?? "";
  const currentTime = currentTs ? extractTime(currentTs) : "";
  const minDateAvail = availableDates[0] ?? "";
  const maxDateAvail = availableDates[availableDates.length - 1] ?? "";
  const minTime = dayTimestamps[0] ? extractTime(dayTimestamps[0]) : "";
  const maxTime =
    dayTimestamps.length > 0 ? extractTime(dayTimestamps[dayTimestamps.length - 1]) : "";

  return {
    // State
    bounds,
    selected,
    features,
    selectedDate,
    sliderIndex,
    isPlaying,
    setIsPlaying,
    playSpeed,
    setPlaySpeed,
    loading,
    dayTimestamps,
    availableDates,
    currentTime,
    minDateAvail,
    maxDateAvail,
    minTime,
    maxTime,
    // Actions
    stepByIndex,
    onSliderChange,
    onDateChange,
    stepByDay,
    stopPlayback,
  };
}
