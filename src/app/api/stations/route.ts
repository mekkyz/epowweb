import { NextResponse } from 'next/server';
import { listConfig } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const config = listConfig();
    
    apiLogger.info('GET /api/stations', { count: config.stations.length });
    
    return NextResponse.json({
      success: true,
      data: { stations: config.stations },
      meta: { count: config.stations.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/stations failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch stations' } },
      { status: 500 }
    );
  }
}
