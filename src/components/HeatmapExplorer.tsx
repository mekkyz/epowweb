'use client';

import { useEffect, useMemo, useState } from 'react';
import Map, { Layer, LayerProps, NavigationControl, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { MapPinned, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Badge, Spinner, Input } from '@/components/ui';
import { MAP_STYLES, COLORS } from '@/lib/constants';

type FeatureCollection = {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: { stationId: string; valueKw: number; meters: number };
  }[];
};

export default function HeatmapExplorer() {
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [inputTs, setInputTs] = useState<string>('');
  const [features, setFeatures] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ stations: number; meters: number } | null>(null);
  const [hover, setHover] = useState<{
    stationId: string;
    valueKw: number;
    meters: number;
    x: number;
    y: number;
  } | null>(null);
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

  useEffect(() => {
    let active = true;
    const load = async () => {
      const res = await fetch('/api/heatmap/available');
      const body = await res.json();
      if (!active) return;
      const list = body.timestamps ?? [];
      setTimestamps(list);
      const last = list[list.length - 1] ?? null;
      setSelected(last);
      setInputTs(last ?? '');
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/heatmap/geo?timestamp=${encodeURIComponent(selected)}`);
      const body = await res.json();
      if (!active) return;
      setFeatures(body.featureCollection ?? null);
      setStats(body.stats ?? null);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [selected]);

  const circleLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-circles',
      type: 'circle',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['get', 'valueKw'],
          0,
          4,
          50,
          10,
          150,
          18,
          500,
          26,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'valueKw'],
          0,
          '#1d4ed8',
          50,
          '#22c55e',
          120,
          '#f59e0b',
          250,
          '#ef4444',
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1.2,
        'circle-stroke-color': '#0b1020',
      },
    }),
    [],
  );

  const list = useMemo(() => {
    const feats = features?.features ?? [];
    return [...feats].sort((a, b) => b.properties.valueKw - a.properties.valueKw);
  }, [features]);

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

  const downloadSlice = async (format: 'json' | 'csv') => {
    if (!selected) return;
    const res = await fetch(`/api/heatmap?timestamp=${encodeURIComponent(selected)}`);
    if (!res.ok) return;
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">Heatmap</p>
          <p className="text-white/70">Data source: ESA Data</p>
        </div>
        <Badge variant="secondary" icon={<Radio className="h-4 w-4 text-emerald-300" />}>
          Stations: {stats?.stations ?? 0} · Meters: {stats?.meters ?? 0}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-white/70">Timestamp</label>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => stepTimestamp(-1)}
            disabled={!selected}
            aria-label="Previous slice"
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
            className="min-w-[210px]"
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
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => downloadSlice('json')}>
            Download JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadSlice('csv')}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-sm text-white/70">
            <span>Heatmap view</span>
            {loading ? (
              <span className="inline-flex items-center gap-2 text-xs text-white/60">
                <Spinner size="sm" /> Loading…
              </span>
            ) : (
              <span className="text-xs text-white/60">Stations scaled by kW</span>
            )}
          </div>
          <div className="h-[520px]">
            {canRenderMap ? (
              <Map
                reuseMaps={false}
                mapLib={maplibregl}
                mapStyle={MAP_STYLES.dark}
                initialViewState={mapView}
                minZoom={12}
                maxZoom={18}
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
                    <Layer {...circleLayer} />
                  </Source>
                )}
                <NavigationControl position="bottom-right" />
                <div className="pointer-events-none absolute left-3 bottom-3 rounded-md border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#1d4ed8]" /> Low
                    <span className="inline-block h-3 w-3 rounded-full bg-[#22c55e]" /> Med
                    <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" /> High
                    <span className="inline-block h-3 w-3 rounded-full bg-[#ef4444]" /> Peak
                  </div>
                </div>
                {hover && (
                  <div
                    className="pointer-events-none absolute rounded-md border border-white/10 bg-black/80 px-3 py-2 text-xs text-white shadow-lg"
                    style={{ left: hover.x + 12, top: hover.y + 12 }}
                  >
                    <div className="font-semibold text-white">{hover.stationId}</div>
                    <div className="text-white/70">{hover.valueKw.toFixed(3)} kW</div>
                    <div className="text-white/60">{hover.meters} meters</div>
                  </div>
                )}
              </Map>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/70">
                WebGL is not available in this browser; heatmap map view is disabled.
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3 text-sm text-white/70">
            <MapPinned className="h-4 w-4 text-emerald-300" />
            Station list (kW)
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-sm text-white/80">
              <thead className="sticky top-0 bg-black/60 text-xs uppercase tracking-[0.15em] text-white/60">
                <tr>
                  <th className="px-3 py-2 text-left">Station</th>
                  <th className="px-3 py-2 text-right">kW</th>
                  <th className="px-3 py-2 text-right">Meters</th>
                </tr>
              </thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.properties.stationId} className="hover:bg-white/5">
                    <td className="px-3 py-2">{f.properties.stationId}</td>
                    <td className="px-3 py-2 text-right">{f.properties.valueKw.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right">{f.properties.meters}</td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td className="px-3 py-3 text-center text-white/60" colSpan={3}>
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Spinner size="sm" /> Loading…
                        </div>
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
      </div>
    </div>
  );
}
