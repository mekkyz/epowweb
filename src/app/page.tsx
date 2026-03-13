import Image from 'next/image';
import CampusMapSection from '@/components/CampusMapSection';
import LiveDataSection from '@/components/LiveDataSection';
import PageHeader from '@/components/layout/PageHeader';
import CountUp from '@/components/CountUp';
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
    <div className="stat-card stat-sheen relative overflow-hidden flex flex-col items-center justify-center gap-0.5 rounded-lg bg-panel px-5 py-3 ring-1 ring-border sm:h-[118px] sm:w-[140px]">
      <Icon className={`h-4 w-4 ${color}`} />
      <CountUp
        end={value}
        className="mt-0.5 font-display text-[1.65rem] font-semibold leading-none tabular-nums text-foreground"
      />
      <span className="text-[11px] font-medium text-foreground-secondary">{label}</span>
      <span className="text-[10px] leading-tight text-muted">{hint}</span>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-6">
      {/* ── Hero ── */}
      <section className="pb-7 pt-8">
        <div className="text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            <span className="-skew-x-12 inline-block text-[#009682]">e</span>PowMon
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-[15px]">
            KIT Campus North Power Grid Monitoring
          </p>
        </div>

        {/* Desktop stats row */}
        <div className="mt-8 hidden items-center justify-between gap-4 sm:flex">
          <Image
            src="/eASiMOV.png"
            alt="eASiMOV - KIT Institute for Automation and Applied Informatics"
            width={120}
            height={120}
            className="h-[118px] w-auto shrink-0 rounded-lg bg-panel object-contain p-2 ring-1 ring-border"
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
            className="h-[118px] w-auto shrink-0 rounded-lg bg-panel object-contain p-2 ring-1 ring-border"
            priority
          />
        </div>

        {/* Mobile stats grid */}
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:hidden">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      <div className="mt-6" />

      <CampusMapSection />

      <section id="live-data" className="mt-14 scroll-mt-20 space-y-5">
        <PageHeader label="Visualization" title="Station, Building & Meter Previews" className="mb-0" />
        <LiveDataSection />
      </section>

    </div>
  );
}
