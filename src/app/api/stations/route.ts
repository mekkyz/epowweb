import { NextResponse } from 'next/server';
import { listConfig } from '@/server/smdt-data';

export async function GET() {
  const config = listConfig();
  return NextResponse.json({ stations: config.stations });
}
