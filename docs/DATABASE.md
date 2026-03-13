## SQLite setup (full data)

The app uses SQLite for meter readings and heatmap data. The database is generated locally from CSV files and uploaded to the k8s volume. **SQLite is always required** — there is no CSV fallback at runtime.

### Database schema

Two tables:

| Table | Description | Rows (1 year) |
|-------|-------------|---------------|
| `meter_readings` | Raw 15-min meter data (power, energy) per meter | ~21.5M |
| `station_heatmap` | **Pre-aggregated** station-level totals per timestamp | ~1.3M |

The `station_heatmap` table is the key optimization: instead of storing ~614 meter rows per timestamp and aggregating at runtime, the seed script pre-aggregates them into ~37 station rows per timestamp directly from CSV. This is a **16x reduction** in query size and eliminates the need for an intermediate `heatmap_points` table entirely.

### Seed the DB locally

Point `SMDT_DATA_DIR` at the full legacy CSV data and run the seed script:

```bash
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed
```

This creates `data/smdt.db` with two tables: `meter_readings` and `station_heatmap`. It is safe to rerun (the script recreates the DB from scratch).

The seed script also reads `data/meter-mapping.xml` (or `SMDT_CONFIG_FILE` if set) to build the meter-to-station mapping used for in-memory aggregation.

### Run the app locally

```bash
npm run dev
```

The app requires `data/smdt.db` to exist. If it's missing, seed it first.

### Upload DB to k8s

The DB file (~3.8 GB) can be compressed and split for transfer:

```bash
# 1. Compress the DB
gzip -k -1 data/smdt.db

# 2. Split into 200MB chunks
split -b 200M data/smdt.db.gz data/smdt.db.gz.part-

# 3. Copy each chunk to the pod
for f in data/smdt.db.gz.part-*; do
  echo "Copying $f..."
  kubectl cp "$f" <pod-name>:/data/$(basename "$f") -n esa
done

# 4. Reassemble and decompress on the pod
kubectl exec <pod-name> -n esa -- sh -c 'cat /data/smdt.db.gz.part-* > /data/smdt.db.gz && rm /data/smdt.db.gz.part-* && gunzip /data/smdt.db.gz'

# 5. Restart the pod so it reopens the DB
kubectl rollout restart deployment/smdt -n esa
```

**Important:** The PVC needs enough space for both the .gz (~0.7 GB) and the .db (~3.8 GB) temporarily during decompression.

### Update the database

When you have new CSV data and want to update the deployed database:

```bash
# 1. Reseed locally
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed

# 2. Compress and split
gzip -k -1 data/smdt.db
split -b 200M data/smdt.db.gz data/smdt.db.gz.part-

# 3. Remove old DB on the pod
kubectl exec <pod-name> -n esa -- rm -f /data/smdt.db

# 4. Upload chunks
for f in data/smdt.db.gz.part-*; do
  echo "Copying $f..."
  kubectl cp "$f" <pod-name>:/data/$(basename "$f") -n esa
done

# 5. Reassemble and decompress
kubectl exec <pod-name> -n esa -- sh -c 'cat /data/smdt.db.gz.part-* > /data/smdt.db.gz && rm /data/smdt.db.gz.part-* && gunzip /data/smdt.db.gz'

# 6. Restart
kubectl rollout restart deployment/smdt -n esa
```

### Adding new years of CSV data

The dataset is currently 2016 only. To add more years (e.g. 2017–2026), follow these steps:

**1. Prepare the CSV files**

The seed script expects two subdirectories inside `SMDT_DATA_DIR`:

```
SMDT_DATA_DIR/
├── DatenSM/              # Meter readings (one file per meter)
│   ├── 0101-ZE01-70.csv  # Format: start; end; powerOrigKw; powerKw; energyOrigKwh; energyKwh; errorCode
│   ├── 0101-ZE02-70.csv
│   └── ...
└── DatenSM_time/         # Heatmap snapshots (one file per 15-min timestamp)
    ├── zw_20160101_000000.csv  # Format: timestamp; meterId; valueKw; unit
    ├── zw_20160101_001500.csv
    └── ...
```

To add new years, place the new CSV files alongside the existing ones in the same directories.

**2. Seed the database**

You have two options:

**Option A — Append mode (recommended for adding new years):**

```bash
# Append new data to the existing DB (duplicates are automatically skipped)
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed:append
```

This keeps the existing DB and only inserts new rows. Much faster when adding a single year to a multi-year DB.

**Option B — Full re-seed (recreates everything from scratch):**

```bash
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed
```

Use this if you want to start fresh or if the data directory contains all years.

**3. Upload and deploy**

Follow the "Upload DB to k8s" and deployment steps below.

**Why not seed on the pod directly?**

- The pod runs `next start` (production) — `tsx` and dev dependencies aren't available in the Docker image
- CSV files would need uploading to the pod first anyway (same transfer cost)
- A heavy seed process on a live pod would block the SQLite worker thread and crash the app

**Sizing estimates per year:**

| Metric | Per year | 10 years |
|--------|----------|----------|
| `meter_readings` rows | ~21.5M | ~215M |
| `station_heatmap` rows | ~1.3M | ~13M |
| DB file size | ~3.8 GB | ~38 GB |
| PVC required | 10 Gi | 100 Gi |

For 10 years, expand the PVC before uploading:

```bash
kubectl patch pvc smdt-data -n esa -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

---

## Performance and crash prevention

The heatmap dataset is large (~21.5M raw meter readings, ~35K timestamps across 366 days). Several layers prevent pod crashes and ensure the app can serve 1000+ concurrent users.

### Problem: synchronous SQLite blocks the event loop

`better-sqlite3` is synchronous — every query blocks the Node.js event loop. During heatmap playback, back-to-back queries starve health probes. Kubernetes detects the pod as unresponsive and kills it (exit code 135 = SIGBUS).

### Solution: 5 layers of protection

**1. Worker Thread** (`src/services/sqlite-async.ts`)

All SQLite queries run in a dedicated Worker Thread via `queryAll()` / `queryGet()`. The main Node.js event loop stays free for HTTP requests and health probes. The worker code is inlined as a string (no separate file needed in Next.js standalone builds).

**2. Pre-aggregated station data** (`station_heatmap` table)

The seed script pre-aggregates heatmap data from meter-level (~614 rows/timestamp) to station-level (~37 rows/timestamp) in-memory from CSV, then inserts directly into `station_heatmap`. API routes query `station_heatmap` directly — zero runtime aggregation.

- Seed script: `seed-sqlite.ts`
- Query function: `loadStationHeatmapSqlite()` in `src/services/sqlite-store.ts`
- GeoJSON conversion: `stationRowsToGeoJSON()` in `src/app/api/_lib/aggregate-heatmap.ts`
- Used by: `/api/heatmap/geo`, `/api/heatmap/geo/day`, `/api/heatmap/init`, `/api/heatmap`

**3. PRAGMA optimizations** (`src/services/sqlite-async.ts` worker)

The worker thread configures SQLite for read-only performance:

| PRAGMA | Value | Effect |
|--------|-------|--------|
| `journal_mode` | WAL | Concurrent reads without locking |
| `mmap_size` | 2147483648 (2 GB) | Memory-mapped I/O, avoids read() syscalls |
| `cache_size` | -64000 (64 MB) | Larger page cache for repeated queries |
| `temp_store` | MEMORY | Temp tables in RAM instead of disk |
| `query_only` | ON | Safety: prevents accidental writes |

**4. Server-side LRU caching** (`src/services/sqlite-store.ts`)

`loadStationHeatmapSqlite()` caches results in a 200-entry LRU map. Since the dataset is static (historical data, never changes), cached entries never invalidate. After first access, subsequent requests are served from memory with zero SQLite queries.

**5. Batch day endpoint** (`/api/heatmap/geo/day?date=YYYY-MM-DD`)

Returns all ~96 timestamps of geo data for an entire day in a single request, replacing 96 individual `/api/heatmap/geo` calls. The client (`useHeatmapData.ts`) calls this on day load and populates its local cache, so heatmap playback requires zero network requests after the initial fetch.

### Health endpoint

**Endpoint:** `/api/health` — returns `{ "status": "ok" }`

- Lightweight, no database queries, no auth required.
- Added to `PUBLIC_PATHS` in `src/proxy.ts` (bypasses auth middleware).
- Used by all Kubernetes probes (startup, readiness, liveness).
- **Why this matters:** Previous probes used `/api/stations` which required authentication. Unauthenticated probes got 302 redirected to `/login`, timed out during event loop blocking, and caused Kubernetes to kill the pod.

### Node.js heap limit

`Dockerfile` sets `NODE_OPTIONS="--max-old-space-size=4096"` — explicit 4 GB V8 heap cap to prevent uncontrolled growth within the pod memory limit.

### Crash diagnostics (`src/instrumentation.ts`)

Logs critical process events for debugging pod crashes:

| Event | Log prefix | Description |
|-------|-----------|-------------|
| `uncaughtException` | `[CRASH]` | Unhandled error — logs and exits |
| `unhandledRejection` | `[CRASH]` | Unhandled promise rejection |
| `SIGTERM` | `[SHUTDOWN]` | Kubernetes graceful shutdown signal |
| `SIGINT` | `[SHUTDOWN]` | Manual interrupt |
| Every 60s | `[MEMORY]` | RSS, heap used, heap total, external |

Check logs:

```bash
# Live memory and diagnostics
kubectl logs <pod> -n esa | grep -E '\[MEMORY\]|\[CRASH\]|\[SHUTDOWN\]'

# Previous crash (after restart)
kubectl logs --previous <pod> -n esa | grep -E '\[MEMORY\]|\[CRASH\]'
```

---

## Auth database (`auth.db`)

A separate small SQLite database for user management. Lives on the same PVC at `/data/auth.db`.

- **Not part of the seed script** — it is auto-created by the app on first startup
- **Auto-seeded from env vars** on first run (when the `users` table is empty):
  - `AUTH_ADMIN_USERS=cakmak` — comma-separated admin Kürzels
  - `AUTH_FULL_USERS=doe,smith` — comma-separated full-access Kürzels
- After initial seed, admins manage users via the `/admin` page — changes are persisted in `auth.db`
- **Persists across pod restarts** on the PVC — user data is never lost
- **Does not use the worker thread** — uses synchronous `better-sqlite3` directly (queries are tiny, single-row lookups)
- Path configurable via `AUTH_DB_PATH` env var (default: `/data/auth.db` in k8s, `./data/auth.db` locally)

For full auth documentation see [AUTH.md](AUTH.md).

---

## Architecture overview

```
Client (browser)
  │
  ├─ GET /api/heatmap/init          → bounds + first timestamp geo data
  ├─ GET /api/heatmap/geo/day       → all ~96 timestamps for a day (batch)
  ├─ GET /api/heatmap/geo?ts=...    → single timestamp (fallback)
  ├─ GET /api/heatmap?ts=...        → station-level data (download)
  └─ GET /api/health                → probe endpoint (no auth, no DB)
        │
        ▼
  Next.js API routes
        │
        ▼
  smdt-data.ts (service layer)
        │
        └─ SQLite → sqlite-store.ts → sqlite-async.ts (Worker Thread)
                          │                    │
                          │                    └─ better-sqlite3 (read-only)
                          └─ LRU cache (200 entries)
```

### Key files

| File | Purpose |
|------|---------|
| `seed-sqlite.ts` | Seeds DB from CSV + XML config, aggregates station data in-memory |
| `src/services/sqlite-async.ts` | Worker Thread wrapper for better-sqlite3 |
| `src/services/sqlite-store.ts` | All SQLite queries + LRU caching |
| `src/services/smdt-data.ts` | Service layer (SQLite-only for heatmap) |
| `src/app/api/_lib/aggregate-heatmap.ts` | GeoJSON conversion for station rows |
| `src/app/api/heatmap/geo/day/route.ts` | Batch day endpoint |
| `src/app/api/health/route.ts` | Health probe endpoint |
| `src/instrumentation.ts` | Crash diagnostics + memory logging |

---

## Deployment checklist

When deploying changes that affect the database or performance layers:

- [ ] Re-seed the database locally: `SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed`
- [ ] Verify the build passes: `npx tsc --noEmit && npx next build`
- [ ] Rebuild the Docker image
- [ ] Upload the new `smdt.db` to the pod (see "Upload DB to k8s" above)
- [ ] Apply the updated deployment YAML: `kubectl apply -f <deployment-file>`
- [ ] Verify probes use `/api/health` (not `/api/stations`): `kubectl describe pod <pod> -n esa | grep -A3 Liveness`
- [ ] Check pod starts without crashes: `kubectl get pods -n esa -w`
- [ ] Check diagnostics: `kubectl logs <pod> -n esa | grep -E '\[MEMORY\]|\[CRASH\]'`

### Notes

- Seed script: `seed-sqlite.ts` (runs via `npm run db:seed`)
- `SMDT_DATA_DIR` is required for seeding. Defaults: `SMDT_CONFIG_FILE=./data/meter-mapping.xml`, `SMDT_SQLITE_PATH=./data/smdt.db`
- The PVC (`smdt-data`) persists across pod restarts — no reseeding needed.
