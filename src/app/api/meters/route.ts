import { NextResponse } from 'next/server';
import { listConfig } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const config = listConfig();
    
    apiLogger.info('GET /api/meters', { count: config.meters.length });
    
    return NextResponse.json({
      success: true,
      data: { meters: config.meters },
      meta: { count: config.meters.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/meters failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch meters' } },
      { status: 500 }
    );
  }
}
