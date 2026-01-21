'use client';

import { useCallback, useMemo, useState } from 'react';
import Map, {
  Layer,
  LayerProps,
  MapLayerMouseEvent,
  NavigationControl,
  Source,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import clsx from 'clsx';
import { gridCollections } from '@/config/grid';
import { MAP_STYLES, DEFAULT_MAP_VIEW, MAP_ZOOM_LIMITS, COLORS } from '@/lib/constants';
import { ToggleGroup } from '@/components/ui';
import type { Feature, Point } from 'geojson';

const lineLayer: LayerProps = {
  id: 'lines',
  type: 'line',
  paint: {
    'line-width': 3,
    'line-color': ['coalesce', ['get', 'color'], COLORS.grid.line],
    'line-opacity': 0.9,
  },
};

const stationsLayer: LayerProps = {
  id: 'stations',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      12,
      6,
      16,
      12,
      18,
      16,
    ],
    'circle-color': ['coalesce', ['get', 'color'], COLORS.grid.station],
    'circle-stroke-width': 1.6,
    'circle-stroke-color': COLORS.grid.stroke,
  },
};

export default function CampusMap2D() {
  const [style, setStyle] = useState<'light' | 'dark'>('dark');
  const [showLines, setShowLines] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [selected, setSelected] = useState<Feature<Point> | null>(null);
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
  
  const isLight = style === 'light';
  const chipGroup = 'flex items-center gap-1 rounded-xl bg-white/80 p-1 shadow-sm shadow-black/20 backdrop-blur';

  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.find((f) => f.layer.id === 'stations') as
      | Feature<Point>
      | undefined;
    setSelected(feature ?? null);
  }, []);

  const selectedProps = selected?.properties as
    | { id?: string; url?: string; description?: string; group?: string }
    | undefined;

  const mapStyle = useMemo(() => MAP_STYLES[style], [style]);

  const mapStyleOptions = [
    { value: 'dark' as const, label: 'Dark map' },
    { value: 'light' as const, label: 'Light map' },
  ];

  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0">
      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <div className={chipGroup}>
          <ToggleGroup
            options={mapStyleOptions}
            value={style}
            onChange={setStyle}
            variant={isLight ? 'light' : 'dark'}
          />
        </div>
        <div className={chipGroup}>
          <ToggleChip
            active={showLines}
            label="Grid"
            onChange={setShowLines}
            isLight={isLight}
          />
          <ToggleChip
            active={showStations}
            label="Stations"
            onChange={setShowStations}
            isLight={isLight}
          />
        </div>
      </div>

      {canRenderMap ? (
        <Map
          reuseMaps={false}
          mapLib={maplibregl}
          mapStyle={mapStyle}
          initialViewState={DEFAULT_MAP_VIEW}
          minZoom={MAP_ZOOM_LIMITS.min}
          maxZoom={MAP_ZOOM_LIMITS.max}
          interactiveLayerIds={['stations']}
          onClick={onMapClick}
          style={{ width: '100%', height: '100%' }}
        >
          {showLines && (
            <Source id="grid-lines" type="geojson" data={gridCollections.lines}>
              <Layer {...lineLayer} />
            </Source>
          )}
          {showStations && (
            <Source id="grid-stations" type="geojson" data={gridCollections.stations}>
              <Layer {...stationsLayer} />
            </Source>
          )}
          <NavigationControl position="bottom-right" visualizePitch />
        </Map>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-white/70">
          WebGL not available; map is disabled.
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
        <div className="mx-auto max-w-xl rounded-2xl bg-black/65 p-4 text-sm text-white/80 shadow-lg shadow-black/40 backdrop-blur">
          {selectedProps ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-white/60">
                  Station
                </p>
                <p className="text-lg font-semibold text-white">
                  {selectedProps.id}
                </p>
                <p className="text-white/70">
                  {selectedProps.description || 'Power node'}
                </p>
                {selectedProps.group && (
                  <p className="text-white/60">{selectedProps.group}</p>
                )}
              </div>
              {selectedProps.url && (
                <a
                  href={selectedProps.url}
                  className="pointer-events-auto inline-flex min-w-[150px] items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold shadow-sm hover:bg-slate-100"
                  style={{ color: '#0f172a' }}
                >
                  Open visualization
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.25)]" />
              <p>
                Click any station to preview details. Use the pills above to
                toggle layers and swap map styles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  label,
  onChange,
  isLight,
}: {
  active: boolean;
  label: string;
  onChange: (next: boolean) => void;
  isLight: boolean;
}) {
  return (
    <button
      className={clsx(
        'rounded-xl px-3 py-1 text-sm font-semibold transition',
        active
          ? isLight
            ? 'bg-black text-white shadow-lg shadow-black/30'
            : 'bg-white/15 text-white shadow-inner shadow-white/20'
          : isLight
            ? 'text-slate-900/80 hover:text-slate-900'
            : 'text-white/70 hover:text-white',
      )}
      onClick={() => onChange(!active)}
    >
      {label}
    </button>
  );
}
