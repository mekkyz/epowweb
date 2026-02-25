import { NextRequest, NextResponse } from 'next/server';
import { loadHeatmapSlice, listDayTimestamps } from '@/services/smdt-data';
import { aggregateSliceByStation, AggregatedHeatmap } from '@/app/api/_lib/aggregate-heatmap';
import { apiLogger } from '@/lib/logger';

/**
 * Batch endpoint: returns aggregated geo data for every timestamp in a given day.
 * One request replaces ~96 individual /api/heatmap/geo calls.
 * Yields to the event loop between timestamps so health probes stay responsive.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: { message: 'Missing or invalid "date" parameter (expected YYYY-MM-DD)' } },
      { status: 400 },
    );
  }

  try {
    const timestamps = await listDayTimestamps(date);

    if (timestamps.length === 0) {
      return NextResponse.json({
        success: true,
        data: { date, entries: {} },
        meta: { timestamp: new Date().toISOString(), count: 0 },
      });
    }

    const entries: Record<string, AggregatedHeatmap> = {};

    for (const ts of timestamps) {
      const slice = await loadHeatmapSlice(ts);

      if (!slice || slice.length === 0) {
        entries[ts] = {
          featureCollection: { type: 'FeatureCollection', features: [] },
          stats: { stations: 0, meters: 0 },
        };
      } else {
        entries[ts] = aggregateSliceByStation(slice);
      }

      // Yield to event loop so liveness probes can respond
      await new Promise((r) => setImmediate(r));
    }

    apiLogger.info('GET /api/heatmap/geo/day', { date, count: timestamps.length });

    return NextResponse.json(
      {
        success: true,
        data: { date, entries },
        meta: { timestamp: new Date().toISOString(), count: timestamps.length },
      },
      {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
      },
    );
  } catch (error) {
    apiLogger.error('GET /api/heatmap/geo/day failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch day geo data' } },
      { status: 500 },
    );
  }
}
