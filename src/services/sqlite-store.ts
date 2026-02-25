import fs from 'fs';
import { HeatmapPoint, MeterReading, SeriesBounds, SeriesOptions } from '@/types/smdt';
import { dbLogger } from '@/lib/logger';
import { queryAll, queryGet } from '@/services/sqlite-async';

let dbPath: string | null = null;

export function hasSqlite(): boolean {
  if (dbPath) return true;

  const candidate = process.env.SMDT_SQLITE_PATH ?? './data/smdt.db';
  if (!fs.existsSync(candidate)) return false;

  dbPath = candidate;
  dbLogger.info('SQLite database found', { path: dbPath });
  return true;
}

function getDbPath(): string {
  if (!hasSqlite()) {
    throw new Error('SQLite database not available');
  }
  return dbPath!;
}

export async function loadMeterSeriesSqlite(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  const path = getDbPath();
  const params: (string | number)[] = [meterId];
  let where = 'WHERE meter_id = ?';

  if (options.start) {
    params.push(options.start);
    where += ' AND start_ts >= ?';
  }
  if (options.end) {
    params.push(options.end);
    where += ' AND end_ts <= ?';
  }

  const limit = options.limit ?? 2000;
  params.push(limit);

  try {
    const rows = await queryAll(
      path,
      `SELECT start_ts, end_ts, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code
       FROM meter_readings
       ${where}
       ORDER BY start_ts ASC
       LIMIT ?`,
      params,
    ) as Record<string, unknown>[];

    return rows.map((r) => ({
      start: r.start_ts as string,
      end: r.end_ts as string,
      powerKw: toNumber(r.power_kw),
      powerOriginalKw: toNumber(r.power_original_kw),
      energyKwh: toNumber(r.energy_kwh),
      energyOriginalKwh: toNumber(r.energy_original_kwh),
      errorCode: toNumber(r.error_code),
    }));
  } catch (error) {
    dbLogger.error('Failed to load meter series from SQLite', error, { meterId });
    throw error;
  }
}

export async function loadAggregatedSeriesSqlite(
  meterIds: string[],
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  if (meterIds.length === 0) return [];

  const path = getDbPath();
  const placeholders = meterIds.map(() => '?').join(',');
  const params: (string | number)[] = [...meterIds];
  let extraWhere = '';

  if (options.start) {
    params.push(options.start);
    extraWhere += ' AND start_ts >= ?';
  }
  if (options.end) {
    params.push(options.end);
    extraWhere += ' AND end_ts <= ?';
  }

  const limit = options.limit ?? 2000;
  params.push(limit);

  try {
    const rows = await queryAll(
      path,
      `SELECT start_ts, end_ts,
              SUM(power_kw) AS power_kw,
              SUM(power_original_kw) AS power_original_kw,
              SUM(energy_kwh) AS energy_kwh,
              SUM(energy_original_kwh) AS energy_original_kwh,
              MAX(error_code) AS error_code
       FROM meter_readings
       WHERE meter_id IN (${placeholders})${extraWhere}
       GROUP BY start_ts, end_ts
       ORDER BY start_ts ASC
       LIMIT ?`,
      params,
    ) as Record<string, unknown>[];

    return rows.map((r) => ({
      start: r.start_ts as string,
      end: r.end_ts as string,
      powerKw: toNumber(r.power_kw),
      powerOriginalKw: toNumber(r.power_original_kw),
      energyKwh: toNumber(r.energy_kwh),
      energyOriginalKwh: toNumber(r.energy_original_kwh),
      errorCode: toNumber(r.error_code),
    }));
  } catch (error) {
    dbLogger.error('Failed to load aggregated series from SQLite', error, { meterCount: meterIds.length });
    throw error;
  }
}

/**
 * Gets the time bounds (min start, max end) for a set of meters.
 */
export async function getBoundsSqlite(meterIds: string[]): Promise<SeriesBounds> {
  if (meterIds.length === 0) return {};

  const path = getDbPath();

  try {
    let minStart: string | undefined;
    let maxEnd: string | undefined;

    for (const id of meterIds) {
      const row = await queryGet(
        path,
        `SELECT MIN(start_ts) AS s, MAX(end_ts) AS e FROM meter_readings WHERE meter_id = ?`,
        [id],
      ) as { s: string | null; e: string | null };
      if (row.s && (!minStart || row.s < minStart)) minStart = row.s;
      if (row.e && (!maxEnd || row.e > maxEnd)) maxEnd = row.e;
    }

    return { start: minStart, end: maxEnd };
  } catch (error) {
    dbLogger.error('Failed to get bounds from SQLite', error);
    throw error;
  }
}

/**
 * Lists available dates using a recursive index walk.
 * Result is cached since the dataset is static.
 */
let cachedDates: string[] | null = null;

export async function listHeatmapDatesSqlite(): Promise<string[]> {
  if (cachedDates) return cachedDates;

  const path = getDbPath();

  try {
    const rows = await queryAll(
      path,
      `WITH RECURSIVE date_walk(ts) AS (
         SELECT MIN(ts) FROM heatmap_points
         UNION ALL
         SELECT (SELECT MIN(hp.ts) FROM heatmap_points hp
                 WHERE hp.ts > substr(date_walk.ts, 1, 10) || ' 23:59:59')
         FROM date_walk WHERE ts IS NOT NULL
       )
       SELECT substr(ts, 1, 10) AS date FROM date_walk WHERE ts IS NOT NULL`,
    ) as { date: string }[];

    cachedDates = rows.map((r) => r.date);
    return cachedDates;
  } catch (error) {
    dbLogger.error('Failed to list heatmap dates from SQLite', error);
    throw error;
  }
}

/**
 * Lists timestamps for a specific date (e.g. "2016-01-15").
 */
export async function listDayTimestampsSqlite(date: string): Promise<string[]> {
  const path = getDbPath();

  try {
    const rows = await queryAll(
      path,
      `SELECT DISTINCT ts
       FROM heatmap_points
       WHERE ts >= ? AND ts <= ?
       ORDER BY ts ASC`,
      [`${date} 00:00:00`, `${date} 23:59:59`],
    ) as { ts: string }[];

    return rows.map((r) => r.ts);
  } catch (error) {
    dbLogger.error('Failed to list day timestamps from SQLite', error, { date });
    throw error;
  }
}

/**
 * Gets heatmap timestamp bounds (uses index min/max)
 */
export async function getHeatmapBoundsSqlite(): Promise<{ min: string | null; max: string | null; count: number }> {
  const path = getDbPath();

  try {
    const minRow = await queryGet(path, `SELECT MIN(ts) AS ts FROM heatmap_points`) as { ts: string | null };
    const maxRow = await queryGet(path, `SELECT MAX(ts) AS ts FROM heatmap_points`) as { ts: string | null };

    return { min: minRow.ts, max: maxRow.ts, count: 0 };
  } catch (error) {
    dbLogger.error('Failed to get heatmap bounds from SQLite', error);
    throw error;
  }
}

/**
 * Gets the nearest heatmap timestamp to a given target (for stepping)
 */
export async function getNeighborTimestampSqlite(
  current: string,
  direction: 'prev' | 'next',
): Promise<string | null> {
  const path = getDbPath();

  try {
    const op = direction === 'next' ? '>' : '<';
    const order = direction === 'next' ? 'ASC' : 'DESC';
    const row = await queryGet(
      path,
      `SELECT DISTINCT ts FROM heatmap_points WHERE ts ${op} ? ORDER BY ts ${order} LIMIT 1`,
      [current],
    ) as { ts: string } | undefined;

    return row?.ts ?? null;
  } catch (error) {
    dbLogger.error('Failed to get neighbor timestamp from SQLite', error);
    throw error;
  }
}

// --- Server-side LRU cache for heatmap slices (static dataset, never invalidates) ---
const sliceCache = new Map<string, HeatmapPoint[]>();
const SLICE_CACHE_MAX = 200;

/**
 * Loads a heatmap slice for a specific timestamp.
 * Results are cached in an LRU map since the dataset is static.
 */
export async function loadHeatmapSliceSqlite(timestamp: string): Promise<HeatmapPoint[]> {
  const cached = sliceCache.get(timestamp);
  if (cached) {
    // LRU: move to end
    sliceCache.delete(timestamp);
    sliceCache.set(timestamp, cached);
    return cached;
  }

  const path = getDbPath();

  try {
    const rows = await queryAll(
      path,
      `SELECT meter_id, value_kw, unit
       FROM heatmap_points
       WHERE ts = ?
       ORDER BY meter_id ASC`,
      [timestamp],
    ) as Record<string, unknown>[];

    const result = rows.map((r) => ({
      meterId: r.meter_id as string,
      valueKw: toNumber(r.value_kw),
      unit: (r.unit as string) ?? 'kW',
    }));

    // LRU eviction
    if (sliceCache.size >= SLICE_CACHE_MAX) {
      const oldest = sliceCache.keys().next().value;
      if (oldest) sliceCache.delete(oldest);
    }
    sliceCache.set(timestamp, result);

    return result;
  } catch (error) {
    dbLogger.error('Failed to load heatmap slice from SQLite', error, { timestamp });
    throw error;
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
