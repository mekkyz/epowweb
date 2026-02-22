import { getMeterMeta } from '@/services/smdt-data';
import { stationFeatures } from '@/config/grid';
import type { HeatmapPoint } from '@/types/smdt';

// Built once at module load — reused across all requests
const stationsById = new Map(stationFeatures.map((s) => [s.properties.id, s]));

export interface AggregatedHeatmap {
  featureCollection: {
    type: 'FeatureCollection';
    features: {
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: { stationId: string; valueKw: number; meters: number };
    }[];
  };
  stats: { stations: number; meters: number };
}

/**
 * Aggregates raw heatmap points by station, producing a GeoJSON FeatureCollection.
 * Shared by /api/heatmap/init and /api/heatmap/geo.
 */
export function aggregateSliceByStation(slice: HeatmapPoint[]): AggregatedHeatmap {
  const bucket = new Map<
    string,
    { stationId: string; value: number; count: number; coordinates: [number, number] }
  >();

  for (const p of slice) {
    try {
      const meta = getMeterMeta(p.meterId);
      const stationId = meta?.stationId;
      if (!stationId) continue;

      const station = stationsById.get(stationId);
      if (!station?.geometry || station.geometry.type !== 'Point') continue;

      const coords = station.geometry.coordinates as [number, number];
      const entry = bucket.get(stationId);
      const val = p.valueKw ?? 0;

      if (!entry) {
        bucket.set(stationId, { stationId, value: val, count: 1, coordinates: coords });
      } else {
        entry.value += val;
        entry.count += 1;
      }
    } catch {
      // Skip malformed points
      continue;
    }
  }

  const features = Array.from(bucket.values()).map((b) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: b.coordinates },
    properties: { stationId: b.stationId, valueKw: b.value, meters: b.count },
  }));

  return {
    featureCollection: { type: 'FeatureCollection' as const, features },
    stats: { stations: features.length, meters: slice.length },
  };
}
