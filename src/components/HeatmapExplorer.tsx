'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, { Layer, LayerProps, NavigationControl, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useTheme } from 'next-themes';
import {
  MapPinned,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
  Search,
  Maximize2,
  Minimize2,
  Info,
  Play,
  Pause,
} from 'lucide-react';
import { Button, Spinner, Input, Slider, useToast } from '@/components/ui';
import { MAP_STYLES } from '@/lib/constants';
import { checkWebGLSupport } from '@/lib/webgl';
import { useAuth } from '@/context/AuthProvider';
import clsx from 'clsx';

type FeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
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
    // Move to end (most recently used)
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

// Metadata cache (bounds, allTimestamps, selected) — separate from geo slices
type MetadataCache = {
  bounds: { min: string | null; max: string | null; count: number } | null;
  selected: string | null;
  allTimestamps: string[] | null;
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
      const res = await fetch(
        `/api/heatmap/geo?timestamp=${encodeURIComponent(ts)}`,
        { signal, priority: 'low' } as RequestInit,
      );
      if (!res.ok || signal.aborted) return;
      const body = await res.json();
      const fc = body.data?.featureCollection ?? null;
      if (fc && !signal.aborted) {
        geoCache.set(ts, fc);
      }
    } catch {
      return; // Aborted or network error
    }
  }
}

/** Extract date part "YYYY-MM-DD" from "YYYY-MM-DD HH:mm:ss" */
function extractDate(ts: string): string {
  return ts.slice(0, 10);
}

/** Extract time part "HH:mm" from "YYYY-MM-DD HH:mm:ss" */
function extractTime(ts: string): string {
  return ts.slice(11, 16);
}

const SPEED_OPTIONS = [
  { label: '0.5x', ms: 2000 },
  { label: '1x', ms: 1000 },
  { label: '2x', ms: 500 },
  { label: '5x', ms: 200 },
  { label: '10x', ms: 100 },
] as const;

export default function HeatmapExplorer() {
  const { resolvedTheme } = useTheme();
  const { success, error: showError } = useToast();
  const { isDemo } = useAuth();

  // Initialize state from cache if valid (instant restore on navigation)
  const [bounds, setBounds] = useState<{ min: string | null; max: string | null; count: number } | null>(() => getValidMetadata()?.bounds ?? null);
  const [selected, setSelected] = useState<string | null>(() => getValidMetadata()?.selected ?? null);
  const [features, setFeatures] = useState<FeatureCollection | null>(() => {
    const meta = getValidMetadata();
    return meta?.selected ? geoCache.get(meta.selected) ?? null : null;
  });
  const [allTimestamps, setAllTimestamps] = useState<string[]>(() => getValidMetadata()?.allTimestamps ?? []);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [sliderIndex, setSliderIndex] = useState(0); // index into dayTimestamps
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // index into SPEED_OPTIONS
  const [loading, setLoading] = useState(false);
  const hasCachedData = useRef(!!getValidMetadata()?.selected && !!geoCache.get(getValidMetadata()!.selected!));
  const lastLoadedTs = useRef<string | null>(getValidMetadata()?.selected ?? null);

  // Prefetch readiness gate — true only after init + available complete
  const readyRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hover, setHover] = useState<{
    stationId: string;
    valueKw: number;
    meters: number;
    x: number;
    y: number;
  } | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [thresholdMin, setThresholdMin] = useState(0);
  const [thresholdMax, setThresholdMax] = useState(800);
  const [canRenderMap] = useState<boolean>(() => checkWebGLSupport());

  // Debounce ref for slider
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to signal when a geo fetch completes (for playback to await)
  const geoLoadResolveRef = useRef<(() => void) | null>(null);

  // Keep slider index accessible synchronously in async playback loop
  const sliderIndexRef = useRef(sliderIndex);
  sliderIndexRef.current = sliderIndex;

  // Track last slider direction for directional prefetch
  const lastSliderIdxRef = useRef(0);

  // AbortController for the primary geo fetch
  const geoAbortRef = useRef<AbortController | null>(null);

  // Timestamps filtered to the selected day (slider/playback scope)
  const dayTimestamps = useMemo(() => {
    if (!selectedDate || allTimestamps.length === 0) return [];
    return allTimestamps.filter((ts) => ts.startsWith(selectedDate));
  }, [allTimestamps, selectedDate]);

  // Keep dayTimestamps accessible in prefetch without re-triggering effects
  const dayTimestampsRef = useRef(dayTimestamps);
  dayTimestampsRef.current = dayTimestamps;

  // All unique dates that have data (for date picker min/max)
  const availableDates = useMemo(() => {
    const dates = new Set(allTimestamps.map((ts) => extractDate(ts)));
    return Array.from(dates).sort();
  }, [allTimestamps]);

  // Map style follows app theme
  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch init first (fast), then available timestamps in background (non-blocking)
  useEffect(() => {
    if (hasCachedData.current) {
      hasCachedData.current = false;
      readyRef.current = true;
      const cached = getValidMetadata();
      if (cached?.selected) {
        setSelectedDate(extractDate(cached.selected));
      }
      if (cached?.allTimestamps && cached.selected) {
        const day = extractDate(cached.selected);
        const dayTs = cached.allTimestamps.filter((ts) => ts.startsWith(day));
        const idx = dayTs.indexOf(cached.selected);
        if (idx >= 0) setSliderIndex(idx);
      }
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const initRes = await fetch('/api/heatmap/init', {
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
          // Store initial slice in geo LRU cache
          if (initial) geoCache.set(initial, fc);
        }

        metadataCache = { bounds: b, selected: initial, allTimestamps: null, fetchedAt: Date.now() };
      } catch (err) {
        console.error('Failed to load heatmap data:', err);
        showError('Failed to load heatmap data');
      } finally {
        if (active) setLoading(false);
      }

      // Fetch available timestamps in background (non-blocking)
      try {
        const availRes = await fetch('/api/heatmap/available', {
          signal: AbortSignal.timeout(10000),
        });
        if (!active) return;
        if (availRes.ok) {
          const availBody = await availRes.json();
          const timestamps: string[] = availBody.data?.timestamps ?? [];
          setAllTimestamps(timestamps);

          const sel = metadataCache?.selected;
          if (sel && timestamps.length > 0) {
            const day = extractDate(sel);
            const dayTs = timestamps.filter((ts) => ts.startsWith(day));
            const idx = dayTs.indexOf(sel);
            setSliderIndex(idx >= 0 ? idx : 0);
          }

          if (metadataCache) metadataCache.allTimestamps = timestamps;
        }
      } catch (err) {
        console.warn('Failed to load available timestamps:', err);
      }

      // All init done — enable prefetching
      if (active) readyRef.current = true;
    };
    load();
    return () => {
      active = false;
    };
  }, [showError]);

  // Load geo data when selected changes — with LRU cache fast path
  useEffect(() => {
    if (!selected) {
      setFeatures(null);
      lastLoadedTs.current = null;
      return;
    }
    if (selected === lastLoadedTs.current) return;

    // Fast path: LRU cache hit → apply instantly, no network, no spinner
    const cached = geoCache.get(selected);
    if (cached) {
      setFeatures(cached);
      lastLoadedTs.current = selected;
      if (metadataCache) metadataCache.selected = selected;
      geoLoadResolveRef.current?.();
      geoLoadResolveRef.current = null;
      // Trigger prefetch for next few timestamps
      if (readyRef.current) {
        const dts = dayTimestampsRef.current;
        const idx = dts.indexOf(selected);
        if (idx >= 0) {
          prefetchGeo(dts.slice(idx + 1, idx + 4), readyRef);
        }
      }
      return;
    }

    // Cache miss: fetch from network
    geoAbortRef.current?.abort();
    const controller = new AbortController();
    geoAbortRef.current = controller;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/heatmap/geo?timestamp=${encodeURIComponent(selected)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Failed to load slice (${res.status})`);
        const body = await res.json();
        if (!active) return;
        const payload = body.data ?? body;
        const fc: FeatureCollection = payload.featureCollection ?? { type: 'FeatureCollection', features: [] };

        geoCache.set(selected, fc);
        setFeatures(fc);
        lastLoadedTs.current = selected;
        if (metadataCache) metadataCache.selected = selected;

        // Trigger prefetch for next few timestamps
        if (readyRef.current) {
          const dts = dayTimestampsRef.current;
          const idx = dts.indexOf(selected);
          if (idx >= 0) {
            prefetchGeo(dts.slice(idx + 1, idx + 4), readyRef);
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('Failed to load heatmap data:', err);
        showError('Failed to load heatmap data');
        // Keep previous features on error — don't clear the map
      } finally {
        if (active) setLoading(false);
        geoLoadResolveRef.current?.();
        geoLoadResolveRef.current = null;
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selected, showError]);

  // Ensure selected stays in sync if state was cleared
  useEffect(() => {
    if (!selected && bounds?.min) {
      setSelected(bounds.min);
    }
  }, [selected, bounds]);

  // Keep slider index in sync when selected changes externally
  useEffect(() => {
    if (selected && dayTimestamps.length > 0) {
      const idx = dayTimestamps.indexOf(selected);
      if (idx >= 0 && idx !== sliderIndex) {
        setSliderIndex(idx);
      }
    }
  }, [selected, dayTimestamps]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Navigation helpers (all local, no API calls) ---
  const stepByIndex = useCallback((delta: number) => {
    const newIdx = Math.max(0, Math.min(dayTimestamps.length - 1, sliderIndex + delta));
    setSliderIndex(newIdx);
    setSelected(dayTimestamps[newIdx] ?? null);
  }, [sliderIndex, dayTimestamps]);

  // Slider change — instant if cached, debounced otherwise
  const onSliderChange = useCallback((val: number) => {
    const direction = val > lastSliderIdxRef.current ? 1 : -1;
    lastSliderIdxRef.current = val;
    setSliderIndex(val);

    const ts = dayTimestamps[val];
    if (!ts) return;

    // Instant: cached → apply immediately, no debounce
    const cached = geoCache.get(ts);
    if (cached) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setFeatures(cached);
      lastLoadedTs.current = ts;
      setSelected(ts);

      // Prefetch 3 in drag direction
      const start = direction > 0 ? val + 1 : Math.max(0, val - 3);
      const end = direction > 0 ? val + 4 : val;
      const toPrefetch = dayTimestamps.slice(start, end);
      prefetchGeo(direction > 0 ? toPrefetch : [...toPrefetch].reverse(), readyRef);
      return;
    }

    // Not cached: debounce the fetch
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelected(ts);
    }, 100);
  }, [dayTimestamps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      prefetchAbort?.abort();
      geoAbortRef.current?.abort();
    };
  }, []);

  // Date picker change — switches to a new day
  const onDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const day = e.target.value; // YYYY-MM-DD
    if (!day || allTimestamps.length === 0) return;
    setSelectedDate(day);
    // Select the first timestamp of that day
    const firstOfDay = allTimestamps.find((ts) => ts.startsWith(day));
    if (firstOfDay) {
      setSliderIndex(0);
      setSelected(firstOfDay);
    }
  }, [allTimestamps]);

  // Navigate to prev/next available day, preserving the current time-of-day
  const stepByDay = useCallback((delta: -1 | 1) => {
    if (availableDates.length === 0) return;
    const idx = availableDates.indexOf(selectedDate);
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= availableDates.length) return;
    const day = availableDates[nextIdx];
    setSelectedDate(day);

    const newDayTs = allTimestamps.filter((ts) => ts.startsWith(day));
    if (newDayTs.length === 0) return;

    // Try to land on the same time-of-day, or the closest available timestamp
    const currentTime = selected ? selected.slice(11) : '';
    let bestIdx = 0;
    if (currentTime) {
      for (let i = 0; i < newDayTs.length; i++) {
        const t = newDayTs[i].slice(11);
        if (t === currentTime) { bestIdx = i; break; }
        if (t <= currentTime) bestIdx = i;
      }
    }

    setSliderIndex(bestIdx);
    setSelected(newDayTs[bestIdx]);
  }, [availableDates, selectedDate, allTimestamps, selected]);

  // --- Playback ---
  const playingRef = useRef(false);
  const playSpeedRef = useRef(playSpeed);
  playSpeedRef.current = playSpeed;

  useEffect(() => {
    playingRef.current = isPlaying;
    if (!isPlaying) return;

    let active = true;
    const ts = dayTimestamps;

    // Prefetch first batch ahead of play cursor
    const startIdx = sliderIndexRef.current;
    prefetchGeo(ts.slice(startIdx + 1, startIdx + 6), readyRef);

    const advance = async () => {
      if (!active || !playingRef.current) return;

      const prev = sliderIndexRef.current;
      const next = prev + 1;

      if (next >= ts.length) {
        setIsPlaying(false);
        return;
      }

      const nextTs = ts[next];

      // Kick off prefetch for next 5 beyond current (fire-and-forget)
      prefetchGeo(ts.slice(next + 1, next + 6), readyRef);

      // Cache hit → apply instantly, only wait speed delay
      const cached = geoCache.get(nextTs);
      if (cached) {
        setSliderIndex(next);
        setFeatures(cached);
        lastLoadedTs.current = nextTs;
        setSelected(nextTs);
        await new Promise((r) => setTimeout(r, SPEED_OPTIONS[playSpeedRef.current].ms));
      } else {
        // Cache miss → wait for both fetch + speed delay
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

  // Stop playback on any manual interaction
  const stopPlayback = useCallback(() => {
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  // Helper: lerp a value between min/max to a 0-1 fraction
  const tFrac = useCallback((frac: number) => {
    return thresholdMin + frac * (thresholdMax - thresholdMin);
  }, [thresholdMin, thresholdMax]);

  // Heatmap layer - professional vibrant green-yellow-red style
  const heatmapLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-layer',
      type: 'heatmap',
      maxzoom: 17,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['exponential', 2],
          ['get', 'valueKw'],
          tFrac(0), 0.1,
          tFrac(0.06), 0.3,
          tFrac(0.19), 0.5,
          tFrac(0.38), 0.75,
          tFrac(0.63), 0.9,
          tFrac(1), 1,
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 2.2,
          14, 2.8,
          16, 3.5,
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 255, 0, 0)',
          0.08, 'rgba(0, 255, 0, 0.8)',
          0.2, 'rgba(128, 255, 0, 0.9)',
          0.35, 'rgba(200, 255, 0, 0.95)',
          0.45, 'rgba(255, 255, 0, 0.97)',
          0.55, 'rgba(255, 200, 0, 1)',
          0.65, 'rgba(255, 140, 0, 1)',
          0.75, 'rgba(255, 70, 0, 1)',
          0.88, 'rgba(255, 20, 0, 1)',
          1, 'rgba(180, 0, 0, 1)',
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 25,
          14, 40,
          16, 60,
          18, 80,
        ],
        'heatmap-opacity': 0.85,
      },
    }),
    [tFrac],
  );

  const circleGlowLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-circles-glow',
      type: 'circle',
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 12,
          16, 20,
          18, 30,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'valueKw'],
          tFrac(0), '#00ff00',
          tFrac(0.33), '#ffff00',
          tFrac(0.5), '#ff9600',
          tFrac(0.83), '#ff1e00',
        ],
        'circle-opacity': 0.4,
        'circle-blur': 1,
      },
    }),
    [tFrac],
  );

  const circleLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-circles',
      type: 'circle',
      minzoom: 14,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 5,
          16, 10,
          18, 16,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'valueKw'],
          tFrac(0), '#00ff00',
          tFrac(0.07), '#80ff00',
          tFrac(0.13), '#c8ff00',
          tFrac(0.19), '#ffff00',
          tFrac(0.25), '#ffc800',
          tFrac(0.38), '#ff9600',
          tFrac(0.5), '#ff5000',
          tFrac(0.63), '#ff1e00',
          tFrac(0.88), '#c80000',
        ],
        'circle-opacity': 1,
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          14, 2,
          16, 3,
          18, 4,
        ],
        'circle-stroke-color': mapStyleType === 'light' ? '#ffffff' : '#1a1a2e',
        'circle-stroke-opacity': 1,
      },
    }),
    [mapStyleType, tFrac],
  );

  const list = useMemo(() => {
    const feats = features?.features ?? [];
    const sorted = [...feats].sort((a, b) => b.properties.valueKw - a.properties.valueKw);
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((f) => f.properties.stationId.toLowerCase().includes(q));
  }, [features, searchQuery]);

  const mapView = {
    longitude: 8.4346,
    latitude: 49.099,
    zoom: 14.5,
  };

  // ALT+drag rotation support
  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (!ref) return;
    const map = ref.getMap();
    const canvas = map.getCanvasContainer();
    let dragging = false;
    let prevX = 0;
    let prevY = 0;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.altKey && e.button === 0) {
        dragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      map.setBearing(map.getBearing() + dx * 0.5);
      map.setPitch(Math.max(0, Math.min(60, map.getPitch() - dy * 0.5)));
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        canvas.style.cursor = '';
      }
    });
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = document.getElementById('heatmap-explorer-container');
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  }, []);

  const downloadSlice = async (format: 'json' | 'csv') => {
    if (!selected) return;
    try {
      const res = await fetch(`/api/heatmap?timestamp=${encodeURIComponent(selected)}`);
      if (!res.ok) {
        showError('Failed to download data');
        return;
      }
      const body = await res.json();
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `heatmap-${selected}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const points = body.points ?? [];
        const rows = ['meterId,valueKw,unit'];
        points.forEach((p: { meterId: string; valueKw: number | null; unit: string }) => {
          rows.push(`${p.meterId},${p.valueKw ?? ''},${p.unit ?? ''}`);
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `heatmap-${selected}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      success(`Downloaded heatmap data as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to download data');
    }
  };

  // Current timestamp for display
  const currentTs = dayTimestamps[sliderIndex] ?? selected ?? '';
  const currentTime = currentTs ? extractTime(currentTs) : '';
  const minDateAvail = availableDates[0] ?? '';
  const maxDateAvail = availableDates[availableDates.length - 1] ?? '';
  const minTime = dayTimestamps[0] ? extractTime(dayTimestamps[0]) : '';
  const maxTime = dayTimestamps.length > 0 ? extractTime(dayTimestamps[dayTimestamps.length - 1]) : '';

  return (
    <div
      id="heatmap-explorer-container"
      className={clsx(
        'space-y-4',
        isFullscreen && 'fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background p-4'
      )}
    >
      {/* Controls Row 1: Date picker + Playback + Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date picker with prev/next day */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByDay(-1); }}
            disabled={isDemo || availableDates.indexOf(selectedDate) <= 0}
            title={isDemo ? 'Full access required' : 'Previous day'}
            aria-label="Previous day"
            className="rounded-r-none border-r-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { stopPlayback(); onDateChange(e); }}
            disabled={isDemo}
            min={minDateAvail || undefined}
            max={maxDateAvail || undefined}
            className="h-full rounded-none border border-x-0 border-border-strong bg-white px-2.5 py-1 text-xs text-foreground outline-none focus:ring-0 dark:bg-background"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByDay(1); }}
            disabled={isDemo || availableDates.indexOf(selectedDate) >= availableDates.length - 1}
            title={isDemo ? 'Full access required' : 'Next day'}
            aria-label="Next day"
            className="rounded-l-none border-l-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Timestamp step controls */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByIndex(-1); }}
            disabled={isDemo || sliderIndex <= 0}
            title={isDemo ? 'Full access required' : 'Previous timestamp'}
            aria-label="Previous timestamp"
            className="rounded-r-none border-r-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex h-full items-center border border-x-0 border-border-strong bg-white px-2.5 py-1 text-xs tabular-nums text-foreground dark:bg-background">
            {currentTime || '—'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { stopPlayback(); stepByIndex(1); }}
            disabled={isDemo || sliderIndex >= dayTimestamps.length - 1}
            title={isDemo ? 'Full access required' : 'Next timestamp'}
            aria-label="Next timestamp"
            className="rounded-l-none border-l-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Button
            variant={isPlaying ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isDemo || dayTimestamps.length === 0 || sliderIndex >= dayTimestamps.length - 1}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause playback' : 'Play through day'}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Speed selector */}
        <div className="flex items-center rounded-lg border border-border-strong">
          {SPEED_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setPlaySpeed(i)}
              className={clsx(
                'px-2 py-1 text-xs font-medium transition-colors',
                i === 0 && 'rounded-l-[7px]',
                i === SPEED_OPTIONS.length - 1 && 'rounded-r-[7px]',
                playSpeed === i
                  ? 'bg-foreground text-background'
                  : 'bg-white text-foreground-secondary hover:text-foreground dark:bg-background'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Download + Fullscreen */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSlice('json')}
            disabled={isDemo || !selected}
            title={isDemo ? 'Full access required' : undefined}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSlice('csv')}
            disabled={isDemo || !selected}
            title={isDemo ? 'Full access required' : undefined}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            disabled={isDemo}
            title={isDemo ? 'Full access required' : undefined}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            icon={isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Timeline slider — scoped to selected day */}
      <div className="space-y-1">
        <Slider
          min={0}
          max={Math.max(dayTimestamps.length - 1, 0)}
          value={sliderIndex}
          onChange={(val) => { stopPlayback(); onSliderChange(val); }}
          disabled={isDemo || dayTimestamps.length === 0}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-tertiary">
          <span>{minTime}</span>
          <span className="font-medium text-foreground-secondary">{currentTime}</span>
          <span>{maxTime}</span>
        </div>
      </div>

      {/* Map and List Grid */}
      <div className={clsx(
        'grid gap-6',
        isFullscreen ? 'flex-1 lg:grid-cols-1' : 'lg:grid-cols-[1.5fr,1fr]'
      )}>
        {/* Map Panel */}
        <div className={clsx(
          'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-transparent',
          isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[520px]'
        )}>
          {loading && (
            <div className="pointer-events-none absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-2 rounded-lg bg-panel/90 px-3 py-1.5 text-xs text-foreground-secondary shadow-sm shadow-black/10 backdrop-blur">
                <Spinner size="sm" /> Loading…
              </span>
            </div>
          )}
            {!canRenderMap ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="text-sm text-foreground-secondary">WebGL is not available</div>
                <div className="text-xs text-foreground-tertiary">Heatmap view requires WebGL support</div>
              </div>
            ) : (
              <MapGL
                ref={handleMapRef}
                reuseMaps={false}
                mapLib={maplibregl}
                mapStyle={mapStyle}
                initialViewState={mapView}
                minZoom={12}
                maxZoom={18}
                attributionControl={false}
                interactiveLayerIds={['heat-circles']}
                onMouseMove={(evt) => {
                  const f = evt.features?.[0];
                  if (!f) return setHover(null);
                  const props = f.properties as {
                    stationId: string;
                    valueKw: number;
                    meters: number;
                  };
                  setHover({
                    stationId: props.stationId,
                    valueKw: props.valueKw,
                    meters: props.meters,
                    x: evt.point.x,
                    y: evt.point.y,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              >
                {features && (
                  <Source id="heat-stations" type="geojson" data={features}>
                    <Layer {...heatmapLayer} />
                    <Layer {...circleGlowLayer} />
                    <Layer {...circleLayer} />
                  </Source>
                )}
                <NavigationControl position="bottom-right" style={{ marginBottom: '52px' }} />
                {showLegend ? (
                  <div
                    className="pointer-events-auto absolute left-3 bottom-3 flex w-48 flex-col gap-2.5 rounded-lg bg-panel/90 p-3 text-foreground shadow-sm shadow-black/10 backdrop-blur"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setShowLegend(false)}
                      className="flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Info className="h-3.5 w-3.5" />
                      Heat Intensity
                    </button>
                    <p className="text-[10px] leading-tight text-foreground-secondary">Power consumption/generation</p>
                    <div className="flex flex-col gap-1">
                      <div
                        className="h-2.5 rounded-sm"
                        style={{
                          background: 'linear-gradient(to right, #00ff00, #ffff00, #ffa500, #ff0000, #b40000)',
                        }}
                      />
                      <div className="flex justify-between text-[10px] font-mono text-foreground-secondary">
                        <span>{thresholdMin} kW</span>
                        <span>{thresholdMax} kW</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-foreground-secondary">Min</span>
                        <input
                          type="number"
                          value={thresholdMin}
                          onChange={(e) => {
                            const v = Math.max(0, Math.min(Number(e.target.value), thresholdMax - 1));
                            setThresholdMin(v);
                          }}
                          min={0}
                          max={thresholdMax - 1}
                          step={10}
                          className="h-6 w-20 rounded border border-border bg-background px-1.5 text-right text-[11px] font-mono text-foreground outline-none focus:border-accent"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-medium text-foreground-secondary">Max</span>
                        <input
                          type="number"
                          value={thresholdMax}
                          onChange={(e) => {
                            const v = Math.max(thresholdMin + 1, Number(e.target.value));
                            setThresholdMax(v);
                          }}
                          min={thresholdMin + 1}
                          step={10}
                          className="h-6 w-20 rounded border border-border bg-background px-1.5 text-right text-[11px] font-mono text-foreground outline-none focus:border-accent"
                        />
                      </label>
                    </div>
                    <button
                      onClick={() => { setThresholdMin(0); setThresholdMax(800); }}
                      className="self-end text-[10px] font-medium text-foreground-tertiary transition-colors hover:text-foreground-secondary"
                    >
                      Reset defaults
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLegend(true)}
                    className="pointer-events-auto absolute left-3 bottom-3 flex h-[29px] w-[29px] items-center justify-center rounded-lg bg-panel/90 text-foreground-secondary shadow-sm shadow-black/10 backdrop-blur transition-all hover:bg-surface"
                    aria-label="Show legend"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="pointer-events-auto absolute bottom-3 right-[10px]">
                  <button
                    onClick={() => setShowAttribution(!showAttribution)}
                    className={clsx(
                      'flex h-[29px] items-center justify-center rounded-lg bg-panel/90 text-xs shadow-sm shadow-black/10 backdrop-blur transition-all',
                      showAttribution
                        ? 'w-auto gap-2 px-2.5 text-foreground'
                        : 'w-[29px] text-foreground-secondary hover:bg-surface'
                    )}
                    aria-label={showAttribution ? 'Hide attribution' : 'Show attribution'}
                  >
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    {showAttribution && (
                      <span>
                        © <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">OpenFreeMap</a>
                        {' '}·{' '}
                        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">OpenStreetMap</a>
                      </span>
                    )}
                  </button>
                </div>
                {/* ESA-IAI-KIT Watermark */}
                <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
                  <div className="text-lg font-semibold tracking-wide text-foreground/25 drop-shadow-sm select-none">
                    © ESA, IAI-KIT
                  </div>
                </div>
                {hover && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-lg bg-panel/90 p-3 text-xs text-foreground shadow-sm shadow-black/10 backdrop-blur"
                    style={{ left: hover.x + 12, top: hover.y + 12, fontFamily: 'var(--font-sans)' }}
                  >
                    <p className="text-sm font-semibold text-foreground">{hover.stationId}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-foreground-secondary">Power:</span>
                      <span className="font-mono font-semibold text-foreground">{hover.valueKw.toFixed(2)} kW</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-foreground-secondary">Meters:</span>
                      <span className="font-mono text-foreground-secondary">{hover.meters}</span>
                    </div>
                  </div>
                )}
              </MapGL>
            )}
        </div>

        {/* Station List Panel - hidden in fullscreen */}
        {!isFullscreen && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MapPinned className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground">Station Rankings</span>
            <span className="ml-auto text-xs text-foreground-tertiary">{list.length} stations</span>
          </div>

          {/* Search */}
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stations..."
                size="sm"
                className="pl-9"
              />
            </div>
          </div>

          <div className="max-h-[456px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-panel/95 text-xs uppercase tracking-wider text-foreground-secondary backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Station</th>
                  <th className="px-4 py-2.5 text-right font-medium">kW</th>
                  <th className="px-4 py-2.5 text-right font-medium">Meters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((f, idx) => (
                  <tr
                    key={f.properties.stationId}
                    className="text-foreground-secondary transition-colors hover:bg-surface"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs text-foreground-tertiary">
                          {idx + 1}
                        </span>
                        {f.properties.stationId}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                      {f.properties.valueKw.toFixed(3)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-foreground-secondary">
                      {f.properties.meters}
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td className="px-4 py-8 text-center text-foreground-tertiary" colSpan={3}>
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Spinner size="sm" /> Loading data…
                        </div>
                      ) : searchQuery ? (
                        'No stations match your search.'
                      ) : (
                        'No data available for this timestamp.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
