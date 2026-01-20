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

export interface HeatmapPoint {
  meterId: string;
  valueKw: number | null;
  unit: string;
}
