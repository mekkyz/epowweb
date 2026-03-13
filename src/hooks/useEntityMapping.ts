import { useEffect, useMemo, useState } from "react";
import type { StationMeta, BuildingMeta } from "@/types/smdt";

interface EntityMapping {
  stations: StationMeta[];
  buildings: BuildingMeta[];
  /** Sets of known IDs (from meter-mapping.xml config) */
  stationIds: Set<string>;
  buildingIds: Set<string>;
  meterIds: Set<string>;
  /** Building IDs belonging to a station */
  buildingsForStation: (stationId: string) => string[];
  /** Meter IDs belonging to a station */
  metersForStation: (stationId: string) => string[];
  /** Meter IDs belonging to a building */
  metersForBuilding: (buildingId: string) => string[];
  /** Station ID that owns a building */
  stationForBuilding: (buildingId: string) => string | undefined;
  /** Station ID that owns a meter */
  stationForMeter: (meterId: string) => string | undefined;
  /** Building ID that owns a meter */
  buildingForMeter: (meterId: string) => string | undefined;
  loaded: boolean;
}

export function useEntityMapping(): EntityMapping {
  const [stations, setStations] = useState<StationMeta[]>([]);
  const [buildings, setBuildings] = useState<BuildingMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/stations").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([stationsRes, buildingsRes]) => {
      setStations(stationsRes.data?.stations ?? []);
      setBuildings(buildingsRes.data?.buildings ?? []);
      setLoaded(true);
    });
  }, []);

  const stationIds = useMemo(() => new Set(stations.map((s) => s.id)), [stations]);
  const buildingIds = useMemo(() => new Set(buildings.map((b) => b.id)), [buildings]);
  const meterIds = useMemo(() => {
    const ids = new Set<string>();

    stations.forEach((s) => s.meters.forEach((m) => ids.add(m)));

    return ids;
  }, [stations]);

  const buildingsForStation = (stationId: string) =>
    stations.find((s) => s.id === stationId)?.buildings ?? [];

  const metersForStation = (stationId: string) =>
    stations.find((s) => s.id === stationId)?.meters ?? [];

  const metersForBuilding = (buildingId: string) =>
    buildings.find((b) => b.id === buildingId)?.meters ?? [];

  const stationForBuilding = (buildingId: string) =>
    buildings.find((b) => b.id === buildingId)?.stationId;

  const stationForMeter = (meterId: string) => stations.find((s) => s.meters.includes(meterId))?.id;

  const buildingForMeter = (meterId: string) =>
    buildings.find((b) => b.meters.includes(meterId))?.id;

  return {
    stations,
    buildings,
    stationIds,
    buildingIds,
    meterIds,
    loaded,
    buildingsForStation,
    metersForStation,
    metersForBuilding,
    stationForBuilding,
    stationForMeter,
    buildingForMeter,
  };
}
