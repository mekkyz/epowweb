"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  LayerProps,
  MapLayerMouseEvent,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { gridCollections, stationById } from "@/config/grid";
import { MAP_STYLES, DEFAULT_MAP_VIEW, MAP_ZOOM_LIMITS, COLORS } from "@/lib/constants";
import {
  buildingsFillLayer,
  buildingsOutlineLayer,
  buildingLabelsLayer,
} from "@/components/map/buildingLayers";
import { useEntityMapping } from "@/hooks/useEntityMapping";
import { Map as MapIcon } from "lucide-react";
import type { Feature, FeatureCollection, Point, LineString } from "geojson";
import MapShell from "./map/MapShell";
import { useAltDragRotation, useSuppressMissingImages } from "./map/useMapControls";

const lineLayer: LayerProps = {
  id: "lines",
  type: "line",
  paint: {
    "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 15, 3, 18, 6],
    "line-color": ["coalesce", ["get", "color"], COLORS.grid.line],
    "line-opacity": 1,
  },
  layout: { "line-cap": "round", "line-join": "round" },
};

const lineOutlineLayer: LayerProps = {
  id: "lines-outline",
  type: "line",
  paint: {
    "line-width": ["interpolate", ["linear"], ["zoom"], 12, 2, 15, 6, 18, 12],
    "line-color": "rgba(0, 0, 0, 0.4)",
    "line-opacity": 1,
  },
  layout: { "line-cap": "round", "line-join": "round" },
};

const stationsLayer: LayerProps = {
  id: "stations",
  type: "circle",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 3, 15, 10, 18, 16],
    "circle-color": ["coalesce", ["get", "color"], COLORS.grid.line],
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 15, 2.5, 18, 4],
    "circle-stroke-color": "rgba(0, 0, 0, 0.4)",
  },
};

const stationLabelsLayer: LayerProps = {
  id: "station-labels",
  type: "symbol",
  minzoom: 13,
  layout: {
    "text-field": ["get", "id"],
    "text-size": ["interpolate", ["linear"], ["zoom"], 13, 9, 16, 13, 18, 16],
    "text-anchor": "top",
    "text-offset": [0, 0.8],
    "text-allow-overlap": false,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  },
  paint: {
    "text-color": "#1a1a1a",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
};

/** Thin dashed lines connecting stations to their buildings */
const connectionLineLayer: LayerProps = {
  id: "connection-lines",
  type: "line",
  paint: {
    "line-color": "rgba(160, 160, 155, 0.35)",
    "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.3, 15, 0.7, 18, 1.2],
    "line-dasharray": [6, 4],
  },
  layout: { "line-cap": "round" },
};

/** Compute the centroid of a polygon ring */
function polygonCentroid(coords: number[][]): [number, number] {
  let cx = 0,
    cy = 0;
  for (const [x, y] of coords) {
    cx += x;
    cy += y;
  }
  return [cx / coords.length, cy / coords.length];
}

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
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hoveredBuildingId = useRef<string | number | null>(null);
  const mapping = useEntityMapping();

  // Build a lookup from building ID to centroid of its polygon
  const buildingCentroids = useMemo(() => {
    const centroids = new globalThis.Map<string, [number, number]>();
    for (const f of gridCollections.buildings.features) {
      const ring = f.geometry.coordinates[0];
      if (ring) centroids.set(f.properties.id, polygonCentroid(ring));
    }
    return centroids;
  }, []);

  // Generate connection lines from stations to their buildings
  const connectionLines = useMemo<FeatureCollection<LineString>>(() => {
    if (!mapping.loaded) return { type: "FeatureCollection", features: [] };
    const features: Feature<LineString>[] = [];
    for (const station of mapping.stations) {
      const sf = stationById.get(station.id);
      if (!sf) continue;
      const stationCoords = sf.geometry.coordinates as [number, number];
      for (const bid of station.buildings ?? []) {
        const centroid = buildingCentroids.get(bid);
        if (!centroid) continue;
        features.push({
          type: "Feature",
          properties: { from: station.id, to: bid },
          geometry: { type: "LineString", coordinates: [stationCoords, centroid] },
        });
      }
    }
    return { type: "FeatureCollection", features };
  }, [mapping.loaded, mapping.stations, buildingCentroids]);

  const setupAltDrag = useAltDragRotation();
  const suppressMissing = useSuppressMissingImages();

  const handleMapRef = useCallback(
    (ref: { getMap: () => maplibregl.Map } | null) => {
      if (!ref) return;
      suppressMissing(ref);
      setupAltDrag(ref);
      mapRef.current = ref.getMap();
    },
    [suppressMissing, setupAltDrag],
  );

  const mapStyleType = (resolvedTheme === "light" ? "light" : "dark") as "light" | "dark";
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType], [mapStyleType]);

  const onMapClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.find(
      (f) => f.layer.id === "stations" || f.layer.id === "buildings-fill",
    ) as Feature<Point> | undefined;
    setSelected(feature ?? null);
  }, []);

  /** Set feature-state hover on building polygons for highlight effect */
  const handleMouseMove = useCallback((evt: MapLayerMouseEvent) => {
    const map = mapRef.current;
    const f = evt.features?.[0];

    // Clear previous building hover
    if (hoveredBuildingId.current !== null && map) {
      map.setFeatureState(
        { source: "grid-buildings", id: hoveredBuildingId.current },
        { hover: false },
      );
      hoveredBuildingId.current = null;
    }

    if (!f) {
      setHover(null);
      if (map) map.getCanvas().style.cursor = "";
      return;
    }

    if (map) map.getCanvas().style.cursor = "pointer";

    // Set hover state on building polygons
    if (f.layer.id === "buildings-fill" && f.id !== undefined) {
      hoveredBuildingId.current = f.id;
      map?.setFeatureState({ source: "grid-buildings", id: f.id }, { hover: true });
    }

    const props = f.properties as { id?: string; description?: string; group?: string };
    setHover({
      id: props.id ?? "",
      description: props.description ?? "",
      group: props.group ?? "",
      x: evt.point.x,
      y: evt.point.y,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current;
    if (hoveredBuildingId.current !== null && map) {
      map.setFeatureState(
        { source: "grid-buildings", id: hoveredBuildingId.current },
        { hover: false },
      );
      hoveredBuildingId.current = null;
    }
    setHover(null);
    if (map) map.getCanvas().style.cursor = "";
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
      {({ showLines, showStations, showBuildings, onError }) => (
        <Map
          ref={handleMapRef}
          reuseMaps={false}
          mapLib={maplibregl}
          mapStyle={mapStyle}
          initialViewState={DEFAULT_MAP_VIEW}
          minZoom={MAP_ZOOM_LIMITS.min}
          maxZoom={MAP_ZOOM_LIMITS.max}
          interactiveLayerIds={["stations", "buildings-fill"]}
          onClick={onMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onError={onError}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          canvasContextAttributes={{ contextType: "webgl2" }}
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
          {showBuildings && connectionLines.features.length > 0 && (
            <Source id="connection-lines" type="geojson" data={connectionLines}>
              <Layer {...connectionLineLayer} />
            </Source>
          )}
          {showBuildings && (
            <Source id="grid-buildings" type="geojson" data={gridCollections.buildings} generateId>
              <Layer {...buildingsFillLayer} />
              <Layer {...buildingsOutlineLayer} />
              <Layer {...buildingLabelsLayer} />
            </Source>
          )}
          {showStations && (
            <Source id="grid-stations" type="geojson" data={gridCollections.stations}>
              <Layer {...stationsLayer} />
              <Layer {...stationLabelsLayer} />
            </Source>
          )}
          <NavigationControl
            position="bottom-right"
            visualizePitch
            style={{ marginBottom: "52px" }}
          />
          {hover && (
            <div
              className="bg-panel/90 text-foreground pointer-events-none absolute z-10 rounded-lg p-3 text-xs shadow-sm shadow-black/10 backdrop-blur"
              style={{ left: hover.x + 12, top: hover.y + 12, fontFamily: "var(--font-sans)" }}
            >
              <p className="text-foreground text-sm font-semibold">{hover.id}</p>
              {hover.description && (
                <p className="text-foreground-secondary">{hover.description}</p>
              )}
              {hover.group && <p className="text-foreground-secondary">{hover.group}</p>}
            </div>
          )}
        </Map>
      )}
    </MapShell>
  );
}
