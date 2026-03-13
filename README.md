# ePowMon

KIT Campus North power grid (stations, buildings, meters, lines), interactive 2D/3D maps and heatmap.

## Features

- 2D campus map (MapLibre) with base-style toggles, line + station overlays
- 3D map (deck.gl + MapLibre) extruding stations and cables
- Data lookup for stations/buildings/meters with inline visualizations
- Heatmap explorer reading from SQLite
- TypeScript backend APIs under `/api` backed by SQLite

## Tech Stack

- Next.js (standalone output)
- React and TypeScript
- Tailwind with MapLibre and deck.gl
- SQLite (better-sqlite3)
- Docker

## Environment

| Variable           | Default                    | Purpose                            |
| ------------------ | -------------------------- | ---------------------------------- |
| `SMDT_DATA_DIR`    | _(required for seeding)_   | CSV data dir for `npm run db:seed` |
| `SMDT_CONFIG_FILE` | `./data/meter-mapping.xml` | Meter-station mapping XML          |
| `SMDT_SQLITE_PATH` | `./data/smdt.db`           | SQLite database path               |

## Deployment

### Docker

Multi-stage Docker build -> standalone mode -> non-root user -> port 3000

### Kubernetes

`esa` namespace on the IAI cluster via ArgoCD.

- **Deployment** - single container with SQLite on a PVC (`smdt-data`, 20Gi) mounted at `/data`
- **Service** - routing port 80 -> port 3000 on container
- **Ingress** - traefik with TLS
- **Certificate** — Let's Encrypt

Database updates: see [DATABASE.md](DATABASE.md) for the full seed/upload procedure.

## License

This software may not be used, copied, modified, or distributed without explicit written permission from the author.

## Author

[mekky@kit.edu](mailto:mekky@kit.edu)
