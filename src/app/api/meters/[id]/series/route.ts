import { NextRequest, NextResponse } from 'next/server';
import { getMeterBounds, getMeterMeta, loadMeterSeries } from '@/server/smdt-data';

type Params = { params: { id: string } | Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: Params) {
  const ctxParams = await context.params;
  const meterId = ctxParams.id;
  const meta = getMeterMeta(meterId);

  const { searchParams } = new URL(_req.url);
  const start = searchParams.get('start') ?? undefined;
  const end = searchParams.get('end') ?? undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;

  const bounds = meta ? await getMeterBounds(meterId) : {};
  const finalStart = start ?? (bounds.end ? new Date(new Date(bounds.end).valueOf() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ') : undefined);
  const finalEnd = end ?? bounds.end;

  const series = meta ? await loadMeterSeries(meterId, { start: finalStart, end: finalEnd, limit }) : [];
  return NextResponse.json({ meter: meta ?? null, series, bounds });
}
