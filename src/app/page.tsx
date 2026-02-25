import Image from 'next/image';
import CampusMapSection from '@/components/CampusMapSection';
import LiveDataSection from '@/components/LiveDataSection';
import PageHeader from '@/components/layout/PageHeader';
import { gridData } from '@/config/grid';
import { Activity, Building2, Gauge, Cable, type LucideIcon } from 'lucide-react';

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

function StatCard({ icon: Icon, color, value, label, hint }: {
  icon: LucideIcon;
  color: string;
  value: number;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-panel px-3 py-3 ring-1 ring-border shadow-sm sm:h-[120px] sm:px-6 sm:py-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="font-display text-xl font-semibold text-foreground">{value}</span>
      <span className="text-xs text-foreground-tertiary">{label}</span>
      <span className="text-[10px] leading-tight text-foreground-tertiary/70">{hint}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-6">
      <section className="py-6">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            eASiMOV - ePowMon
          </h1>

        </div>

        <div className="mt-6 hidden items-center justify-between sm:flex">
          <Image
            src="/eASiMOV.png"
            alt="eASiMOV - KIT Institute for Automation and Applied Informatics"
            width={120}
            height={120}
            className="h-[120px] w-auto shrink-0 rounded-lg object-contain ring-1 ring-border shadow-sm"
            priority
          />

          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}

          <Image
            src="/ESA-Logo.png"
            alt="ESA - European Space Agency"
            width={120}
            height={120}
            className="h-[120px] w-auto shrink-0 rounded-lg object-contain ring-1 ring-border shadow-sm"
            priority
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:hidden">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <CampusMapSection />

      <section id="live-data" className="mt-14 scroll-mt-20 space-y-5">
        <PageHeader label="Visualization" title="Station, Building & Meter Previews" className="mb-0" />
        <LiveDataSection />
      </section>

    </div>
  );
}
