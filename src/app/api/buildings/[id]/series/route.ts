import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBounds, getBuildingMeta, loadAggregatedSeries } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';
import { API_DEFAULTS } from '@/lib/constants';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctxParams = await context.params;
  const buildingId = ctxParams.id;
  
  try {
    const meta = getBuildingMeta(buildingId);

    if (!meta) {
      apiLogger.warn('GET /api/buildings/[id]/series - Building not found', { buildingId });
      return NextResponse.json(
        { success: false, error: { message: `Building '${buildingId}' not found`, code: 'NOT_FOUND' } },
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

    apiLogger.info('GET /api/buildings/[id]/series', { buildingId, seriesCount: series.length });

    return NextResponse.json({
      success: true,
      data: { building: meta, series, bounds },
      meta: { count: series.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/buildings/[id]/series failed', error, { buildingId });
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch building series data' } },
      { status: 500 }
    );
  }
}
