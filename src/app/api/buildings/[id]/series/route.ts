import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedBounds, getBuildingMeta, loadAggregatedSeries } from '@/server/smdt-data';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Params) {
  const ctxParams = await context.params;
  const buildingId = ctxParams.id;
  const meta = getBuildingMeta(buildingId);

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') ?? undefined;
  const end = searchParams.get('end') ?? undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;

  const bounds = meta ? await getAggregatedBounds(meta.meters) : {};
  const finalStart = start ?? (bounds.end ? new Date(new Date(bounds.end).valueOf() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ') : undefined);
  const finalEnd = end ?? bounds.end;

  const series = meta
    ? await loadAggregatedSeries(meta.meters, { start: finalStart, end: finalEnd, limit })
    : [];
  return NextResponse.json({ building: meta ?? null, series, bounds });
}
