import { NextResponse } from 'next/server';
import { listHeatmapTimestamps, loadHeatmapSlice, getMeterMeta } from '@/services/smdt-data';
import { stationFeatures } from '@/config/grid';
import { apiLogger } from '@/lib/logger';

// Cache the response for 60 seconds on the server
export const revalidate = 60;

// Pre-build station lookup map once
const stationsById = new Map(stationFeatures.map((s) => [s.properties.id, s]));

export async function GET() {
  try {
    const timestamps = await listHeatmapTimestamps();

    // Select middle timestamp as initial
    const midIndex = Math.floor(timestamps.length / 2);
    const initialTimestamp = timestamps[midIndex] ?? timestamps[0] ?? null;

    let featureCollection = null;
    let stats = null;

    if (initialTimestamp) {
      const slice = await loadHeatmapSlice(initialTimestamp);

      // Aggregate heatmap points by station
      const bucket = new Map<
        string,
        { stationId: string; value: number; count: number; coordinates: [number, number] }
      >();

      slice.forEach((p) => {
        const meta = getMeterMeta(p.meterId);
        const stationId = meta?.stationId;
        if (!stationId) return;

        const station = stationsById.get(stationId);
        if (!station?.geometry || station.geometry.type !== 'Point') return;

        const coords = station.geometry.coordinates as [number, number];
        const entry = bucket.get(stationId);
        const val = p.valueKw ?? 0;

        if (!entry) {
          bucket.set(stationId, { stationId, value: val, count: 1, coordinates: coords });
        } else {
          entry.value += val;
          entry.count += 1;
        }
      });

      const features = Array.from(bucket.values()).map((b) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: b.coordinates },
        properties: { stationId: b.stationId, valueKw: b.value, meters: b.count },
      }));

      featureCollection = { type: 'FeatureCollection' as const, features };
      stats = { stations: features.length, meters: slice.length };
    }

    apiLogger.info('GET /api/heatmap/init', {
      timestampCount: timestamps.length,
      initialTimestamp,
      stations: stats?.stations ?? 0
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          timestamps,
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
