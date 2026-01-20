import { NextRequest, NextResponse } from 'next/server';
import { loadHeatmapSlice } from '@/server/smdt-data';
import { getMeterMeta } from '@/server/smdt-data';
import { stationFeatures } from '@/data/grid';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timestamp = searchParams.get('timestamp');
  if (!timestamp) {
    return NextResponse.json({ error: 'timestamp required (ISO string)' }, { status: 400 });
  }

  const stationsById = new Map(stationFeatures.map((s) => [s.properties.id, s]));
  const slice = await loadHeatmapSlice(timestamp);

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
    type: 'Feature',
    geometry: { type: 'Point', coordinates: b.coordinates },
    properties: { stationId: b.stationId, valueKw: b.value, meters: b.count },
  }));

  return NextResponse.json({
    timestamp,
    featureCollection: { type: 'FeatureCollection', features },
    stats: { stations: features.length, meters: slice.length },
  });
}
