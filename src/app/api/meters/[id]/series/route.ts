import { NextRequest, NextResponse } from 'next/server';
import { getMeterBounds, getMeterMeta, loadMeterSeries } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';
import { API_DEFAULTS } from '@/lib/constants';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctxParams = await context.params;
  const meterId = ctxParams.id;
  
  try {
    const meta = getMeterMeta(meterId);

    if (!meta) {
      apiLogger.warn('GET /api/meters/[id]/series - Meter not found', { meterId });
      return NextResponse.json(
        { success: false, error: { message: `Meter '${meterId}' not found`, code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start') ?? undefined;
    const end = searchParams.get('end') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : API_DEFAULTS.seriesLimit;

    const bounds = await getMeterBounds(meterId);
    const defaultStartDate = bounds.end
      ? new Date(new Date(bounds.end).valueOf() - API_DEFAULTS.defaultTimeRangeDays * 24 * 3600 * 1000)
          .toISOString().slice(0, 19).replace('T', ' ')
      : undefined;
    
    const finalStart = start ?? defaultStartDate;
    const finalEnd = end ?? bounds.end;

    const series = await loadMeterSeries(meterId, { start: finalStart, end: finalEnd, limit });

    apiLogger.info('GET /api/meters/[id]/series', { meterId, seriesCount: series.length });

    return NextResponse.json({
      success: true,
      data: { meter: meta, series, bounds },
      meta: { count: series.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/meters/[id]/series failed', error, { meterId });
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch meter series data' } },
      { status: 500 }
    );
  }
}
