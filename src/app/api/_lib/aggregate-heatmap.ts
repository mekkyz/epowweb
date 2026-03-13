import { stationFeatures } from "@/config/grid";
import type { StationHeatmapRow } from "@/types/smdt";

// Built once at module load — reused across all requests
const stationsById = new Map(stationFeatures.map((s) => [s.properties.id, s]));

export interface AggregatedHeatmap {
  featureCollection: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: { stationId: string; valueKw: number; meters: number };
    }[];
  };
  stats: { stations: number; meters: number };
}

/**
 * Converts pre-aggregated station rows to GeoJSON FeatureCollection.
 */
export function stationRowsToGeoJSON(rows: StationHeatmapRow[]): AggregatedHeatmap {
  let totalMeters = 0;
  const features = rows
    .map((r) => {
      const station = stationsById.get(r.stationId);

      if (!station?.geometry || station.geometry.type !== "Point") return null;
      totalMeters += r.meterCount;

      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: station.geometry.coordinates as [number, number],
        },
        properties: { stationId: r.stationId, valueKw: r.totalKw, meters: r.meterCount },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    featureCollection: { type: "FeatureCollection" as const, features },
    stats: { stations: features.length, meters: totalMeters },
  };
}
