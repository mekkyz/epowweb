import { NextRequest, NextResponse } from 'next/server';
import { loadStationHeatmap } from '@/services/smdt-data';
import { apiLogger } from '@/lib/logger';
import { ERROR_MESSAGES } from '@/lib/constants';
import { stationRowsToGeoJSON } from '@/app/api/_lib/aggregate-heatmap';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timestamp = searchParams.get('timestamp');

    if (!timestamp) {
      apiLogger.warn('GET /api/heatmap/geo - Missing timestamp parameter');
      return NextResponse.json(
        { success: false, error: { message: ERROR_MESSAGES.missingParameter('timestamp'), code: 'MISSING_PARAMETER' } },
        { status: 400 }
      );
    }

    const rows = await loadStationHeatmap(timestamp);

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { timestamp, featureCollection: { type: 'FeatureCollection', features: [] }, stats: { stations: 0, meters: 0 } },
        meta: { timestamp: new Date().toISOString() },
      }, {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
      });
    }

    const { featureCollection, stats } = stationRowsToGeoJSON(rows);

    apiLogger.info('GET /api/heatmap/geo', { timestamp, stationsCount: stats.stations, metersCount: stats.meters });

    return NextResponse.json({
      success: true,
      data: { timestamp, featureCollection, stats },
      meta: { timestamp: new Date().toISOString() },
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    apiLogger.error('GET /api/heatmap/geo failed', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch heatmap geo data' } },
      { status: 500 }
    );
  }
}
