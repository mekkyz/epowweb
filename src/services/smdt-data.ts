import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { getDataDir, getSmdtConfig } from '@/services/config-loader';
import {
  getBoundsPg,
  hasPg,
  listHeatmapTimestampsPg,
  loadAggregatedSeriesPg,
  loadHeatmapSlicePg,
  loadMeterSeriesPg,
} from '@/services/pg-store';
import {
  BuildingMeta,
  HeatmapPoint,
  MeterMeta,
  MeterReading,
  SmdtConfig,
  StationMeta,
} from '@/types/smdt';
import { dbLogger } from '@/lib/logger';

const METER_DIR = path.join(getDataDir(), 'DatenSM');
const HEATMAP_DIR = path.join(getDataDir(), 'DatenSM_time');

export function listConfig(): SmdtConfig {
  return getSmdtConfig();
}

export function getMeterMeta(id: string): MeterMeta | undefined {
  return getSmdtConfig().meters.find((m) => m.id === id);
}

export function getBuildingMeta(id: string): BuildingMeta | undefined {
  return getSmdtConfig().buildings.find((b) => b.id === id);
}

export function getStationMeta(id: string): StationMeta | undefined {
  return getSmdtConfig().stations.find((s) => s.id === id);
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

export async function loadMeterSeries(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  if (hasPg()) {
    return loadMeterSeriesPg(meterId, options);
  }
  
  const filePath = path.join(METER_DIR, `${meterId}.csv`);
  if (!fs.existsSync(filePath)) {
    dbLogger.warn('Meter CSV file not found', { meterId, filePath });
    return [];
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return [];

    const [, ...dataLines] = lines;
    const startBound = options.start ? dayjs(options.start) : null;
    const endBound = options.end ? dayjs(options.end) : null;

    let rows: MeterReading[] = dataLines
      .map((line) => parseMeterLine(line))
      .filter((row): row is MeterReading => row !== null);

    if (startBound) {
      const startMs = startBound.valueOf();
      rows = rows.filter((r) => dayjs(r.start).valueOf() >= startMs);
    }
    if (endBound) {
      const endMs = endBound.valueOf();
      rows = rows.filter((r) => dayjs(r.end).valueOf() <= endMs);
    }

    const limit = options.limit ?? 500;
    if (rows.length > limit) {
      const stride = Math.ceil(rows.length / limit);
      rows = rows.filter((_, idx) => idx % stride === 0);
    }

    return rows;
  } catch (error) {
    dbLogger.error('Failed to load meter series from CSV', error, { meterId });
    return [];
  }
}

export async function getMeterBounds(meterId: string): Promise<SeriesBounds> {
  if (hasPg()) {
    return getBoundsPg([meterId]);
  }
  
  const filePath = path.join(METER_DIR, `${meterId}.csv`);
  if (!fs.existsSync(filePath)) return {};
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return {};
    
    const first = parseMeterLine(lines[1]);
    const last = parseMeterLine(lines[lines.length - 1]);
    
    return {
      start: first?.start,
      end: last?.end,
    };
  } catch (error) {
    dbLogger.error('Failed to get meter bounds from CSV', error, { meterId });
    return {};
  }
}

export async function loadAggregatedSeries(
  meterIds: string[],
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  if (hasPg()) {
    return loadAggregatedSeriesPg(meterIds, options);
  }
  
  const seriesList = await Promise.all(meterIds.map((id) => loadMeterSeries(id, options)));
  if (seriesList.length === 0) return [];

  const bucket = new Map<string, MeterReading>();
  seriesList.forEach((series) => {
    series.forEach((row) => {
      const key = `${row.start}_${row.end}`;
      const existing = bucket.get(key);
      if (!existing) {
        bucket.set(key, { ...row });
      } else {
        bucket.set(key, {
          ...existing,
          powerKw: sum(existing.powerKw, row.powerKw),
          powerOriginalKw: sum(existing.powerOriginalKw, row.powerOriginalKw),
          energyKwh: sum(existing.energyKwh, row.energyKwh),
          energyOriginalKwh: sum(existing.energyOriginalKwh, row.energyOriginalKwh),
        });
      }
    });
  });

  return Array.from(bucket.values()).sort((a, b) => a.start.localeCompare(b.start));
}

export async function getAggregatedBounds(meterIds: string[]): Promise<SeriesBounds> {
  if (hasPg()) {
    return getBoundsPg(meterIds);
  }
  
  let minStart: string | undefined;
  let maxEnd: string | undefined;
  
  for (const id of meterIds) {
    const bounds = await getMeterBounds(id);
    if (bounds.start && (!minStart || bounds.start < minStart)) minStart = bounds.start;
    if (bounds.end && (!maxEnd || bounds.end > maxEnd)) maxEnd = bounds.end;
  }
  
  return { start: minStart, end: maxEnd };
}

export async function loadHeatmapSlice(timestamp: string): Promise<HeatmapPoint[]> {
  if (hasPg()) {
    return loadHeatmapSlicePg(timestamp);
  }

  const ts = dayjs(timestamp).isValid() ? dayjs(timestamp) : dayjs(timestamp, 'YYYYMMDD_HHmmss');
  if (!ts.isValid()) {
    dbLogger.warn('Invalid heatmap timestamp', { timestamp });
    return [];
  }
  
  const filename = `zw_${ts.format('YYYYMMDD_HHmmss')}.csv`;
  const filePath = path.join(HEATMAP_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    dbLogger.warn('Heatmap CSV file not found', { timestamp, filePath });
    return [];
  }

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    
    return lines.map((line) => {
      const parts = line.split(';').map((s) => s.trim());
      return {
        meterId: parts[1],
        valueKw: safeNumber(parts[2]),
        unit: parts[3] ?? 'kW',
      };
    });
  } catch (error) {
    dbLogger.error('Failed to load heatmap slice from CSV', error, { timestamp });
    return [];
  }
}

export async function listHeatmapTimestamps(): Promise<string[]> {
  if (hasPg()) {
    return listHeatmapTimestampsPg();
  }

  if (!fs.existsSync(HEATMAP_DIR)) {
    dbLogger.warn('Heatmap directory not found', { path: HEATMAP_DIR });
    return [];
  }
  
  try {
    const files = await fs.promises.readdir(HEATMAP_DIR);
    
    return files
      .filter((f) => f.startsWith('zw_') && f.endsWith('.csv'))
      .map((f) => f.replace('zw_', '').replace('.csv', ''))
      .map((raw) => {
        const parsed = dayjs(raw, 'YYYYMMDD_HHmmss');
        return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : raw;
      })
      .sort();
  } catch (error) {
    dbLogger.error('Failed to list heatmap timestamps', error);
    return [];
  }
}

// =============================================================================
// Private Helper Functions
// =============================================================================

function parseMeterLine(line: string): MeterReading | null {
  const parts = line.split(';').map((s) => s.trim());
  if (parts.length < 6) return null;
  
  const [start, end, powerOriginalKw, powerKw, energyOriginalKwh, energyKwh, errorCode] = parts;
  
  return {
    start,
    end,
    powerKw: safeNumber(powerKw),
    powerOriginalKw: safeNumber(powerOriginalKw),
    energyKwh: safeNumber(energyKwh),
    energyOriginalKwh: safeNumber(energyOriginalKwh),
    errorCode: safeNumber(errorCode),
  };
}

function safeNumber(value: string | undefined | null): number | null {
  if (value == null) return null;
  const num = Number(value.toString().replace(',', '.'));
  return Number.isFinite(num) ? num : null;
}

function sum(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

// Re-export types for convenience
export type { MeterReading };
