import SeriesExplorer from '@/components/SeriesExplorer';
import { gridData } from '@/data/grid';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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
    building?.id ||
    meter?.id ||
    undefined;

  return (
    <div className="min-h-screen bg-[#050b18] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        {!embed && (
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <div className="flex h-9 items-center rounded-full bg-white/10 px-3 text-xs font-semibold uppercase tracking-[0.3em] text-white">
              {safeType} view
            </div>
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">
            {safeType} visualization
          </p>
          <h1 className="text-3xl font-semibold">{fallbackLabel}</h1>
          {subtitle && <p className="text-base text-white/60">{subtitle}</p>}
        </div>
        <SeriesExplorer type={safeType} id={id} />
      </div>
    </div>
  );
}
