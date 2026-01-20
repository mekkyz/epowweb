import { NextResponse } from 'next/server';
import { listHeatmapTimestamps } from '@/server/smdt-data';

export async function GET() {
  const timestamps = await listHeatmapTimestamps();
  return NextResponse.json({ timestamps });
}
