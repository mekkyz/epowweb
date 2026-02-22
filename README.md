# SMDT (Next.js)

Next.js + Tailwind rebuild of the smdt-legacy frontend. It covers the KIT Campus North power grid (stations, buildings, meters, lines), interactive 2D/3D maps, legacy time-series visualizations, and the heatmap endpoint.

## Quick start

```bash
npm install
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed   # creates data/smdt.db
npm run dev            # open http://localhost:3000
```

### Environment

The server auto-selects the richest dataset available:

1) `SMDT_DATA_DIR` / `SMDT_CONFIG_FILE` if set.
2) Fallback to `../smdt-legacy/backend/data` + `../smdt-legacy/backend/config/KIT_CN.xml` if they exist (full legacy coverage).
3) Otherwise use the bundled sample data under `./data/smdt-sample` + `./data/smdt-config/KIT_CN.xml`.

- When `data/smdt.db` exists (or `SMDT_SQLITE_PATH` points to a DB file), all series/heatmap APIs use SQLite. The CSV fallback is only used if the DB is missing.
- Optional legacy hooks (currently unused by the UI): `NEXT_PUBLIC_BACKEND_BASE`, `NEXT_PUBLIC_HEATMAP_BASE`.

### Data

- Grid data lives in `src/config/legacy-grid.json`, converted from the original `data/legacy/KITCN.geojson` (run `npm run legacy:data` to regenerate).
- Power data: seed SQLite from `DatenSM`/`DatenSM_time` via `npm run db:seed` (reads from `SMDT_DATA_DIR` or the bundled sample dir). It recreates the DB from scratch and is safe to rerun.
- Config in `data/smdt-config/KIT_CN.xml`. Point `SMDT_CONFIG_FILE` at a different XML if needed.
- If the SQLite DB is missing, the APIs fall back to CSV reads from `SMDT_DATA_DIR`.

### What’s inside

- **2D campus map** (MapLibre) with base-style toggles, line + station overlays, and click-to-open visualization links.
- **Live data lookup** for stations/buildings/meters with inline visualizations powered by the new TypeScript APIs.
- **3D map** (deck.gl + MapLibre) extruding stations and cables.
- **Heatmap explorer** reading from SQLite when available (or the `DatenSM_time` CSVs).
- **TypeScript backend APIs** under `/api` backed by SQLite (with CSV fallback):
  - `/api/meters/:id/series` (per-meter time-series)
  - `/api/buildings/:id/series` and `/api/stations/:id/series` (aggregated sums based on `KIT_CN.xml`)
  - `/api/heatmap/init`, `/api/heatmap/geo?timestamp=...`, `/api/heatmap/step` (heatmap navigation)
- Legacy URLs like `/rest/eASiMOV/visualization/:id` redirect to the new in-app visualization pages.

### Kubernetes deployment

The app runs as a single container. The SQLite database lives on a PVC (`smdt-data`, 20Gi) mounted at `/data`.

#### Code-only changes (no new data)

Rebuild and push the image, then restart:

```bash
docker build -t iai-artifactory.222.2.2:5000/2222/smdt:latest .
docker push iai-artifactory.222.2.2:5000/2222/smdt:latest
kubectl rollout restart deployment/smdt -n esa
```

#### Database update (new CSV data)

See [DATABASE.md](DATABASE.md) for the full procedure (seed locally, compress, chunk-upload to the pod, decompress).

### Checks

```bash
npm run lint
```
