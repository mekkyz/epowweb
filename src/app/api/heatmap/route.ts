import { NextRequest, NextResponse } from 'next/server';
import { loadHeatmapSlice } from '@/server/smdt-data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timestamp = searchParams.get('timestamp');
  if (!timestamp) {
    return NextResponse.json({ error: 'timestamp required (ISO string)' }, { status: 400 });
  }

  const points = await loadHeatmapSlice(timestamp);
  return NextResponse.json({ timestamp, points });
}
