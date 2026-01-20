import type { Feature, FeatureCollection, LineString, Point } from 'geojson';

export interface Meter {
  id: string;
  url: string;
}

export interface Building {
  id: string;
  url: string;
}

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

export interface LegacyGridData {
  meters: Meter[];
  buildings: Building[];
  stations: StationFeature[];
  lines: LineFeature[];
}

export interface GridCollections {
  stations: FeatureCollection<Point, StationProperties>;
  lines: FeatureCollection<LineString, LineProperties>;
}
