'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Map, {
  Layer,
  LayerProps,
  MapLayerMouseEvent,
  NavigationControl,
  Source,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { gridCollections } from '@/config/grid';
import { MAP_STYLES, DEFAULT_MAP_VIEW, MAP_ZOOM_LIMITS, COLORS } from '@/lib/constants';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { Map as MapIcon, Maximize2, Minimize2, Info } from 'lucide-react';
import type { Feature, Point } from 'geojson';

const GRID_LEGEND = [
  { color: '#aaff00', label: 'Ring 1 – Südring' },
  { color: '#00aaff', label: 'Ring 2 – Ring B' },
  { color: '#ffff00', label: 'Ring 3 – Ring A' },
  { color: '#ff5500', label: 'Ring 4 – Nordring' },
  { color: '#ff0000', label: 'Ring 5 – WAK' },
  { color: '#ff0099', label: 'Ring 6 – Kopfstationen' },
  { color: '#aaaaff', label: 'Ring 7 – ITU' },
] as const;

function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (!maxTextureSize || maxTextureSize < 2048) return false;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib = maplibregl as any;
    if (lib.supported && !lib.supported({ failIfMajorPerformanceCaveat: false })) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const lineLayer: LayerProps = {
  id: 'lines',
  type: 'line',
  paint: {
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 3, 18, 6],
    'line-color': ['coalesce', ['get', 'color'], COLORS.grid.line],
    'line-opacity': 1,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

const lineOutlineLayer: LayerProps = {
  id: 'lines-outline',
  type: 'line',
  paint: {
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 15, 6, 18, 12],
    'line-color': 'rgba(0, 0, 0, 0.4)',
    'line-opacity': 1,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

const stationsLayer: LayerProps = {
  id: 'stations',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 15, 10, 18, 16],
    'circle-color': ['coalesce', ['get', 'color'], COLORS.grid.line],
    'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 2.5, 18, 4],
    'circle-stroke-color': 'rgba(0, 0, 0, 0.4)',
  },
};

const stationLabelsLayer: LayerProps = {
  id: 'station-labels',
  type: 'symbol',
  minzoom: 13,
  layout: {
    'text-field': ['get', 'id'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 13, 18, 16],
    'text-anchor': 'top',
    'text-offset': [0, 0.8],
    'text-allow-overlap': false,
    'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
  },
  paint: {
    'text-color': '#1a1a1a',
    'text-halo-color': '#ffffff',
    'text-halo-width': 2,
  },
};

export default function CampusMap2D() {
  const { resolvedTheme } = useTheme();
  const [showLines, setShowLines] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [selected, setSelected] = useState<Feature<Point> | null>(null);
  const [canRenderMap, setCanRenderMap] = useState<boolean | null>(null);
  const [mapError, setMapError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [hover, setHover] = useState<{
    id: string;
    description: string;
    group: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const supported = checkWebGLSupport();
      setCanRenderMap(supported);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const handleStyleImageMissing = useCallback((map: maplibregl.Map) => {
    map.on('styleimagemissing', (e) => {
      const emptyImage = { width: 1, height: 1, data: new Uint8Array(4) };
      if (!map.hasImage(e.id)) {
        map.addImage(e.id, emptyImage);
      }
    });
  }, []);

  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (ref) {
      const map = ref.getMap();
      handleStyleImageMissing(map);

      // ALT+drag rotation support (same as 3D view)
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
    }
  }, [handleStyleImageMissing]);

  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const chipGroup = 'flex items-center gap-1 rounded-lg bg-panel/90 p-1 shadow-sm shadow-black/10 backdrop-blur';

  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.find((f) => f.layer.id === 'stations') as
      | Feature<Point>
      | undefined;
    setSelected(feature ?? null);
  }, []);

  const selectedProps = selected?.properties as
    | { id?: string; url?: string; description?: string; group?: string }
    | undefined;

  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  const toggleFullscreen = useCallback(async () => {
    const container = document.getElementById('campus-map-2d-container');
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

  return (
    <div
      id="campus-map-2d-container"
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-transparent',
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : 'h-[520px]'
      )}
    >
      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-wrap gap-2">
        <div className={chipGroup}>
          <ToggleChip
            active={showLines}
            label="Grid"
            onChange={setShowLines}
          />
          <ToggleChip
            active={showStations}
            label="Stations"
            onChange={setShowStations}
          />
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-4 left-4 z-10">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className={clsx(
            'flex items-center justify-center rounded-lg bg-panel/90 text-foreground shadow-sm shadow-black/10 backdrop-blur transition-all',
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
                20 kV Kabelringe
              </div>
              <div className="flex flex-col gap-1.5">
                {GRID_LEGEND.map((item) => (
                  <div key={item.color} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full ring-1 ring-black/20"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-foreground-secondary">{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Info className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <button
        onClick={toggleFullscreen}
        className="pointer-events-auto absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-panel/90 text-foreground shadow-sm shadow-black/10 backdrop-blur transition-all hover:bg-panel hover:shadow-md"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>

      <div className="pointer-events-auto absolute bottom-4 right-[10px] z-10">
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
        <div className="text-md font-semibold tracking-wide text-foreground/25 drop-shadow-sm select-none">
          © ESA, IAI-KIT
        </div>
      </div>

      {canRenderMap === null ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
            <MapIcon className="h-8 w-8 animate-pulse text-foreground-tertiary" />
          </div>
          <p className="text-sm text-foreground-tertiary">Loading map...</p>
        </div>
      ) : canRenderMap && !mapError ? (
        <MapErrorBoundary
          fallbackIcon="map"
          title="2D Map Unavailable"
          description="Unable to render the map. Try refreshing the page."
        >
          <Map
            ref={handleMapRef}
            reuseMaps={false}
            mapLib={maplibregl}
            mapStyle={mapStyle}
            initialViewState={DEFAULT_MAP_VIEW}
            minZoom={MAP_ZOOM_LIMITS.min}
            maxZoom={MAP_ZOOM_LIMITS.max}
            interactiveLayerIds={['stations']}
            onClick={onMapClick}
            onMouseMove={(evt) => {
              const f = evt.features?.[0];
              if (!f) return setHover(null);
              const props = f.properties as { id?: string; description?: string; group?: string };
              setHover({
                id: props.id ?? '',
                description: props.description ?? '',
                group: props.group ?? '',
                x: evt.point.x,
                y: evt.point.y,
              });
            }}
            onMouseLeave={() => setHover(null)}
            onError={handleMapError}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
            canvasContextAttributes={{ contextType: 'webgl2' }}
          >
            {showLines && (
              <Source id="grid-lines-outline" type="geojson" data={gridCollections.lines}>
                <Layer {...lineOutlineLayer} />
              </Source>
            )}
            {showLines && (
              <Source id="grid-lines" type="geojson" data={gridCollections.lines}>
                <Layer {...lineLayer} />
              </Source>
            )}
            {showStations && (
              <Source id="grid-stations" type="geojson" data={gridCollections.stations}>
                <Layer {...stationsLayer} />
                <Layer {...stationLabelsLayer} />
              </Source>
            )}
            <NavigationControl position="bottom-right" visualizePitch style={{ marginBottom: '52px' }} />
            {hover && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg bg-panel/90 p-3 text-xs text-foreground shadow-sm shadow-black/10 backdrop-blur"
                style={{ left: hover.x + 12, top: hover.y + 12, fontFamily: 'var(--font-sans)' }}
              >
                <p className="text-sm font-semibold text-foreground">{hover.id}</p>
                {hover.description && (
                  <p className="text-foreground-secondary">{hover.description}</p>
                )}
                {hover.group && (
                  <p className="text-foreground-secondary">{hover.group}</p>
                )}
              </div>
            )}
          </Map>
        </MapErrorBoundary>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
            <MapIcon className="h-8 w-8 text-foreground-tertiary" />
          </div>
          <p className="text-sm font-medium text-foreground-secondary">2D Map Unavailable</p>
          <p className="max-w-xs text-xs text-foreground-tertiary">
            WebGL is not available in this browser.
          </p>
        </div>
      )}

      {selectedProps && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
          <div className="mx-auto w-fit rounded-lg bg-panel/90 p-4 text-sm text-foreground-secondary shadow-sm shadow-black/10 backdrop-blur">
            <div className="flex items-stretch gap-4">
              {/* Left side - Info */}
              <div className="flex flex-col justify-center">
                <p className="text-lg font-semibold text-foreground">
                  {selectedProps.id}
                </p>
                <p className="text-foreground-secondary">
                  {selectedProps.description || 'Power node'}
                </p>
                {selectedProps.group && (
                  <p className="text-foreground-secondary">{selectedProps.group}</p>
                )}
              </div>

              {/* Divider */}
              <div className="w-px bg-border" />

              {/* Right side - Visualization & Buttons */}
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  Visualization
                </span>
                {selectedProps.url && (
                  <div className="pointer-events-auto flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const el = document.getElementById('live-data');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                        window.dispatchEvent(new CustomEvent('preview-visualization', { detail: selectedProps.url }));
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm shadow-black/10 hover:bg-surface"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => window.open(selectedProps.url, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm shadow-black/10 hover:bg-surface"
                    >
                      Open in Tab
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleChip({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      className={clsx(
        'rounded-xl px-3 py-1 text-sm font-semibold transition',
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'text-foreground-secondary hover:text-foreground',
      )}
      onClick={() => onChange(!active)}
    >
      {label}
    </button>
  );
}
