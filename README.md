# SMDT (Next.js)

Next.js + Tailwind rebuild of the smdt-legacy frontend. It covers the KIT Campus North power grid (stations, buildings, meters, lines), interactive 2D/3D maps, legacy time-series visualizations, and the heatmap endpoint.

## Quick start

```bash
npm install
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed   # creates data/smdt.db
npm run dev            # open http://localhost:3000
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `SMDT_DATA_DIR` | *(required for seeding)* | CSV data dir for `npm run db:seed` |
| `SMDT_CONFIG_FILE` | `./data/meter-mapping.xml` | Meter-station mapping XML |
| `SMDT_SQLITE_PATH` | `./data/smdt.db` | SQLite database path |

### Data

- Grid topology in `src/config/grid-data.json` (stations, lines, buildings, meters as GeoJSON).
- Power data: seed SQLite via `SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed`.
- Meter-station mapping in `data/meter-mapping.xml`. Override with `SMDT_CONFIG_FILE` if needed.

### What's inside

- **2D campus map** (MapLibre) with base-style toggles, line + station overlays, and click-to-open visualization links.
- **Live data lookup** for stations/buildings/meters with inline visualizations powered by the new TypeScript APIs.
- **3D map** (deck.gl + MapLibre) extruding stations and cables.
- **Heatmap explorer** reading from SQLite.
- **TypeScript backend APIs** under `/api` backed by SQLite:
  - `/api/meters/:id/series` (per-meter time-series)
  - `/api/buildings/:id/series` and `/api/stations/:id/series` (aggregated sums based on `meter-mapping.xml`)
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
