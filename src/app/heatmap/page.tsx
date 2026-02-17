'use client';

import HeatmapExplorer from '@/components/HeatmapExplorer';

export default function HeatmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
          Heatmap View
        </p>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          KIT-CN 20 kV Power Grid
        </h2>
      </div>
      <HeatmapExplorer />
    </div>
  );
}
