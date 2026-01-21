import { NextResponse } from 'next/server';
import { listConfig } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const config = listConfig();
    
    apiLogger.info('GET /api/buildings', { count: config.buildings.length });
    
    return NextResponse.json({
      success: true,
      data: { buildings: config.buildings },
      meta: {
        count: config.buildings.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    apiLogger.error('GET /api/buildings failed', error);
    
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to fetch buildings' },
      },
      { status: 500 }
    );
  }
}
