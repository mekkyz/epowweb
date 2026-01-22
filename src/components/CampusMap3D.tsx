'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import type { PickingInfo } from '@deck.gl/core';
import { SolidPolygonLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { OBJLoader } from '@loaders.gl/obj';
import { load } from '@loaders.gl/core';
import type { LineFeature } from '@/types/grid';

function lineToPolygon(coordinates: [number, number][], width: number): [number, number][][] {
  if (coordinates.length < 2) return [];

  const polygons: [number, number][][] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const metersPerDegree = 111320 * Math.cos((y1 * Math.PI) / 180);
    const halfWidth = width / metersPerDegree / 2;
    const px = (-dy / len) * halfWidth;
    const py = (dx / len) * halfWidth;


    polygons.push([
      [x1 + px, y1 + py],
      [x2 + px, y2 + py],
      [x2 - px, y2 - py],
      [x1 - px, y1 - py],
      [x1 + px, y1 + py],
    ]);
  }

  return polygons;
}
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { hexToRgb } from '@/lib/color';
import { lineFeatures, stationFeatures } from '@/config/grid';
import { MAP_STYLES, MAP_3D_VIEW } from '@/lib/constants';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import { Box, Maximize2, Minimize2, Info } from 'lucide-react';
import clsx from 'clsx';


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
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return false;

    // Light probe to catch truly broken contexts; ignore value thresholds
    try {
      gl.getParameter(gl.MAX_TEXTURE_SIZE);
    } catch {
      // if it fails, still allow maplibre/deck.gl to handle gracefully
    }

    return true;
  } catch {
    return false;
  }
}

export default function CampusMap3D() {
  const { resolvedTheme } = useTheme();
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const [deckError, setDeckError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [selected, setSelected] = useState<{ id?: string; url?: string; description?: string; group?: string } | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stationMesh, setStationMesh] = useState<any>(null);

  // Map style follows app theme - always use detailed style with 3D buildings
  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  // Load 3D station sign mesh
  useEffect(() => {
    load('/3d/StationSign.obj', OBJLoader)
      .then((mesh) => {
        setStationMesh(mesh);
      })
      .catch((err) => {
        console.warn('Failed to load station mesh, falling back to columns:', err);
      });
  }, []);

  useEffect(() => {
    // Delay WebGL check slightly to ensure browser is ready
    const timer = setTimeout(() => {
      const supported = checkWebGLSupport();
      setWebGLSupported(supported);
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

  // If context gets lost later, fail gracefully
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeckError(true);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('webglcontextlost', handler as EventListener, { passive: false });
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('webglcontextlost', handler as EventListener);
      }
    };
  }, []);

  const handleDeckError = useCallback(() => {
    setDeckError(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = document.getElementById('campus-map-3d-container');
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

  const onDeckClick = useCallback((info: PickingInfo) => {
    if (info.object && info.layer?.id === 'grid-stations-3d') {
      const props = info.object.properties;
      setSelected(props ?? null);
    } else {
      setSelected(null);
    }
  }, []);

  // Suppress missing sprite image warnings from OpenFreeMap tiles
  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (ref) {
      const map = ref.getMap();
      map.on('styleimagemissing', (e) => {
        const emptyImage = { width: 1, height: 1, data: new Uint8Array(4) };
        if (!map.hasImage(e.id)) {
          map.addImage(e.id, emptyImage);
        }
      });
    }
  }, []);

  const onMapLoad = useCallback((evt: { target: maplibregl.Map }) => {
    const map = evt.target;

    const setupMap = () => {
      // Add realistic lighting for 3D buildings
      map.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.4,
        position: [1.5, 180, 45] // azimuthal angle, polar angle, radial distance
      });

      // Find the building source - could be 'openmaptiles' or other OSM-based sources
      const sources = map.getStyle()?.sources || {};
      const buildingSource = Object.keys(sources).find(
        key => sources[key].type === 'vector' &&
          (key.includes('openmaptiles') || key.includes('osm') || sources[key].url?.includes('tiles.openfreemap'))
      );

      if (!buildingSource) {
        console.warn('No suitable building source found for 3D buildings');
        return;
      }

      // Add 3D buildings layer if it doesn't exist
      if (!map.getLayer('3d-buildings')) {
        const layers = map.getStyle()?.layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout
        )?.id;

        try {
          map.addLayer(
            {
              id: '3d-buildings',
              source: buildingSource,
              'source-layer': 'building',
              type: 'fill-extrusion',
              minzoom: 13,
              paint: {
                // Realistic building colors - tan/beige for most buildings, darker for taller ones
                'fill-extrusion-color': [
                  'case',
                  // Industrial/large buildings - darker gray
                  ['>', ['coalesce', ['get', 'render_height'], 10], 30],
                  '#7a7a7a',
                  // Medium buildings - warm gray/tan
                  ['>', ['coalesce', ['get', 'render_height'], 10], 15],
                  '#9a9590',
                  // Regular buildings - light beige/cream
                  '#b8b4ad'
                ],
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0,
                  13.5, ['coalesce', ['get', 'render_height'], 10]
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13, 0,
                  13.5, ['coalesce', ['get', 'render_min_height'], 0]
                ],
                'fill-extrusion-opacity': 0.92,
                // Vertical gradient for depth - darker at base, lighter at top
                'fill-extrusion-vertical-gradient': true
              }
            },
            labelLayerId
          );

          // Add building outlines/edges for more definition
          if (!map.getLayer('3d-buildings-outline')) {
            map.addLayer(
              {
                id: '3d-buildings-outline',
                source: buildingSource,
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 14,
                paint: {
                  'fill-extrusion-color': '#5a5652',
                  'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
                  'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                  'fill-extrusion-opacity': 0.15
                }
              },
              '3d-buildings'
            );
          }
        } catch (error) {
          console.warn('Failed to add 3D buildings layer:', error);
        }
      }

      // Store map reference for later use
      (window as unknown as { campusMap3D?: maplibregl.Map }).campusMap3D = map;
    };

    // Wait for style to fully load
    if (!map.isStyleLoaded()) {
      map.once('styledata', setupMap);
    } else {
      setupMap();
    }
  }, []);

  const layers = useMemo(
    () => [
      // 3D extruded lines matching legacy implementation
      showLines && new SolidPolygonLayer({
        id: 'grid-lines-3d',
        data: lineFeatures.flatMap((line: LineFeature) => {
          const coords = line.geometry.coordinates as [number, number][];
          const polygons = lineToPolygon(coords, 2); // 2 meters width
          return polygons.map(polygon => ({
            polygon,
            color: line.properties?.color,
          }));
        }),
        getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
        getFillColor: (d: { color?: string }) => [...hexToRgb(d.color), 255] as [number, number, number, number],
        extruded: true,
        getElevation: 4, // 4 meters height
        pickable: true,
        parameters: { depthTest: true },
      }),
      // Use 3D mesh for stations when loaded
      showStations && stationMesh && new SimpleMeshLayer({
        id: 'grid-stations-3d',
        data: stationFeatures,
        mesh: stationMesh,
        getPosition: (station) => [...station.geometry.coordinates, 0] as [number, number, number],
        getColor: (station) => [
          ...hexToRgb(station.properties?.color, [100, 212, 163]),
          255,
        ] as [number, number, number, number],
        getOrientation: [0, 0, 90], // Rotate to stand upright
        sizeScale: 8, // Larger scale to match legacy appearance
        pickable: true,
        parameters: { depthTest: true },
      }),
    ].filter(Boolean),
    [showLines, showStations, stationMesh],
  );

  // Show loading state while checking WebGL
  if (webGLSupported === null) {
    return (
      <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel to-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
            <Box className="h-8 w-8 animate-pulse text-foreground-tertiary" />
          </div>
          <p className="text-sm text-foreground-tertiary">Loading 3D view...</p>
        </div>
      </div>
    );
  }

  // Show fallback if WebGL is not supported or deck.gl failed
  if (!webGLSupported || deckError) {
    return (
      <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel to-surface">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
            <Box className="h-8 w-8 text-foreground-tertiary" />
          </div>
          <p className="text-sm font-medium text-foreground-secondary">3D View Unavailable</p>
          <p className="max-w-xs text-xs text-foreground-tertiary">
            WebGL is not available in this browser. Try using a different browser or enabling hardware acceleration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapErrorBoundary
      fallbackIcon="box"
      title="3D View Unavailable"
      description="Unable to render the 3D map. Try refreshing the page."
    >
      <div
        id="campus-map-3d-container"
        className={clsx(
          'relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-transparent shadow-2xl shadow-emerald-400/10',
          isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : 'h-[520px]'
        )}
      >
        <DeckGL
          controller
          initialViewState={MAP_3D_VIEW}
          getTooltip={({ object }) =>
            object
              ? {
                  text:
                    object?.properties?.id ??
                    object?.properties?.description ??
                    'Grid item',
                }
              : null
          }
          layers={layers}
          onError={handleDeckError}
          onClick={onDeckClick}
        >
          <Map
            ref={handleMapRef}
            reuseMaps
            mapLib={maplibregl}
            mapStyle={mapStyle}
            onLoad={onMapLoad}
            attributionControl={false}
          />
        </DeckGL>

        {/* Badge & Toggles */}
        <div className="pointer-events-auto absolute left-4 top-4 z-10">
          <div className="flex items-center gap-1 rounded-xl bg-white/90 p-1 shadow-sm shadow-black/10 backdrop-blur dark:bg-slate-800/90 dark:shadow-black/30">
            <span className="rounded-xl bg-foreground px-3 py-1 text-sm font-semibold text-background shadow-sm">
              3D View
            </span>
            <button
              onClick={() => setShowLines(!showLines)}
              className={`rounded-xl px-3 py-1 text-sm font-medium transition-colors ${
                showLines 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowStations(!showStations)}
              className={`rounded-xl px-3 py-1 text-sm font-medium transition-colors ${
                showStations 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Stations
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="pointer-events-auto absolute bottom-4 left-4 z-10">
          <div className="rounded-xl border border-border bg-background/95 p-3 shadow-lg shadow-black/10 backdrop-blur dark:shadow-black/30">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
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
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="pointer-events-auto absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm shadow-black/10 backdrop-blur transition-all hover:bg-white hover:shadow-md dark:bg-slate-800/90 dark:text-slate-200 dark:shadow-black/30 dark:hover:bg-slate-800"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Collapsible Attribution */}
        <div className="pointer-events-auto absolute bottom-4 right-[10px] z-10">
          <button
            onClick={() => setShowAttribution(!showAttribution)}
            className={clsx(
              'flex h-[29px] items-center justify-center rounded-lg text-xs shadow backdrop-blur transition-all',
              showAttribution
                ? 'w-auto gap-2 px-2.5 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                : 'w-[29px] bg-white text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
            aria-label={showAttribution ? 'Hide attribution' : 'Show attribution'}
          >
            <Info className="h-3.5 w-3.5 flex-shrink-0" />
            {showAttribution && (
              <span>
                © <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">OpenFreeMap</a>
                {' '}·{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">OpenStreetMap</a>
              </span>
            )}
          </button>
        </div>

        {/* Station info panel */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
          <div className="mx-auto w-fit rounded-2xl bg-panel/90 p-4 text-sm text-foreground-secondary shadow-lg shadow-black/20 dark:shadow-black/40 backdrop-blur">
            {selected ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-foreground-secondary">
                    Station
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {selected.id}
                  </p>
                  <p className="text-foreground-secondary">
                    {selected.description || 'Power node'}
                  </p>
                  {selected.group && (
                    <p className="text-foreground-secondary">{selected.group}</p>
                  )}
                </div>
                {selected.url && (
                  <a
                    href={selected.url}
                    className="pointer-events-auto inline-flex min-w-[150px] items-center justify-center rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-surface"
                  >
                    Open visualization
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p>
                  Click any station to see details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MapErrorBoundary>
  );
}
