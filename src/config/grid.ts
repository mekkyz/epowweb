import gridRaw from '@/config/grid-data.json';
import type {
  GridCollections,
  GridData,
  LineFeature,
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

const uniqueBuildings = dedupe(raw.buildings, (b) => b.id).map((b) => ({
  ...b,
  url: `/visualization/building/${b.id}`,
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
