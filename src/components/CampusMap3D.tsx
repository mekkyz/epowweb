'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import type { PickingInfo } from '@deck.gl/core';
import { SolidPolygonLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { OBJLoader } from '@loaders.gl/obj';
import { load } from '@loaders.gl/core';
import type { LineFeature } from '@/types/grid';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { hexToRgb } from '@/lib/color';
import { lineFeatures, stationFeatures } from '@/config/grid';
import { MAP_STYLES, MAP_3D_VIEW } from '@/lib/constants';
import { Box } from 'lucide-react';
import MapShell from './map/MapShell';
import { useSuppressMissingImages } from './map/useMapControls';

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

export default function CampusMap3D() {
  const { resolvedTheme } = useTheme();
  const [selected, setSelected] = useState<{ id?: string; url?: string; description?: string; group?: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stationMesh, setStationMesh] = useState<any>(null);

  const suppressMissing = useSuppressMissingImages();

  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  useEffect(() => {
    load('/3d/StationSign.obj', OBJLoader)
      .then((mesh) => setStationMesh(mesh))
      .catch((err) => console.warn('Failed to load station mesh, falling back to columns:', err));
  }, []);

  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (ref) suppressMissing(ref);
  }, [suppressMissing]);

  const onMapLoad = useCallback((evt: { target: maplibregl.Map }) => {
    const map = evt.target;

    const setupMap = () => {
      map.setLight({
        anchor: 'viewport',
        color: '#ffffff',
        intensity: 0.4,
        position: [1.5, 180, 45],
      });

      const sources = map.getStyle()?.sources || {};
      const buildingSource = Object.keys(sources).find(
        key => sources[key].type === 'vector' &&
          (key.includes('openmaptiles') || key.includes('osm') || sources[key].url?.includes('tiles.openfreemap'))
      );

      if (!buildingSource) {
        console.warn('No suitable building source found for 3D buildings');
        return;
      }

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
                'fill-extrusion-color': [
                  'case',
                  ['>', ['coalesce', ['get', 'render_height'], 10], 30],
                  '#7a7a7a',
                  ['>', ['coalesce', ['get', 'render_height'], 10], 15],
                  '#9a9590',
                  '#b8b4ad'
                ],
                'fill-extrusion-height': [
                  'interpolate', ['linear'], ['zoom'],
                  13, 0,
                  13.5, ['coalesce', ['get', 'render_height'], 10]
                ],
                'fill-extrusion-base': [
                  'interpolate', ['linear'], ['zoom'],
                  13, 0,
                  13.5, ['coalesce', ['get', 'render_min_height'], 0]
                ],
                'fill-extrusion-opacity': 0.92,
                'fill-extrusion-vertical-gradient': true
              }
            },
            labelLayerId
          );

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

      (window as unknown as { campusMap3D?: maplibregl.Map }).campusMap3D = map;
    };

    if (!map.isStyleLoaded()) {
      map.once('styledata', setupMap);
    } else {
      setupMap();
    }
  }, []);

  const onDeckClick = useCallback((info: PickingInfo) => {
    if (info.object && info.layer?.id === 'grid-stations-3d') {
      setSelected(info.object.properties ?? null);
    } else {
      setSelected(null);
    }
  }, []);

  const layers = useMemo(
    () => [
      new SolidPolygonLayer({
        id: 'grid-lines-3d',
        data: lineFeatures.flatMap((line: LineFeature) => {
          const coords = line.geometry.coordinates as [number, number][];
          const polygons = lineToPolygon(coords, 2);
          return polygons.map(polygon => ({
            polygon,
            color: line.properties?.color,
          }));
        }),
        getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
        getFillColor: (d: { color?: string }) => [...hexToRgb(d.color), 255] as [number, number, number, number],
        extruded: true,
        getElevation: 4,
        pickable: true,
        parameters: { depthTest: true },
      }),
      stationMesh && new SimpleMeshLayer({
        id: 'grid-stations-3d',
        data: stationFeatures,
        mesh: stationMesh,
        getPosition: (station) => [...station.geometry.coordinates, 0] as [number, number, number],
        getColor: (station) => [
          ...hexToRgb(station.properties?.color, [100, 212, 163]),
          255,
        ] as [number, number, number, number],
        getOrientation: [0, 0, 90],
        sizeScale: 8,
        pickable: true,
        parameters: { depthTest: true },
      }),
    ].filter(Boolean),
    [stationMesh],
  );

  return (
    <MapShell
      containerId="campus-map-3d-container"
      placeholderIcon={Box}
      loadingLabel="Loading 3D view..."
      errorTitle="3D View Unavailable"
      errorDescription="Unable to render the 3D map. Try refreshing the page."
      selectedStation={selected}
      className="shadow-2xl shadow-emerald-400/10"
    >
      {({ showLines, showStations, onError }) => {
        // Filter layers based on toggles
        const activeLayers = layers.filter((l) => {
          if (!l) return false;
          if (l.id === 'grid-lines-3d' && !showLines) return false;
          if (l.id === 'grid-stations-3d' && !showStations) return false;
          return true;
        });

        return (
          <DeckGL
            controller
            initialViewState={MAP_3D_VIEW}
            getTooltip={({ object }) => {
              if (!object) return null;
              const id = object?.properties?.id ?? '';
              const desc = object?.properties?.description ?? '';
              const group = object?.properties?.group ?? '';
              return {
                html: `<div style="font-size:14px;font-weight:600;color:var(--foreground)">${id}</div>${desc ? `<div style="color:var(--foreground-secondary)">${desc}</div>` : ''}${group ? `<div style="color:var(--foreground-secondary)">${group}</div>` : ''}`,
                style: {
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: 'var(--panel)',
                  opacity: '0.9',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  color: 'var(--foreground)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  backdropFilter: 'blur(8px)',
                },
              };
            }}
            layers={activeLayers}
            onError={onError}
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
        );
      }}
    </MapShell>
  );
}
