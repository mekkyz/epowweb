'use client';

import { useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, PathLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { hexToRgb } from '@/lib/color';
import { lineFeatures, stationFeatures } from '@/data/grid';

const viewState = {
  longitude: 8.4346,
  latitude: 49.099,
  zoom: 15.7,
  pitch: 62,
  bearing: -18,
};

const mapStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export default function CampusMap3D() {
  const layers = useMemo(
    () => [
      new PathLayer({
        id: 'grid-lines-3d',
        data: lineFeatures,
        getPath: (line) =>
          line.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lng, lat] as [number, number],
          ),
        getColor: (line) => [...hexToRgb(line.properties?.color), 200],
        widthScale: 6,
        widthMinPixels: 3,
        opacity: 0.85,
        pickable: true,
        parameters: { depthTest: true },
      }),
      new ColumnLayer({
        id: 'grid-stations-3d',
        data: stationFeatures,
        diskResolution: 24,
        radius: 18,
        extruded: true,
        getPosition: (station) => station.geometry.coordinates,
        getElevation: (station) => 60 + (station.properties?.size ?? 1) * 12,
        getFillColor: (station) => [
          ...hexToRgb(station.properties?.color, [100, 212, 163]),
          220,
        ],
        getLineColor: [12, 16, 32, 180],
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1.5,
        pickable: true,
      }),
    ],
    [],
  );

  return (
    <div className="relative h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 shadow-2xl shadow-emerald-400/10">
      <DeckGL
        controller
        initialViewState={viewState}
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
      >
        <Map reuseMaps mapLib={maplibregl} mapStyle={mapStyle} />
      </DeckGL>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
      <div className="absolute left-4 top-4 z-10">
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-black/30 backdrop-blur">
          3D power overlay
        </div>
      </div>
    </div>
  );
}
