import { getMeterBounds, getMeterMeta, loadMeterSeries } from '@/services/smdt-data';
import { createSeriesHandler } from '@/app/api/_lib/series-handler';

export const GET = createSeriesHandler({
  entityType: 'meter',
  getMeta: getMeterMeta,
  getBounds: (id) => getMeterBounds(id as string),
  loadSeries: (id, opts) => loadMeterSeries(id as string, opts),
});
