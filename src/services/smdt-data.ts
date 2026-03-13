import { getSmdtConfig } from "@/services/config-loader";
import {
  getBoundsSqlite,
  getHeatmapBoundsSqlite,
  getNeighborTimestampSqlite,
  listDayTimestampsSqlite,
  listHeatmapDatesSqlite,
  loadAggregatedSeriesSqlite,
  loadMeterSeriesSqlite,
  loadStationHeatmapSqlite,
} from "@/services/sqlite-store";
import {
  BuildingMeta,
  MeterMeta,
  MeterReading,
  SeriesBounds,
  SeriesOptions,
  SmdtConfig,
  StationHeatmapRow,
  StationMeta,
} from "@/types/smdt";

export function listConfig(): SmdtConfig {
  return getSmdtConfig();
}

let meterMetaMap: Map<string, MeterMeta> | null = null;
export function getMeterMeta(id: string): MeterMeta | undefined {
  if (!meterMetaMap) {
    meterMetaMap = new Map(getSmdtConfig().meters.map((m) => [m.id, m]));
  }
  return meterMetaMap.get(id);
}

export function getBuildingMeta(id: string): BuildingMeta | undefined {
  return getSmdtConfig().buildings.find((b) => b.id === id);
}

export function getStationMeta(id: string): StationMeta | undefined {
  return getSmdtConfig().stations.find((s) => s.id === id);
}

export type { SeriesOptions, SeriesBounds };

export async function loadMeterSeries(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  return loadMeterSeriesSqlite(meterId, options);
}

export async function getMeterBounds(meterId: string): Promise<SeriesBounds> {
  return getBoundsSqlite([meterId]);
}

export async function loadAggregatedSeries(
  meterIds: string[],
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  return loadAggregatedSeriesSqlite(meterIds, options);
}

export async function getAggregatedBounds(meterIds: string[]): Promise<SeriesBounds> {
  return getBoundsSqlite(meterIds);
}

export async function loadStationHeatmap(timestamp: string): Promise<StationHeatmapRow[]> {
  return loadStationHeatmapSqlite(timestamp);
}

export async function getHeatmapBounds(): Promise<{
  min: string | null;
  max: string | null;
  count: number;
}> {
  return getHeatmapBoundsSqlite();
}

export async function getNeighborTimestamp(
  current: string,
  direction: "prev" | "next",
): Promise<string | null> {
  return getNeighborTimestampSqlite(current, direction);
}

export async function listHeatmapDates(): Promise<string[]> {
  return listHeatmapDatesSqlite();
}

export async function listDayTimestamps(date: string): Promise<string[]> {
  return listDayTimestampsSqlite(date);
}

// Re-export types for convenience
export type { MeterReading };
