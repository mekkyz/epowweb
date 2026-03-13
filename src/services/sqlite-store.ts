import fs from "fs";
import { MeterReading, SeriesBounds, SeriesOptions, StationHeatmapRow } from "@/types/smdt";
import { dbLogger } from "@/lib/logger";
import { queryAll, queryGet } from "@/services/sqlite-async";

let dbPath: string | null = null;

export function hasSqlite(): boolean {
  if (dbPath) return true;

  const candidate = process.env.SMDT_SQLITE_PATH ?? "./data/smdt.db";

  if (!fs.existsSync(candidate)) return false;

  dbPath = candidate;
  dbLogger.info("SQLite database found", { path: dbPath });

  return true;
}

function getDbPath(): string {
  if (!hasSqlite()) {
    throw new Error("SQLite database not available");
  }

  return dbPath!;
}

export async function loadMeterSeriesSqlite(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  const path = getDbPath();
  const params: (string | number)[] = [meterId];
  let where = "WHERE meter_id = ?";

  if (options.start) {
    params.push(options.start);
    where += " AND start_ts >= ?";
  }
  if (options.end) {
    params.push(options.end);
    where += " AND end_ts <= ?";
  }

  const limit = options.limit ?? 2000;

  params.push(limit);

  try {
    const rows = (await queryAll(
      path,
      `SELECT start_ts, end_ts, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code
       FROM meter_readings
       ${where}
       ORDER BY start_ts ASC
       LIMIT ?`,
      params,
    )) as Record<string, unknown>[];

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
    dbLogger.error("Failed to load meter series from SQLite", error, { meterId });
    throw error;
  }
}

export async function loadAggregatedSeriesSqlite(
  meterIds: string[],
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  if (meterIds.length === 0) return [];

  const path = getDbPath();
  const placeholders = meterIds.map(() => "?").join(",");
  const params: (string | number)[] = [...meterIds];
  let extraWhere = "";

  if (options.start) {
    params.push(options.start);
    extraWhere += " AND start_ts >= ?";
  }
  if (options.end) {
    params.push(options.end);
    extraWhere += " AND end_ts <= ?";
  }

  const limit = options.limit ?? 2000;

  params.push(limit);

  try {
    const rows = (await queryAll(
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
    )) as Record<string, unknown>[];

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
    dbLogger.error("Failed to load aggregated series from SQLite", error, {
      meterCount: meterIds.length,
    });
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
      const row = (await queryGet(
        path,
        `SELECT MIN(start_ts) AS s, MAX(end_ts) AS e FROM meter_readings WHERE meter_id = ?`,
        [id],
      )) as { s: string | null; e: string | null };

      if (row.s && (!minStart || row.s < minStart)) minStart = row.s;
      if (row.e && (!maxEnd || row.e > maxEnd)) maxEnd = row.e;
    }

    return { start: minStart, end: maxEnd };
  } catch (error) {
    dbLogger.error("Failed to get bounds from SQLite", error);
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
    const rows = (await queryAll(
      path,
      `WITH RECURSIVE date_walk(ts) AS (
         SELECT MIN(ts) FROM station_heatmap
         UNION ALL
         SELECT (SELECT MIN(sh.ts) FROM station_heatmap sh
                 WHERE sh.ts > substr(date_walk.ts, 1, 10) || ' 23:59:59')
         FROM date_walk WHERE ts IS NOT NULL
       )
       SELECT substr(ts, 1, 10) AS date FROM date_walk WHERE ts IS NOT NULL`,
    )) as { date: string }[];

    cachedDates = rows.map((r) => r.date);

    return cachedDates;
  } catch (error) {
    dbLogger.error("Failed to list heatmap dates from SQLite", error);
    throw error;
  }
}

/**
 * Lists timestamps for a specific date (e.g. "2016-01-15").
 */
export async function listDayTimestampsSqlite(date: string): Promise<string[]> {
  const path = getDbPath();

  try {
    const rows = (await queryAll(
      path,
      `SELECT DISTINCT ts
       FROM station_heatmap
       WHERE ts >= ? AND ts <= ?
       ORDER BY ts ASC`,
      [`${date} 00:00:00`, `${date} 23:59:59`],
    )) as { ts: string }[];

    return rows.map((r) => r.ts);
  } catch (error) {
    dbLogger.error("Failed to list day timestamps from SQLite", error, { date });
    throw error;
  }
}

/**
 * Gets heatmap timestamp bounds (uses index min/max)
 */
export async function getHeatmapBoundsSqlite(): Promise<{
  min: string | null;
  max: string | null;
  count: number;
}> {
  const path = getDbPath();

  try {
    const minRow = (await queryGet(path, `SELECT MIN(ts) AS ts FROM station_heatmap`)) as {
      ts: string | null;
    };
    const maxRow = (await queryGet(path, `SELECT MAX(ts) AS ts FROM station_heatmap`)) as {
      ts: string | null;
    };

    return { min: minRow.ts, max: maxRow.ts, count: 0 };
  } catch (error) {
    dbLogger.error("Failed to get heatmap bounds from SQLite", error);
    throw error;
  }
}

/**
 * Gets the nearest heatmap timestamp to a given target (for stepping)
 */
export async function getNeighborTimestampSqlite(
  current: string,
  direction: "prev" | "next",
): Promise<string | null> {
  const path = getDbPath();

  try {
    const op = direction === "next" ? ">" : "<";
    const order = direction === "next" ? "ASC" : "DESC";
    const row = (await queryGet(
      path,
      `SELECT DISTINCT ts FROM station_heatmap WHERE ts ${op} ? ORDER BY ts ${order} LIMIT 1`,
      [current],
    )) as { ts: string } | undefined;

    return row?.ts ?? null;
  } catch (error) {
    dbLogger.error("Failed to get neighbor timestamp from SQLite", error);
    throw error;
  }
}

// --- Pre-aggregated station heatmap (from station_heatmap table) ---
const stationSliceCache = new Map<string, StationHeatmapRow[]>();
const STATION_CACHE_MAX = 200;

/**
 * Loads pre-aggregated station-level heatmap data for a timestamp.
 * Uses the station_heatmap table (populated at seed time) — no runtime aggregation needed.
 */
export async function loadStationHeatmapSqlite(timestamp: string): Promise<StationHeatmapRow[]> {
  const cached = stationSliceCache.get(timestamp);

  if (cached) {
    stationSliceCache.delete(timestamp);
    stationSliceCache.set(timestamp, cached);

    return cached;
  }

  const p = getDbPath();

  try {
    const rows = (await queryAll(
      p,
      `SELECT station_id, total_kw, meter_count
       FROM station_heatmap
       WHERE ts = ?
       ORDER BY station_id ASC`,
      [timestamp],
    )) as Record<string, unknown>[];

    const result = rows.map((r) => ({
      stationId: r.station_id as string,
      totalKw: Number(r.total_kw) || 0,
      meterCount: Number(r.meter_count) || 0,
    }));

    if (stationSliceCache.size >= STATION_CACHE_MAX) {
      const oldest = stationSliceCache.keys().next().value;

      if (oldest) stationSliceCache.delete(oldest);
    }
    stationSliceCache.set(timestamp, result);

    return result;
  } catch (error) {
    dbLogger.error("Failed to load station heatmap from SQLite", error, { timestamp });
    throw error;
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);

  return Number.isFinite(num) ? num : null;
}
