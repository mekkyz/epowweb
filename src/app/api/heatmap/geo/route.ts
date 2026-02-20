import { NextRequest, NextResponse } from 'next/server';
import { loadHeatmapSlice, getMeterMeta } from '@/services/smdt-data';
import { stationFeatures } from '@/config/grid';
import { apiLogger } from '@/lib/logger';
import { ERROR_MESSAGES } from '@/lib/constants';

// Built once at module load — reused across all requests
const stationsById = new Map(stationFeatures.map((s) => [s.properties.id, s]));

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

    const slice = await loadHeatmapSlice(timestamp);

    // Guard: empty slice → return empty FeatureCollection
    if (!slice || slice.length === 0) {
      return NextResponse.json({
        success: true,
        data: { timestamp, featureCollection: { type: 'FeatureCollection', features: [] }, stats: { stations: 0, meters: 0 } },
        meta: { timestamp: new Date().toISOString() },
      }, {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
      });
    }

    // Aggregate heatmap points by station
    const bucket = new Map<
      string,
      { stationId: string; value: number; count: number; coordinates: [number, number] }
    >();

    for (const p of slice) {
      try {
        const meta = getMeterMeta(p.meterId);
        const stationId = meta?.stationId;
        if (!stationId) continue;

        const station = stationsById.get(stationId);
        if (!station?.geometry || station.geometry.type !== 'Point') continue;

        const coords = station.geometry.coordinates as [number, number];
        const entry = bucket.get(stationId);
        const val = p.valueKw ?? 0;

        if (!entry) {
          bucket.set(stationId, { stationId, value: val, count: 1, coordinates: coords });
        } else {
          entry.value += val;
          entry.count += 1;
        }
      } catch {
        // Skip malformed points
        continue;
      }
    }

    const features = Array.from(bucket.values()).map((b) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: b.coordinates },
      properties: { stationId: b.stationId, valueKw: b.value, meters: b.count },
    }));

    const featureCollection = { type: 'FeatureCollection' as const, features };
    const stats = { stations: features.length, meters: slice.length };

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
