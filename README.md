# ePowWeb (Next.js)

Next.js + Tailwind rebuild of the smdt-legacy frontend. It covers the KIT Campus North power grid (stations, buildings, meters, lines), interactive 2D/3D maps, legacy time-series visualizations, the heatmap endpoint, and Anemos weather layers.

## Quick start

```bash
npm install
docker compose up -d   # starts Postgres (epowweb/epowweb)
SMDT_PG_URL=postgres://epowweb:epowweb@localhost:5432/epowweb npm run pg:seed
npm run dev            # open http://localhost:3000
```

### Environment

The server auto-selects the richest dataset available:

1) `SMDT_DATA_DIR` / `SMDT_CONFIG_FILE` if set.
2) Fallback to `../smdt-legacy/backend/data` + `../smdt-legacy/backend/config/KIT_CN.xml` if they exist (full legacy coverage).
3) Otherwise use the bundled sample data under `./data/smdt-sample` + `./data/smdt-config/KIT_CN.xml`.

- `SMDT_PG_URL` turns on Postgres-backed series/heatmap lookups (Docker compose uses the same URL as above).
- Optional legacy hooks (currently unused by the UI): `NEXT_PUBLIC_BACKEND_BASE`, `NEXT_PUBLIC_HEATMAP_BASE`, `NEXT_PUBLIC_ANEMOS_BASE`.

### Data

- Grid data lives in `src/data/legacy-grid.json`, converted from the original `data/legacy/KITCN.geojson` (run `npm run legacy:data` to regenerate).
- Power data: seed Postgres from `DatenSM`/`DatenSM_time` via `npm run pg:seed` (reads from `SMDT_DATA_DIR` or the bundled sample dir). It dedupes and is safe to rerun.
- Config in `data/smdt-config/KIT_CN.xml`. Point `SMDT_CONFIG_FILE` at a different XML if needed.
- If `SMDT_PG_URL` is not set, the APIs fall back to CSV reads from `SMDT_DATA_DIR`.

### What’s inside

- **2D campus map** (MapLibre) with base-style toggles, line + station overlays, and click-to-open visualization links.
- **Live data lookup** for stations/buildings/meters with inline visualizations powered by the new TypeScript APIs.
- **3D map** (deck.gl + MapLibre) extruding stations and cables.
- **Heatmap explorer** reading from Postgres when available (or the `DatenSM_time` CSVs).
- **Anemos weather preview** (radiation/wind/temperature) with launch links.
- **TypeScript backend APIs** under `/api` that read the original `DatenSM` CSVs:
  - `/api/meters/:id/series` (per-meter time-series)
  - `/api/buildings/:id/series` and `/api/stations/:id/series` (aggregated sums based on `KIT_CN.xml`)
  - `/api/heatmap?timestamp=...` (power slice from `DatenSM_time`)
- Legacy URLs like `/rest/eASiMOV/visualization/:id` redirect to the new in-app visualization pages.

### Checks

```bash
npm run lint
```
