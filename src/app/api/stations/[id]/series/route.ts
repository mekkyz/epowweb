import { getAggregatedBounds, getStationMeta, loadAggregatedSeries } from '@/services/smdt-data';
import { createSeriesHandler } from '@/app/api/_lib/series-handler';

export const GET = createSeriesHandler({
  entityType: 'station',
  getMeta: getStationMeta,
  getBounds: (ids) => getAggregatedBounds(ids as string[]),
  loadSeries: (ids, opts) => loadAggregatedSeries(ids as string[], opts),
  useMeterIds: true,
});
