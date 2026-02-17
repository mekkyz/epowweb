import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import readline from 'readline';

const DATA_DIR =
  process.env.SMDT_DATA_DIR ??
  (fs.existsSync(path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data'))
    ? path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data')
    : path.join(process.cwd(), 'data', 'smdt-sample'));
const CSV_DIR = path.join(DATA_DIR, 'DatenSM');
const CSV_HEATMAP_DIR = path.join(DATA_DIR, 'DatenSM_time');
const DB_PATH = process.env.SMDT_SQLITE_PATH ?? path.join(process.cwd(), 'data', 'smdt.db');

async function main() {
  // ensure output directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  // remove existing DB to start fresh
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meter_id TEXT NOT NULL,
      start_ts TEXT NOT NULL,
      end_ts TEXT NOT NULL,
      power_kw REAL,
      power_original_kw REAL,
      energy_kwh REAL,
      energy_original_kwh REAL,
      error_code INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_time ON meter_readings (meter_id, start_ts);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_meter_readings_meter_start ON meter_readings (meter_id, start_ts);

    CREATE TABLE IF NOT EXISTS heatmap_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      meter_id TEXT NOT NULL,
      value_kw REAL,
      unit TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_heatmap_ts ON heatmap_points (ts);
    CREATE INDEX IF NOT EXISTS idx_heatmap_meter_ts ON heatmap_points (meter_id, ts);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_heatmap_ts_meter ON heatmap_points (ts, meter_id);
  `);

  const insertMeter = db.prepare(`
    INSERT OR IGNORE INTO meter_readings
    (meter_id, start_ts, end_ts, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHeatmap = db.prepare(`
    INSERT OR IGNORE INTO heatmap_points (ts, meter_id, value_kw, unit)
    VALUES (?, ?, ?, ?)
  `);

  // seed meter readings
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
    const batch: unknown[][] = [];

    for await (const line of rl) {
      if (isHeader) {
        isHeader = false;
        continue;
      }
      if (!line.trim()) continue;

      const parts = line.split(';').map((s) => s.trim());
      const [start, end, powerOriginalKw, powerKw, energyOriginalKwh, energyKwh, errorCode] = parts;

      batch.push([meterId, start, end, num(powerKw), num(powerOriginalKw), num(energyKwh), num(energyOriginalKwh), num(errorCode)]);

      if (batch.length >= 5000) {
        const tx = db.transaction((rows: unknown[][]) => {
          for (const row of rows) insertMeter.run(...row);
        });
        tx(batch);
        batch.length = 0;
      }
    }

    if (batch.length) {
      const tx = db.transaction((rows: unknown[][]) => {
        for (const row of rows) insertMeter.run(...row);
      });
      tx(batch);
    }
  }

  // seed heatmap points
  if (fs.existsSync(CSV_HEATMAP_DIR)) {
    const heatmapFiles = fs.readdirSync(CSV_HEATMAP_DIR).filter((f) => f.startsWith('zw_'));
    for (const file of heatmapFiles) {
      const filePath = path.join(CSV_HEATMAP_DIR, file);
      console.log(`Seeding heatmap slice ${file}...`);

      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      const batch: unknown[][] = [];

      for await (const line of rl) {
        if (!line.trim()) continue;
        const parts = line.split(';').map((s) => s.trim());
        const [ts, meterId, valueKw, unit] = parts;

        batch.push([ts, meterId, num(valueKw), unit]);

        if (batch.length >= 5000) {
          const tx = db.transaction((rows: unknown[][]) => {
            for (const row of rows) insertHeatmap.run(...row);
          });
          tx(batch);
          batch.length = 0;
        }
      }

      if (batch.length) {
        const tx = db.transaction((rows: unknown[][]) => {
          for (const row of rows) insertHeatmap.run(...row);
        });
        tx(batch);
      }
    }
  }

  db.close();
  const stats = fs.statSync(DB_PATH);
  console.log(`Done. Database: ${DB_PATH} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
}

function num(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
