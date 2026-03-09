export interface MeterMeta {
  id: string;
  stationId?: string;
  buildingId?: string;
  wandlerfaktor?: number;
  aggregate?: boolean;
  stdId?: number;
  aks?: string;
  label?: string;
  notes?: string;
}

export interface BuildingMeta {
  id: string;
  stationId?: string;
  meters: string[];
}

export interface StationMeta {
  id: string;
  meters: string[];
  buildings: string[];
}

export interface SmdtConfig {
  meters: MeterMeta[];
  buildings: BuildingMeta[];
  stations: StationMeta[];
}

export interface MeterReading {
  start: string;
  end: string;
  powerKw: number | null;
  powerOriginalKw: number | null;
  energyKwh: number | null;
  energyOriginalKwh: number | null;
  errorCode: number | null;
}

export interface StationHeatmapRow {
  stationId: string;
  totalKw: number;
  meterCount: number;
}

export interface SeriesOptions {
  start?: string;
  end?: string;
  limit?: number;
}

export interface SeriesBounds {
  start?: string;
  end?: string;
}
