## SQLite setup (full data)

The app uses SQLite for meter readings and heatmap data. The database is generated locally from CSV files and uploaded to the k8s volume.

### Seed the DB locally

Point `SMDT_DATA_DIR` at the full legacy CSV data and run the seed script:

```bash
SMDT_DATA_DIR=../smdt-legacy/backend/data npm run db:seed
```

This creates `data/smdt.db` with two tables: `meter_readings` and `heatmap_points`. It is safe to rerun (the script recreates the DB from scratch).

### Run the app locally

```bash
npm run dev
```

When `data/smdt.db` exists, all series/heatmap APIs use SQLite. The CSV fallback is only used if the DB file is missing.

### Upload DB to k8s

The DB file is too large (~7 GB) for a single `kubectl cp` — the transfer will time out or get corrupted. Compress and split it first:

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

**Important:** The PVC needs at least 20Gi — decompression needs space for both the .gz (~1.3 GB) and the .db (~7.4 GB) temporarily. If you get `No space left on device`, expand the PVC:

```bash
kubectl patch pvc smdt-data -n esa -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

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

### Performance and crash prevention

The heatmap dataset is large (~21.5M rows, ~35K timestamps across 366 days). Several layers prevent the synchronous `better-sqlite3` queries from blocking the Node.js event loop and crashing the pod:

**Server-side caching** (`src/services/sqlite-store.ts`):
- `loadHeatmapSliceSqlite()` caches results in a 200-entry LRU map. Since the dataset is static (2016 historical data), cached entries never invalidate. After first access, subsequent requests are served from memory with zero SQLite queries.

**Batch day endpoint** (`/api/heatmap/geo/day?date=YYYY-MM-DD`):
- Returns aggregated geo data for all ~96 timestamps of a day in a single request, replacing 96 individual `/api/heatmap/geo` calls.
- Yields to the event loop between timestamps via `setImmediate()` so health probes stay responsive.
- The client (`useHeatmapData.ts`) calls this on day load and populates its local cache, so heatmap playback requires zero network requests.

**Health endpoint** (`/api/health`):
- Lightweight endpoint excluded from auth middleware (`proxy.ts` PUBLIC_PATHS).
- Used by all Kubernetes probes (startup, readiness, liveness). Previous probes used `/api/stations` which required authentication — unauthenticated probes were redirected to `/login`, timed out during event loop blocking, and caused Kubernetes to kill the pod (exit code 135).

**Node.js heap limit** (`Dockerfile`):
- `NODE_OPTIONS="--max-old-space-size=4096"` caps the V8 heap at 4GB to prevent uncontrolled growth within the 8Gi pod memory limit.

**Crash diagnostics** (`src/instrumentation.ts`):
- Logs `uncaughtException`, `unhandledRejection`, `SIGTERM`, and `SIGINT` events.
- Logs `process.memoryUsage()` every 60 seconds.
- Check with: `kubectl logs <pod> | grep -E '\[MEMORY\]|\[CRASH\]|\[SHUTDOWN\]'`
- Check previous crash: `kubectl logs --previous <pod> | grep -E '\[MEMORY\]|\[CRASH\]'`

### Notes
- Seed script: `scripts/seed-sqlite.ts` (runs via `npm run db:seed`)
- Data/config auto-discovery: if `SMDT_DATA_DIR`/`SMDT_CONFIG_FILE` are unset, the app tries `../smdt-legacy/backend/data` and `../smdt-legacy/backend/config/KIT_CN.xml`; otherwise falls back to bundled samples under `data/smdt-sample` and `data/smdt-config`.
- Override DB path: set `SMDT_SQLITE_PATH` env var (default: `data/smdt.db`).
- The PVC (`smdt-data`, 20Gi) persists across pod restarts — no reseeding needed.
