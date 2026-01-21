import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBounds, getStationMeta, loadAggregatedSeries } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';
import { API_DEFAULTS } from '@/lib/constants';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctxParams = await context.params;
  const stationId = ctxParams.id;
  
  try {
    const meta = getStationMeta(stationId);

    if (!meta) {
      apiLogger.warn('GET /api/stations/[id]/series - Station not found', { stationId });
      return NextResponse.json(
        { success: false, error: { message: `Station '${stationId}' not found`, code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') ?? undefined;
    const end = searchParams.get('end') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : API_DEFAULTS.seriesLimit;

    const bounds = await getAggregatedBounds(meta.meters);
    const defaultStartDate = bounds.end
      ? new Date(new Date(bounds.end).valueOf() - API_DEFAULTS.defaultTimeRangeDays * 24 * 3600 * 1000)
          .toISOString().slice(0, 19).replace('T', ' ')
      : undefined;
    
    const finalStart = start ?? defaultStartDate;
    const finalEnd = end ?? bounds.end;

    const series = await loadAggregatedSeries(meta.meters, { start: finalStart, end: finalEnd, limit });

    apiLogger.info('GET /api/stations/[id]/series', { stationId, seriesCount: series.length });

    return NextResponse.json({
      success: true,
      data: { station: meta, series, bounds },
      meta: { count: series.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/stations/[id]/series failed', error, { stationId });
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch station series data' } },
      { status: 500 }
    );
  }
}
