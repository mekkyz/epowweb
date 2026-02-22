import { NextResponse } from 'next/server';
import { getHeatmapBounds, loadHeatmapSlice } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';
import { aggregateSliceByStation } from '@/app/api/_lib/aggregate-heatmap';

// Cache the response for 60 seconds on the server
export const revalidate = 60;

export async function GET() {
  try {
    const bounds = await getHeatmapBounds();

    const initialTimestamp = bounds.min ?? null;

    let featureCollection = null;
    let stats = null;

    if (initialTimestamp) {
      const slice = await loadHeatmapSlice(initialTimestamp);
      const result = aggregateSliceByStation(slice);
      featureCollection = result.featureCollection;
      stats = result.stats;
    }

    apiLogger.info('GET /api/heatmap/init', {
      timestampCount: bounds.count,
      initialTimestamp,
      stations: stats?.stations ?? 0
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          bounds: { min: bounds.min, max: bounds.max, count: bounds.count },
          initialTimestamp,
          featureCollection,
          stats,
        },
        meta: { timestamp: new Date().toISOString() },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    apiLogger.error('GET /api/heatmap/init failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to initialize heatmap data' } },
      { status: 500 }
    );
  }
}
