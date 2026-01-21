import { NextResponse } from 'next/server';
import { listHeatmapTimestamps } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const timestamps = await listHeatmapTimestamps();
    
    apiLogger.info('GET /api/heatmap/available', { count: timestamps.length });
    
    return NextResponse.json({
      success: true,
      data: { timestamps },
      meta: { count: timestamps.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    apiLogger.error('GET /api/heatmap/available failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch available heatmap timestamps' } },
      { status: 500 }
    );
  }
}
