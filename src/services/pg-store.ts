import { Pool } from 'pg';
import { SeriesOptions, SeriesBounds, MeterReading } from '@/services/smdt-data';
import { HeatmapPoint } from '@/types/smdt';
import { dbLogger } from '@/lib/logger';

let pool: Pool | null = null;

/**
 * Checks if PostgreSQL connection is available and initializes the pool if needed
 */
export function hasPg(): boolean {
  if (pool) return true;
  
  const url = process.env.SMDT_PG_URL;
  if (!url) return false;
  
  try {
    pool = new Pool({ connectionString: url });
    dbLogger.info('PostgreSQL connection pool initialized');
    return true;
  } catch (error) {
    dbLogger.error('Failed to initialize PostgreSQL pool', error);
    return false;
  }
}

/**
 * Ensures the pool is available, throws if not configured
 */
async function ensurePool(): Promise<Pool> {
  if (!hasPg()) {
    throw new Error('SMDT_PG_URL not configured');
  }
  return pool!;
}

/**
 * Loads time series data for a specific meter from PostgreSQL
 */
export async function loadMeterSeriesPg(
  meterId: string,
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  const db = await ensurePool();
  const params: (string | number | null)[] = [meterId];
  let where = 'WHERE meter_id = $1';
  
  if (options.start) {
    params.push(options.start);
    where += ` AND start_ts >= $${params.length}`;
  }
  if (options.end) {
    params.push(options.end);
    where += ` AND end_ts <= $${params.length}`;
  }
  
  const limit = options.limit ?? 2000;
  params.push(limit);
  
  try {
    const res = await db.query(
      `SELECT start_ts as start, end_ts as end, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code
       FROM meter_readings
       ${where}
       ORDER BY start_ts ASC
       LIMIT $${params.length}`,
      params,
    );
    
    return res.rows.map((r) => ({
      start: r.start,
      end: r.end,
      powerKw: toNumber(r.power_kw),
      powerOriginalKw: toNumber(r.power_original_kw),
      energyKwh: toNumber(r.energy_kwh),
      energyOriginalKwh: toNumber(r.energy_original_kwh),
      errorCode: toNumber(r.error_code),
    }));
  } catch (error) {
    dbLogger.error('Failed to load meter series from PostgreSQL', error, { meterId });
    throw error;
  }
}

/**
 * Loads aggregated time series data for multiple meters from PostgreSQL
 */
export async function loadAggregatedSeriesPg(
  meterIds: string[],
  options: SeriesOptions = {},
): Promise<MeterReading[]> {
  if (meterIds.length === 0) return [];
  
  const db = await ensurePool();
  const params: (string | number | null | string[])[] = [meterIds];
  let where = `WHERE meter_id = ANY($1::text[])`;
  
  if (options.start) {
    params.push(options.start);
    where += ` AND start_ts >= $${params.length}`;
  }
  if (options.end) {
    params.push(options.end);
    where += ` AND end_ts <= $${params.length}`;
  }
  
  const limit = options.limit ?? 2000;
  params.push(limit);
  
  try {
    const res = await db.query(
      `SELECT start_ts as start, end_ts as end,
              SUM(power_kw) as power_kw,
              SUM(power_original_kw) as power_original_kw,
              SUM(energy_kwh) as energy_kwh,
              SUM(energy_original_kwh) as energy_original_kwh,
              MAX(error_code) as error_code
       FROM meter_readings
       ${where}
       GROUP BY start_ts, end_ts
       ORDER BY start_ts ASC
       LIMIT $${params.length}`,
      params,
    );
    
    return res.rows.map((r) => ({
      start: r.start,
      end: r.end,
      powerKw: toNumber(r.power_kw),
      powerOriginalKw: toNumber(r.power_original_kw),
      energyKwh: toNumber(r.energy_kwh),
      energyOriginalKwh: toNumber(r.energy_original_kwh),
      errorCode: toNumber(r.error_code),
    }));
  } catch (error) {
    dbLogger.error('Failed to load aggregated series from PostgreSQL', error, { meterCount: meterIds.length });
    throw error;
  }
}

/**
 * Gets the time bounds (min start, max end) for a set of meters
 */
export async function getBoundsPg(meterIds: string[]): Promise<SeriesBounds> {
  if (meterIds.length === 0) return {};
  
  const db = await ensurePool();
  
  try {
    const res = await db.query(
      `SELECT MIN(start_ts) as start, MAX(end_ts) as end FROM meter_readings WHERE meter_id = ANY($1::text[])`,
      [meterIds],
    );
    
    const row = res.rows[0];
    return { start: row?.start ?? undefined, end: row?.end ?? undefined };
  } catch (error) {
    dbLogger.error('Failed to get bounds from PostgreSQL', error);
    throw error;
  }
}

/**
 * Lists all available heatmap timestamps from PostgreSQL
 */
export async function listHeatmapTimestampsPg(): Promise<string[]> {
  const db = await ensurePool();
  
  try {
    const res = await db.query(
      `SELECT to_char(ts, 'YYYY-MM-DD HH24:MI:SS') as ts
       FROM heatmap_points
       GROUP BY ts
       ORDER BY ts ASC`,
    );
    
    return res.rows.map((r) => r.ts as string);
  } catch (error) {
    dbLogger.error('Failed to list heatmap timestamps from PostgreSQL', error);
    throw error;
  }
}

/**
 * Loads a heatmap slice for a specific timestamp from PostgreSQL
 */
export async function loadHeatmapSlicePg(timestamp: string): Promise<HeatmapPoint[]> {
  const db = await ensurePool();
  
  try {
    const res = await db.query(
      `SELECT meter_id, value_kw, unit
       FROM heatmap_points
       WHERE ts = $1
       ORDER BY meter_id ASC`,
      [timestamp],
    );
    
    return res.rows.map((r) => ({
      meterId: r.meter_id,
      valueKw: toNumber(r.value_kw),
      unit: r.unit ?? 'kW',
    }));
  } catch (error) {
    dbLogger.error('Failed to load heatmap slice from PostgreSQL', error, { timestamp });
    throw error;
  }
}

// =============================================================================
// Private Helper Functions
// =============================================================================

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
