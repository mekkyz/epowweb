import gridRaw from '@/config/grid-data.json';
import type {
  BuildingFeature,
  GridCollections,
  GridData,
  LineFeature,
  RawBuilding,
  RawGridData,
  StationFeature,
} from '@/types/grid';

const raw = gridRaw as RawGridData;

// =============================================================================
// Data Processing - Deduplicate and enrich with URLs
// =============================================================================

const uniqueMeters = dedupe(raw.meters, (m) => m.id).map((m) => ({
  ...m,
  url: `/visualization/meter/${m.id}`,
}));

/** Extract the id from either a GeoJSON Feature or a plain {id} object. */
function getBuildingId(b: RawBuilding): string {
  return 'properties' in b && b.properties ? b.properties.id : (b as { id: string }).id;
}

const dedupedBuildings = dedupe(raw.buildings, getBuildingId);

const uniqueBuildings = dedupedBuildings.map((b) => ({
  id: getBuildingId(b),
  url: `/visualization/building/${getBuildingId(b)}`,
}));

/** Buildings that have GeoJSON Polygon coordinates — used for map layers. */
const buildingFeatures: BuildingFeature[] = dedupedBuildings
  .filter((b): b is Extract<RawBuilding, { type: 'Feature'; geometry: { type: 'Polygon' } }> =>
    'type' in b && b.type === 'Feature' && 'geometry' in b && b.geometry?.type === 'Polygon')
  .map((b) => ({
    ...b,
    properties: {
      ...b.properties,
      url: `/visualization/building/${b.properties.id}`,
    },
  }));

const uniqueStations = dedupe(raw.stations, (s) => s.properties.id).map((s) => ({
  ...s,
  properties: {
    ...s.properties,
    url: `/visualization/station/${s.properties.id}`,
  },
}));

const uniqueLines = dedupe(raw.lines, (l) => l.properties.id);

// =============================================================================
// Exported Data Collections
// =============================================================================

/**
 * Complete grid data with all entities
 */
export const gridData: GridData = {
  meters: uniqueMeters,
  buildings: uniqueBuildings,
  buildingFeatures,
  stations: uniqueStations,
  lines: uniqueLines,
};

/**
 * GeoJSON FeatureCollections for map layers
 */
export const gridCollections: GridCollections = {
  stations: {
    type: 'FeatureCollection',
    features: gridData.stations,
  },
  lines: {
    type: 'FeatureCollection',
    features: gridData.lines,
  },
  buildings: {
    type: 'FeatureCollection',
    features: gridData.buildingFeatures,
  },
};

// =============================================================================
// Lookup Maps for O(1) access
// =============================================================================

export const stationById = new Map<string, StationFeature>(
  gridData.stations.map((s) => [s.properties.id, s]),
);

// =============================================================================
// Select Options for UI Components
// =============================================================================

export const stationOptions = gridData.stations
  .map((station) => ({
    id: station.properties.id,
    label: `${station.properties.id} · ${station.properties.description || 'Station'}`,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export const buildingOptions = gridData.buildings
  .map((building) => ({
    id: building.id,
    label: building.id,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export const meterOptions = gridData.meters
  .map((meter) => ({
    id: meter.id,
    label: meter.id,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

// =============================================================================
// Direct Feature Exports for Map Layers
// =============================================================================

export const lineFeatures = gridData.lines as LineFeature[];
export const stationFeatures = gridData.stations as StationFeature[];
export const buildingFeaturesList = gridData.buildingFeatures as BuildingFeature[];

// =============================================================================
// Grid Legend (shared by 2D and 3D map components)
// =============================================================================

export const GRID_LEGEND = [
  { color: '#aaff00', label: 'Ring 1 – Südring' },
  { color: '#00aaff', label: 'Ring 2 – Ring B' },
  { color: '#ffff00', label: 'Ring 3 – Ring A' },
  { color: '#ff5500', label: 'Ring 4 – Nordring' },
  { color: '#ff0000', label: 'Ring 5 – WAK' },
  { color: '#ff0099', label: 'Ring 6 – Kopfstationen' },
  { color: '#aaaaff', label: 'Ring 7 – ITU' },
] as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Removes duplicate items from an array based on a key function
 */
function dedupe<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
