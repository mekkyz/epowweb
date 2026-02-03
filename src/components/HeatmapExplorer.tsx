'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { Layer, LayerProps, NavigationControl, Source } from 'react-map-gl/maplibre';
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
} from 'lucide-react';
import { Button, Spinner, Input, MapSkeleton, useToast } from '@/components/ui';
import { MAP_STYLES } from '@/lib/constants';
import clsx from 'clsx';

type FeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { stationId: string; valueKw: number; meters: number };
  }[];
};

export default function HeatmapExplorer() {
  const { resolvedTheme } = useTheme();
  const { success, error: showError } = useToast();
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [inputTs, setInputTs] = useState<string>('');
  const [features, setFeatures] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
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
  const [canRenderMap] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = maplibregl as any;
      const supported = lib.supported?.({ failIfMajorPerformanceCaveat: false }) ?? true;
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return supported && !!gl;
    } catch {
      return false;
    }
  });

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/heatmap/available');
        if (!res.ok) throw new Error(`Failed to load timestamps (${res.status})`);
        const body = await res.json();
        if (!active) return;
        const list = body.data?.timestamps ?? body.timestamps ?? [];
        setTimestamps(list);
        // start from the middle of available timestamps
        const midIndex = Math.floor(list.length / 2);
        const middle = list[midIndex] ?? list[0] ?? null;
        setSelected(middle);
        setInputTs(middle ?? '');
      } catch (err) {
        console.error('Failed to load timestamps:', err);
        showError('Failed to load available timestamps');
      } finally {
        if (active) {
          setInitialLoad(false);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [showError]);

  // Keep input in sync with selected timestamp
  useEffect(() => {
    if (selected) {
      setInputTs(selected);
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setFeatures(null);
      return;
    }
    let active = true;

    const fetchSlice = async (ts: string) => {
      const res = await fetch(`/api/heatmap/geo?timestamp=${encodeURIComponent(ts)}`);
      if (!res.ok) throw new Error(`Failed to load slice (${res.status})`);
      const body = await res.json();
      const payload = body.data ?? body;
      const fc = payload.featureCollection ?? null;
      const statsPayload =
        payload.stats ??
        (fc ? { stations: fc.features?.length ?? 0, meters: payload.points?.length ?? 0 } : null);
      return { fc, stats: statsPayload };
    };

    const load = async () => {
      setLoading(true);
      try {
        // If the chosen timestamp isn't in the list, snap to the latest available
        const idx = timestamps.indexOf(selected);
        if (idx === -1 && timestamps.length > 0) {
          const latest = timestamps[timestamps.length - 1];
          setSelected(latest);
          setInputTs(latest);
          return;
        }

        let currentTs = selected;
        let result = await fetchSlice(currentTs);

        // If the chosen slice has no data, try a few earlier timestamps
        let attempts = 0;
        while (active && result.fc?.features?.length === 0 && attempts < 5) {
          const idx = timestamps.indexOf(currentTs);
          const prev = idx > 0 ? timestamps[idx - 1] : null;
          if (!prev) break;
          currentTs = prev;
          result = await fetchSlice(currentTs);
          attempts += 1;
        }

        if (!active) return;

        if (currentTs !== selected) {
          // Trigger re-load with the nearest timestamp that has data
          setSelected(currentTs);
          setInputTs(currentTs);
          return;
        }

        setFeatures(result.fc ?? { type: 'FeatureCollection', features: [] });
      } catch (err) {
        console.error('Failed to load heatmap data:', err);
        showError('Failed to load heatmap data');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [selected, showError, timestamps]);

  // Ensure selected/input stay in sync if state was cleared
  useEffect(() => {
    if (!selected && timestamps.length > 0) {
      const last = timestamps[timestamps.length - 1];
      setSelected(last);
      setInputTs(last);
    }
  }, [selected, timestamps]);

  // Heatmap layer - professional vibrant green-yellow-red style
  const heatmapLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-layer',
      type: 'heatmap',
      maxzoom: 17,
      paint: {
        // Weight by power consumption - exponential for sharp hotspots
        'heatmap-weight': [
          'interpolate',
          ['exponential', 2],
          ['get', 'valueKw'],
          0, 0.1,
          50, 0.3,
          150, 0.5,
          300, 0.75,
          500, 0.9,
          800, 1,
        ],
        // Higher intensity for more engaging colors
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 2.2,
          14, 2.8,
          16, 3.5,
        ],
        // Vibrant green-yellow-orange-red - more saturated
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
        // Larger radius for smooth coverage
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 25,
          14, 40,
          16, 60,
          18, 80,
        ],
        // Keep heatmap visible at all zoom levels
        'heatmap-opacity': 0.85,
      },
    }),
    [],
  );

  // Glow layer behind circles for eye-catching effect
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
          0, '#00ff00',
          150, '#ffff00',
          300, '#ff9600',
          500, '#ff1e00',
        ],
        'circle-opacity': 0.4,
        'circle-blur': 1,
      },
    }),
    [],
  );

  // Circle layer for individual stations - crisp markers
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
        // Same green-yellow-red color scheme
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'valueKw'],
          0, '#00ff00',
          50, '#80ff00',
          100, '#c8ff00',
          150, '#ffff00',
          200, '#ffc800',
          300, '#ff9600',
          400, '#ff5000',
          500, '#ff1e00',
          700, '#c80000',
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
    [mapStyleType],
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

  const stepTimestamp = (direction: 1 | -1) => {
    if (!selected) return;
    const idx = timestamps.indexOf(selected);
    const next = timestamps[idx + direction];
    if (next) {
      setSelected(next);
      setInputTs(next);
    }
  };

  const applyInput = () => {
    if (!inputTs) return;
    const match = timestamps.find((t) => t.startsWith(inputTs));
    if (match) {
      setSelected(match);
      setInputTs(match);
    }
  };

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

  return (
    <div
      id="heatmap-explorer-container"
      className={clsx(
        'space-y-6',
        isFullscreen && 'fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background p-4'
      )}
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground-secondary">
            Timestamp
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepTimestamp(-1)}
              disabled={!selected}
              aria-label="Previous slice"
              className="rounded-l-lg rounded-r-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              list="heatmap-ts"
              value={inputTs}
              onChange={(e) => setInputTs(e.target.value)}
              onBlur={applyInput}
              placeholder="YYYY-MM-DD HH:mm:ss"
              size="sm"
              className="min-w-[210px] rounded-none border-x-0"
            />
            <datalist id="heatmap-ts">
              {timestamps.map((ts) => (
                <option key={ts} value={ts} />
              ))}
            </datalist>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stepTimestamp(1)}
              disabled={!selected}
              aria-label="Next slice"
              className="rounded-l-none rounded-r-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSlice('json')}
            disabled={!selected}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSlice('csv')}
            disabled={!selected}
            icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          >
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            icon={isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Map and List Grid */}
      <div className={clsx(
        'grid gap-6',
        isFullscreen ? 'flex-1 lg:grid-cols-1' : 'lg:grid-cols-[1.5fr,1fr]'
      )}>
        {/* Map Panel */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">Map View</span>
            <div className="flex items-center gap-3">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-xs text-foreground-secondary">
                  <Spinner size="sm" /> Loading…
                </span>
              ) : (
                <span className="text-xs text-foreground-secondary">Heat intensity by power consumption</span>
              )}
            </div>
          </div>
          <div className={clsx(isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[520px]')}>
            {initialLoad ? (
              <MapSkeleton />
            ) : canRenderMap ? (
              <Map
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
                <button
                  onClick={() => setShowLegend(!showLegend)}
                  className={clsx(
                    'pointer-events-auto absolute left-3 bottom-3 flex items-center justify-center rounded-lg bg-panel text-foreground shadow backdrop-blur-sm transition-all',
                    showLegend
                      ? 'h-auto w-auto flex-col items-start gap-2 p-3'
                      : 'h-[29px] w-[29px] text-foreground-secondary hover:bg-surface'
                  )}
                  aria-label={showLegend ? 'Hide legend' : 'Show legend'}
                >
                  {showLegend ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Info className="h-3.5 w-3.5" />
                        Power Density
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-foreground-secondary">
                        <div
                          className="h-3 w-24 rounded-sm"
                          style={{
                            background: 'linear-gradient(to right, #4169e1, #00ffff, #00ff00, #ffff00, #ffa500, #ff0000)',
                          }}
                        />
                        <div className="flex justify-between text-[10px] font-mono">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Info className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="pointer-events-auto absolute bottom-3 right-[10px]">
                  <button
                    onClick={() => setShowAttribution(!showAttribution)}
                    className={clsx(
                      'flex h-[29px] items-center justify-center rounded-lg bg-panel text-xs shadow backdrop-blur transition-all',
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
                {hover && (
                  <div
                    className="pointer-events-none absolute z-10 rounded-lg border border-border bg-panel/95 px-3 py-2.5 text-xs text-foreground shadow-xl backdrop-blur-sm"
                    style={{ left: hover.x + 12, top: hover.y + 12 }}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground-tertiary">Station</div>
                    <div className="font-semibold text-emerald-400">{hover.stationId}</div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-foreground-tertiary">Power:</span>
                      <span className="font-mono font-semibold text-foreground">{hover.valueKw.toFixed(2)} kW</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[10px] uppercase tracking-wider text-foreground-tertiary">Meters:</span>
                      <span className="font-mono text-foreground-secondary">{hover.meters}</span>
                    </div>
                  </div>
                )}
              </Map>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <div className="text-sm text-foreground-secondary">WebGL is not available</div>
                <div className="text-xs text-foreground-tertiary">Heatmap view requires WebGL support</div>
              </div>
            )}
          </div>
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
