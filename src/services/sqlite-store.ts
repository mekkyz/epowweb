import fs from 'fs';
import Database from 'better-sqlite3';
import { SeriesOptions, SeriesBounds } from '@/services/smdt-data';
import { HeatmapPoint, MeterReading } from '@/types/smdt';
import { dbLogger } from '@/lib/logger';

let db: Database.Database | null = null;

export function hasSqlite(): boolean {
  if (db) return true;

  const dbPath = process.env.SMDT_SQLITE_PATH ?? './data/smdt.db';
  if (!fs.existsSync(dbPath)) return false;

  try {
    db = new Database(dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
    dbLogger.info('SQLite database opened', { path: dbPath });
    return true;
  } catch (error) {
    dbLogger.error('Failed to open SQLite database', error);
    return false;
  }
}

function ensureDb(): Database.Database {
  if (!hasSqlite()) {
    throw new Error('SQLite database not available');
  }
  return db!;
}

export async function loadMeterSeriesSqlite(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  const database = ensureDb();
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
    const rows = database
      .prepare(
        `SELECT start_ts, end_ts, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code
         FROM meter_readings
         ${where}
         ORDER BY start_ts ASC
         LIMIT ?`,
      )
      .all(...params) as Record<string, unknown>[];

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

  const database = ensureDb();
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
    const rows = database
      .prepare(
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
      )
      .all(...params) as Record<string, unknown>[];

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
 * Queries each meter individually to leverage the (meter_id, start_ts) index.
 */
export async function getBoundsSqlite(meterIds: string[]): Promise<SeriesBounds> {
  if (meterIds.length === 0) return {};

  const database = ensureDb();

  try {
    const stmt = database.prepare(
      `SELECT MIN(start_ts) AS s, MAX(end_ts) AS e FROM meter_readings WHERE meter_id = ?`,
    );

    let minStart: string | undefined;
    let maxEnd: string | undefined;

    for (const id of meterIds) {
      const row = stmt.get(id) as { s: string | null; e: string | null };
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
 * Lists all available heatmap timestamps
 */
export async function listHeatmapTimestampsSqlite(): Promise<string[]> {
  const database = ensureDb();

  try {
    const rows = database
      .prepare(
        `SELECT DISTINCT ts
         FROM heatmap_points
         ORDER BY ts ASC`,
      )
      .all() as { ts: string }[];

    return rows.map((r) => r.ts);
  } catch (error) {
    dbLogger.error('Failed to list heatmap timestamps from SQLite', error);
    throw error;
  }
}

/**
 * Gets heatmap timestamp bounds (instant — uses index min/max)
 */
export async function getHeatmapBoundsSqlite(): Promise<{ min: string | null; max: string | null; count: number }> {
  const database = ensureDb();

  try {
    const minRow = database.prepare(`SELECT MIN(ts) AS ts FROM heatmap_points`).get() as { ts: string | null };
    const maxRow = database.prepare(`SELECT MAX(ts) AS ts FROM heatmap_points`).get() as { ts: string | null };

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
  const database = ensureDb();

  try {
    const op = direction === 'next' ? '>' : '<';
    const order = direction === 'next' ? 'ASC' : 'DESC';
    const row = database
      .prepare(`SELECT DISTINCT ts FROM heatmap_points WHERE ts ${op} ? ORDER BY ts ${order} LIMIT 1`)
      .get(current) as { ts: string } | undefined;

    return row?.ts ?? null;
  } catch (error) {
    dbLogger.error('Failed to get neighbor timestamp from SQLite', error);
    throw error;
  }
}

/**
 * Loads a heatmap slice for a specific timestamp
 */
export async function loadHeatmapSliceSqlite(timestamp: string): Promise<HeatmapPoint[]> {
  const database = ensureDb();

  try {
    const rows = database
      .prepare(
        `SELECT meter_id, value_kw, unit
         FROM heatmap_points
         WHERE ts = ?
         ORDER BY meter_id ASC`,
      )
      .all(timestamp) as Record<string, unknown>[];

    return rows.map((r) => ({
      meterId: r.meter_id as string,
      valueKw: toNumber(r.value_kw),
      unit: (r.unit as string) ?? 'kW',
    }));
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
