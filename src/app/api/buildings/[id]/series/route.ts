import { getAggregatedBounds, getBuildingMeta, loadAggregatedSeries } from "@/services/smdt-data";
import { createSeriesHandler } from "@/app/api/_lib/series-handler";

export const GET = createSeriesHandler({
  entityType: "building",
  getMeta: getBuildingMeta,
  getBounds: (ids) => getAggregatedBounds(ids as string[]),
  loadSeries: (ids, opts) => loadAggregatedSeries(ids as string[], opts),
  useMeterIds: true,
});
