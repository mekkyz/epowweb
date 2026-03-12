import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';

export interface Meter {
  id: string;
  url: string;
}

export interface Building {
  id: string;
  url: string;
}

export interface BuildingProperties {
  id: string;
  url: string;
}

export type BuildingFeature = Feature<Polygon, BuildingProperties>;

export interface StationProperties {
  group: string;
  id: string;
  description: string;
  size: number;
  color: string;
  url: string;
}

export type StationFeature = Feature<Point, StationProperties>;

export interface LineProperties {
  group: string;
  id: string;
  color?: string;
  roofColor?: string;
}

export type LineFeature = Feature<LineString, LineProperties>;

/** A building entry in grid-data.json — either a GeoJSON Polygon Feature, a Point Feature, or a plain object. */
export type RawBuilding =
  | Feature<Polygon, { id: string }>
  | Feature<Point, { id: string }>
  | { id: string };

/** Raw shape of grid-data.json (no url fields — grid.ts adds them). */
export interface RawGridData {
  meters: Omit<Meter, 'url'>[];
  buildings: RawBuilding[];
  stations: Feature<Point, Omit<StationProperties, 'url'>>[];
  lines: LineFeature[];
}

/** Enriched grid data with url fields added by grid.ts. */
export interface GridData {
  meters: Meter[];
  buildings: Building[];
  buildingFeatures: BuildingFeature[];
  stations: StationFeature[];
  lines: LineFeature[];
}

export interface GridCollections {
  stations: FeatureCollection<Point, StationProperties>;
  lines: FeatureCollection<LineString, LineProperties>;
  buildings: FeatureCollection<Polygon, BuildingProperties>;
}
