import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import readline from 'readline';

const DATA_DIR =
  process.env.SMDT_DATA_DIR ??
  (fs.existsSync(path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data'))
    ? path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data')
    : path.join(process.cwd(), 'data', 'smdt-sample'));
const CSV_DIR = path.join(DATA_DIR, 'DatenSM');
const CSV_HEATMAP_DIR = path.join(DATA_DIR, 'DatenSM_time');
const PG_URL = process.env.SMDT_PG_URL ?? 'postgres://epowweb:epowweb@localhost:5432/epowweb';
const BATCH_SIZE = 5000;

async function main() {
  const pool = new Pool({ connectionString: PG_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meter_readings (
      id BIGSERIAL PRIMARY KEY,
      meter_id TEXT NOT NULL,
      start_ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      end_ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      power_kw DOUBLE PRECISION NULL,
      power_original_kw DOUBLE PRECISION NULL,
      energy_kwh DOUBLE PRECISION NULL,
      energy_original_kwh DOUBLE PRECISION NULL,
      error_code INTEGER NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_time ON meter_readings (meter_id, start_ts);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_meter_readings_meter_start ON meter_readings (meter_id, start_ts);

    CREATE TABLE IF NOT EXISTS heatmap_points (
      id BIGSERIAL PRIMARY KEY,
      ts TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      meter_id TEXT NOT NULL,
      value_kw DOUBLE PRECISION NULL,
      unit TEXT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_heatmap_ts ON heatmap_points (ts);
    CREATE INDEX IF NOT EXISTS idx_heatmap_meter_ts ON heatmap_points (meter_id, ts);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_heatmap_ts_meter ON heatmap_points (ts, meter_id);
  `);

  const files = fs.readdirSync(CSV_DIR).filter((f) => f.endsWith('.csv'));
  for (const file of files) {
    const meterId = file.replace('.csv', '');
    const filePath = path.join(CSV_DIR, file);
    console.log(`Seeding meter ${meterId}...`);
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });
    let isHeader = true;
    const batch: Record<string, unknown>[] = [];
    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue;
      }
      if (!line.trim()) continue;
      const parts = line.split(';').map((s) => s.trim());
      const [start, end, powerOriginalKw, powerKw, energyOriginalKwh, energyKwh, errorCode] = parts;
      batch.push({
        meter_id: meterId,
        start_ts: start,
        end_ts: end,
        power_kw: num(powerKw),
        power_original_kw: num(powerOriginalKw),
        energy_kwh: num(energyKwh),
        energy_original_kwh: num(energyOriginalKwh),
        error_code: num(errorCode),
      });
      if (batch.length >= BATCH_SIZE) {
        await insertBatch(pool, batch);
        batch.length = 0;
      }
    }
    if (batch.length) await insertBatch(pool, batch);
  }

  if (fs.existsSync(CSV_HEATMAP_DIR)) {
    const heatmapFiles = fs.readdirSync(CSV_HEATMAP_DIR).filter((f) => f.startsWith('zw_'));
    for (const file of heatmapFiles) {
      const tsPart = file.replace('zw_', '').replace('.csv', '');
      const filePath = path.join(CSV_HEATMAP_DIR, file);
      console.log(`Seeding heatmap slice ${tsPart}...`);
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });
      const batch: Record<string, unknown>[] = [];
      for await (const line of rl) {
        if (!line.trim()) continue;
        const parts = line.split(';').map((s) => s.trim());
        const [ts, meterId, valueKw, unit] = parts;
        batch.push({
          ts: ts,
          meter_id: meterId,
          value_kw: num(valueKw),
          unit,
        });
        if (batch.length >= BATCH_SIZE) {
          await insertHeatmapBatch(pool, batch);
          batch.length = 0;
        }
      }
      if (batch.length) await insertHeatmapBatch(pool, batch);
    }
  }

  await pool.end();
  console.log('Done.');
}

async function insertBatch(pool: Pool, rows: Record<string, unknown>[]) {
  const values = rows
    .map(
      (_r, i) =>
        `($${i * 8 + 1},$${i * 8 + 2},$${i * 8 + 3},$${i * 8 + 4},$${i * 8 + 5},$${i * 8 + 6},$${i * 8 + 7},$${i * 8 + 8})`,
    )
    .join(',');
  const params = rows.flatMap((r) => [
    r.meter_id,
    r.start_ts,
    r.end_ts,
    r.power_kw,
    r.power_original_kw,
    r.energy_kwh,
    r.energy_original_kwh,
    r.error_code,
  ]);
  await pool.query(
    `INSERT INTO meter_readings
     (meter_id,start_ts,end_ts,power_kw,power_original_kw,energy_kwh,energy_original_kwh,error_code)
     VALUES ${values}
     ON CONFLICT (meter_id, start_ts) DO NOTHING`,
    params,
  );
}

async function insertHeatmapBatch(pool: Pool, rows: Record<string, unknown>[]) {
  const values = rows
    .map(
      (_r, i) =>
        `($${i * 4 + 1},$${i * 4 + 2},$${i * 4 + 3},$${i * 4 + 4})`,
    )
    .join(',');
  const params = rows.flatMap((r) => [r.ts, r.meter_id, r.value_kw, r.unit]);
  await pool.query(
    `INSERT INTO heatmap_points (ts, meter_id, value_kw, unit) VALUES ${values}
     ON CONFLICT (ts, meter_id) DO NOTHING`,
    params,
  );
}

function num(v: string | undefined) {
  if (!v) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
