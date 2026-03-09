import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import readline from 'readline';
import { XMLParser } from 'fast-xml-parser';

const DATA_DIR =
  process.env.SMDT_DATA_DIR ??
  (fs.existsSync(path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data'))
    ? path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'data')
    : path.join(process.cwd(), 'data', 'smdt-sample'));
const CSV_DIR = path.join(DATA_DIR, 'DatenSM');
const CSV_HEATMAP_DIR = path.join(DATA_DIR, 'DatenSM_time');
const DB_PATH = process.env.SMDT_SQLITE_PATH ?? path.join(process.cwd(), 'data', 'smdt.db');

const CONFIG_FILE =
  process.env.SMDT_CONFIG_FILE ??
  (fs.existsSync(path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'config', 'KIT_CN.xml'))
    ? path.join(process.cwd(), '..', 'smdt-legacy', 'backend', 'config', 'KIT_CN.xml')
    : path.join(process.cwd(), 'data', 'smdt-config', 'KIT_CN.xml'));

// --- XML config parsing (meter → station mapping) ---

type XmlMeter = { name: string };
type XmlGroup = { name: string; type?: string; group?: XmlGroup | XmlGroup[]; meter?: XmlMeter | XmlMeter[] };

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseMeterStationMap(configFile: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(configFile)) {
    console.warn(`Config file not found: ${configFile} — station_heatmap will be empty`);
    return map;
  }

  const xml = fs.readFileSync(configFile, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true });
  const parsed = parser.parse(xml);

  function walk(group: XmlGroup, stationId?: string) {
    if (group.type === 'Station') {
      ensureArray(group.group).forEach((child) => walk(child, group.name));
      return;
    }
    if (group.type === 'Gebaeude') {
      ensureArray(group.meter).forEach((m) => {
        if (stationId) map.set(m.name, stationId);
      });
      return;
    }
    ensureArray(group.group).forEach((child) => walk(child, stationId));
  }

  const rootGroups = ensureArray(parsed?.xml?.group ?? parsed?.config?.group ?? parsed?.group);
  rootGroups.forEach((g) => walk(g));

  console.log(`Loaded ${map.size} meter→station mappings from config`);
  return map;
}

// --- Main ---

const APPEND_MODE = process.argv.includes('--append');

async function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  if (APPEND_MODE) {
    console.log('Mode: append (keeping existing data)');
  } else {
    console.log('Mode: full seed (recreating DB)');
    if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  }

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

    CREATE TABLE IF NOT EXISTS station_heatmap (
      ts TEXT NOT NULL,
      station_id TEXT NOT NULL,
      total_kw REAL NOT NULL,
      meter_count INTEGER NOT NULL,
      PRIMARY KEY (ts, station_id)
    );
    CREATE INDEX IF NOT EXISTS idx_station_heatmap_ts ON station_heatmap (ts);
  `);

  const insertMeter = db.prepare(`
    INSERT OR IGNORE INTO meter_readings
    (meter_id, start_ts, end_ts, power_kw, power_original_kw, energy_kwh, energy_original_kwh, error_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // --- Seed meter readings ---
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

  // --- Aggregate heatmap CSVs directly into station_heatmap (in-memory) ---
  console.log('Aggregating heatmap CSVs by station (in-memory)...');

  const meterStationMap = parseMeterStationMap(CONFIG_FILE);

  const insertStation = db.prepare(`
    INSERT OR REPLACE INTO station_heatmap (ts, station_id, total_kw, meter_count)
    VALUES (?, ?, ?, ?)
  `);

  if (fs.existsSync(CSV_HEATMAP_DIR)) {
    // In-memory accumulator: key = "ts\0stationId", value = { totalKw, count }
    const agg = new Map<string, { totalKw: number; count: number }>();

    const heatmapFiles = fs.readdirSync(CSV_HEATMAP_DIR).filter((f) => f.startsWith('zw_'));
    let fileIdx = 0;
    for (const file of heatmapFiles) {
      fileIdx++;
      if (fileIdx % 1000 === 0) {
        console.log(`  Processing heatmap file ${fileIdx}/${heatmapFiles.length}...`);
      }

      const filePath = path.join(CSV_HEATMAP_DIR, file);
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;
        const parts = line.split(';').map((s) => s.trim());
        const [ts, meterId, valueKw] = parts;

        const stationId = meterStationMap.get(meterId);
        if (!stationId) continue;

        const key = `${ts}\0${stationId}`;
        const entry = agg.get(key);
        const val = num(valueKw) ?? 0;
        if (!entry) {
          agg.set(key, { totalKw: val, count: 1 });
        } else {
          entry.totalKw += val;
          entry.count += 1;
        }
      }
    }

    // Flush aggregated data to SQLite in batches
    console.log(`  Writing ${agg.size} aggregated rows to station_heatmap...`);
    const batch: [string, string, number, number][] = [];
    for (const [key, val] of agg) {
      const idx = key.indexOf('\0');
      batch.push([key.slice(0, idx), key.slice(idx + 1), val.totalKw, val.count]);

      if (batch.length >= 5000) {
        const tx = db.transaction((rows: [string, string, number, number][]) => {
          for (const row of rows) insertStation.run(...row);
        });
        tx(batch);
        batch.length = 0;
      }
    }
    if (batch.length) {
      const tx = db.transaction((rows: [string, string, number, number][]) => {
        for (const row of rows) insertStation.run(...row);
      });
      tx(batch);
    }
    agg.clear();
  }

  const aggCount = db.prepare(`SELECT COUNT(*) AS cnt FROM station_heatmap`).get() as { cnt: number };
  const tsCount = db.prepare(`SELECT COUNT(DISTINCT ts) AS cnt FROM station_heatmap`).get() as { cnt: number };
  console.log(`  Pre-aggregated: ${aggCount.cnt} rows (${tsCount.cnt} timestamps × stations)`);

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
