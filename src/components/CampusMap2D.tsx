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
import { useTheme } from 'next-themes';
import { gridCollections } from '@/config/grid';
import { MAP_STYLES, DEFAULT_MAP_VIEW, MAP_ZOOM_LIMITS, COLORS } from '@/lib/constants';
import { Map as MapIcon } from 'lucide-react';
import type { Feature, Point } from 'geojson';
import MapShell from './map/MapShell';
import { useAltDragRotation, useSuppressMissingImages } from './map/useMapControls';

const lineLayer: LayerProps = {
  id: 'lines',
  type: 'line',
  paint: {
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 15, 3, 18, 6],
    'line-color': ['coalesce', ['get', 'color'], COLORS.grid.line],
    'line-opacity': 1,
  },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
};

const lineOutlineLayer: LayerProps = {
  id: 'lines-outline',
  type: 'line',
  paint: {
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 15, 6, 18, 12],
    'line-color': 'rgba(0, 0, 0, 0.4)',
    'line-opacity': 1,
  },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
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
  const [selected, setSelected] = useState<Feature<Point> | null>(null);
  const [hover, setHover] = useState<{
    id: string;
    description: string;
    group: string;
    x: number;
    y: number;
  } | null>(null);

  const setupAltDrag = useAltDragRotation();
  const suppressMissing = useSuppressMissingImages();

  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (!ref) return;
    suppressMissing(ref);
    setupAltDrag(ref);
  }, [suppressMissing, setupAltDrag]);

  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.find((f) => f.layer.id === 'stations') as
      | Feature<Point>
      | undefined;
    setSelected(feature ?? null);
  }, []);

  const selectedProps = selected?.properties as
    | { id?: string; url?: string; description?: string; group?: string }
    | undefined;

  return (
    <MapShell
      containerId="campus-map-2d-container"
      placeholderIcon={MapIcon}
      loadingLabel="Loading 2D map..."
      errorTitle="2D Map Unavailable"
      errorDescription="Unable to render the map. Try refreshing the page."
      selectedStation={selectedProps ?? null}
    >
      {({ showLines, showStations, onError }) => (
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
          onError={onError}
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
      )}
    </MapShell>
  );
}
