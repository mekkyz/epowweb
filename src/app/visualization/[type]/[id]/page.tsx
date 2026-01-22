import SeriesExplorer from '@/components/SeriesExplorer';
import VisualizationHeader from '@/components/layout/VisualizationHeader';
import { gridData } from '@/config/grid';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ type: 'meter' | 'building' | 'station'; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VisualizationPage({ params, searchParams }: Params) {
  const { type, id } = await params;
  const query = (await searchParams) ?? {};
  const embed = 'embed' in query;
  if (!id) notFound();

  const safeType = ['meter', 'building', 'station'].includes(type) ? type : 'meter';
  
  const station = gridData.stations.find((s) => s.properties.id === id);
  const building = gridData.buildings.find((b) => b.id === id);
  const meter = gridData.meters.find((m) => m.id === id);
  const fallbackLabel = station?.properties.id || building?.id || meter?.id || id || safeType.toUpperCase();
  const subtitle =
    station?.properties.description ||
    (building?.id !== fallbackLabel ? building?.id : undefined) ||
    undefined;

  return (
    <div className={`mx-auto max-w-6xl px-4 py-8 ${embed ? 'min-h-screen bg-white dark:bg-background' : ''}`}>
      {!embed && (
        <VisualizationHeader
          type={safeType}
          title={fallbackLabel}
          subtitle={subtitle}
        />
      )}
      <SeriesExplorer type={safeType} id={id} />
    </div>
  );
}
