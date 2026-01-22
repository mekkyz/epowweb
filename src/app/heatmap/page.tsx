'use client';

import HeatmapExplorer from '@/components/HeatmapExplorer';
import PageHeader from '@/components/layout/PageHeader';

export default function HeatmapPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Power Heatmap"
        subtitle="KIT Campus North stations consumption data from ESA"
        badgeVariant="success"
      />
      <HeatmapExplorer />
    </div>
  );
}
