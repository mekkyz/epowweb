import { Pool } from 'pg';
import { SeriesOptions, SeriesBounds, MeterReading } from '@/server/smdt-data';
import { HeatmapPoint } from '@/types/smdt';

let pool: Pool | null = null;

export function hasPg() {
  if (pool) return true;
  const url = process.env.SMDT_PG_URL;
  if (!url) return false;
  pool = new Pool({ connectionString: url });
  return true;
}

async function ensurePool() {
  if (!hasPg()) throw new Error('SMDT_PG_URL not configured');
  return pool!;
}

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
}

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
}

export async function getBoundsPg(meterIds: string[]): Promise<SeriesBounds> {
  if (meterIds.length === 0) return {};
  const db = await ensurePool();
  const res = await db.query(
    `SELECT MIN(start_ts) as start, MAX(end_ts) as end FROM meter_readings WHERE meter_id = ANY($1::text[])`,
    [meterIds],
  );
  const row = res.rows[0];
  return { start: row?.start ?? undefined, end: row?.end ?? undefined };
}

export async function listHeatmapTimestampsPg(): Promise<string[]> {
  const db = await ensurePool();
  const res = await db.query(
    `SELECT to_char(ts, 'YYYY-MM-DD HH24:MI:SS') as ts
     FROM heatmap_points
     GROUP BY ts
     ORDER BY ts ASC`,
  );
  return res.rows.map((r) => r.ts as string);
}

export async function loadHeatmapSlicePg(timestamp: string): Promise<HeatmapPoint[]> {
  const db = await ensurePool();
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
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
