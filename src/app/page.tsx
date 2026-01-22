// import Link from 'next/link';
import Image from 'next/image';
import CampusMapSection from '@/components/CampusMapSection';
import LiveDataSection from '@/components/LiveDataSection';
// import AnemosPanel from '@/components/AnemosPanel';
import { gridData } from '@/config/grid';
import { Activity, Building2, Gauge, Cable } from 'lucide-react';

const stats = [
  {
    label: 'Stations',
    value: gridData.stations.length,
    hint: 'High/medium voltage nodes',
    icon: Activity,
    color: 'text-emerald-400',
  },
  {
    label: 'Buildings',
    value: gridData.buildings.length,
    hint: 'Mapped to power feeds',
    icon: Building2,
    color: 'text-blue-400',
  },
  {
    label: 'Meters',
    value: gridData.meters.length,
    hint: 'Time-series endpoints',
    icon: Gauge,
    color: 'text-amber-400',
  },
  { 
    label: 'Lines', 
    value: gridData.lines.length, 
    hint: '20 kV and head cables',
    icon: Cable,
    color: 'text-purple-400',
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-6">
      {/* Hero Section */}
      <section className="py-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            eASiMOV - ePowWeb
          </h1>
       
        </div>

        {/* Logos and Stats Row */}
        <div className="mt-6 hidden items-center justify-between sm:flex">
          <Image
            src="/eASiMOV.png"
            alt="eASiMOV - KIT Institute for Automation and Applied Informatics"
            width={120}
            height={120}
            className="h-[120px] w-auto shrink-0 rounded-lg object-contain ring-1 ring-border shadow-sm"
            priority
          />

          {/* Stats */}
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex h-[120px] flex-col items-center justify-center gap-0.5 rounded-lg bg-panel px-6 py-2 ring-1 ring-border shadow-sm"
              >
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="font-display text-xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-foreground-tertiary">{stat.label}</span>
                <span className="text-[10px] leading-tight text-foreground-tertiary/70">{stat.hint}</span>
              </div>
            );
          })}

          <Image
            src="/ESA-Logo.png"
            alt="ESA - European Space Agency"
            width={120}
            height={120}
            className="h-[120px] w-auto shrink-0 rounded-lg object-contain ring-1 ring-border shadow-sm"
            priority
          />
        </div>

        {/* Mobile Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:hidden">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-panel px-3 py-3 ring-1 ring-border shadow-sm"
              >
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="font-display text-xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-foreground-tertiary">{stat.label}</span>
                <span className="text-[10px] leading-tight text-foreground-tertiary/70">{stat.hint}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Campus Map Section with 2D/3D Toggle */}
      <CampusMapSection />

      <section id="live-data" className="mt-14 scroll-mt-20 space-y-5">
        <div className="flex items-center gap-4">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
              Visualization
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Station, Building & Meter Previews
            </h2>
          </div>
        </div>
        <LiveDataSection />
      </section>

      {/* Weather Section
      <section className="mt-14 space-y-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 to-sky-600/20 ring-1 ring-sky-400/30">
            <Activity className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
              Weather Data
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Anemos Atmospheric Layers
            </h2>
          </div>
        </div>
        <AnemosPanel />
      </section> */}

      {/* Heatmap CTA */}
      {/* <section className="mt-14">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-panel p-8">
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <h3 className="mt-2 font-display text-2xl font-bold text-foreground">
                20 kV Load Heatmap
              </h3>
            <Link
              href="/heatmap"
              className="group inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-6 py-3 text-sm font-semibold text-foreground shadow-lg shadow-black/10 backdrop-blur transition-all hover:bg-surface-hover hover:shadow-xl dark:shadow-black/20"
            >
              Open Heatmap
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section> */}
    </div>
  );
}
