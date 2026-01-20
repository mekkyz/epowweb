## Postgres setup (full data)

Use the included Docker Compose and seed script to load the full legacy CSVs into Postgres and make the app read from it by default.

### 1) Start Postgres
```bash
cd epowweb
docker compose up -d
# DB URL (used below): postgres://epowweb:epowweb@localhost:5432/epowweb
```

### 2) Seed the DB from the full CSVs
- Point `SMDT_DATA_DIR` at the full legacy data (`../smdt-legacy/backend/data`).
- Run the seed script; it is safe to rerun (dedupes via unique indexes).
```bash
SMDT_DATA_DIR=../smdt-legacy/backend/data \
SMDT_PG_URL=postgres://epowweb:epowweb@localhost:5432/epowweb \
npm run pg:seed
```

### 3) Run the app using Postgres
- Ensure `.env.local` (or your shell) sets `SMDT_PG_URL`.
```bash
SMDT_PG_URL=postgres://epowweb:epowweb@localhost:5432/epowweb npm run dev
# or set it in .env.local:
# SMDT_PG_URL=postgres://epowweb:epowweb@localhost:5432/epowweb
```
- When `SMDT_PG_URL` is set, all series/heatmap APIs prefer Postgres; the CSV fallback is only used if PG is missing.

### Notes
- Seed script path: `scripts/seed-pg.ts` (runs via `npm run pg:seed`).
- Data/config auto-discovery: if `SMDT_DATA_DIR`/`SMDT_CONFIG_FILE` are unset, the app will try `../smdt-legacy/backend/data` and `../smdt-legacy/backend/config/KIT_CN.xml`; otherwise it falls back to the bundled samples under `data/smdt-sample` and `data/smdt-config`.
- Tables created: `meter_readings` and `heatmap_points` (unique indexes prevent duplicates).

