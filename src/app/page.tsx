import CampusMap2D from '@/components/CampusMap2D';
import CampusMap3D from '@/components/CampusMap3D';
import LiveDataSection from '@/components/LiveDataSection';
import { gridData } from '@/config/grid';
import { ArrowUpRight, FlameKindling, Layers, MapPinned, Radio, Zap } from 'lucide-react';

const stats = [
  {
    label: 'Stations',
    value: gridData.stations.length,
    hint: 'High/medium voltage nodes',
  },
  {
    label: 'Buildings',
    value: gridData.buildings.length,
    hint: 'Mapped to power feeds',
  },
  {
    label: 'Meters',
    value: gridData.meters.length,
    hint: 'Time-series endpoints',
  },
  { label: 'Lines', value: gridData.lines.length, hint: '20 kV and head cables' },
];

const heatmapUrl = '/heatmap';

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-black/40">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">epowweb</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl">
              Smart Meter Data Tool
            </h1>
            <p className="mt-3 text-lg text-white/75">
              KIT Campus North power grid: 2D & 3D maps, live station lookups, and heatmaps.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#map"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-black/30 transition hover:bg-white/15"
              >
                Explore campus map
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href={heatmapUrl}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400"
              >
                Open heatmap
                <Radio className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-white">
            <div className="flex items-center gap-3">
              <MapPinned className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="text-sm font-semibold">KIT Campus North grid</p>
                <p className="text-sm text-white/70">Stations, buildings, meters</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/80">
              <span className="rounded-lg border border-white/10 px-3 py-2">
                2D & 3D overlays
              </span>
              <span className="rounded-lg border border-white/10 px-3 py-2">
                Time-series previews
              </span>
              <span className="rounded-lg border border-white/10 px-3 py-2">Heatmap service</span>
              <span className="rounded-lg border border-white/10 px-3 py-2">CSV/PG backends</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
          >
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              {stat.label}
            </p>
            <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-white/60">{stat.hint}</p>
          </div>
        ))}
      </section>

      <section id="map" className="mt-10 space-y-4">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-emerald-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              Campus overlays
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Interactive 2D power grid
            </h2>
          </div>
        </div>
        <CampusMap2D />
      </section>

      <section id="data" className="mt-12 space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-emerald-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              Live visualizations
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Station, building, and meter previews
            </h2>
          </div>
        </div>
        <LiveDataSection />
      </section>

      <section id="map-3d" className="mt-12 space-y-4">
        <div className="flex items-center gap-3">
          <FlameKindling className="h-6 w-6 text-emerald-300" />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/60">
              Immersive
            </p>
            <h2 className="text-2xl font-semibold text-white">
              3D station and cable view
            </h2>
          </div>
        </div>
        <CampusMap3D />
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                Heatmap
              </p>
              <h3 className="text-xl font-semibold text-white">
                20 kV load heatmap
              </h3>
              <p className="text-white/70">Open the in-app heatmap viewer.</p>
            </div>
            <a
              href={heatmapUrl}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-emerald-500/30 hover:bg-emerald-400"
            >
              Open heatmap
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
