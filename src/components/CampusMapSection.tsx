'use client';

import { useState } from 'react';
import { Layers, Box, Sparkles } from 'lucide-react';
import { ToggleGroup } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { DynamicCampusMap2D, DynamicCampusMap3D } from './DynamicMaps';

type MapView = '2d' | '3d';

const viewConfig = {
  '2d': {
    label: 'Normal View',
    title: 'KIT-CN 20 kV Power Grid',
  },
  '3d': {
    label: 'Immersive View',
    title: 'KIT-CN 20 kV Power Grid',
  },
} as const;

const viewOptions = [
  { value: '2d' as const, label: <><Layers className="h-4 w-4" /> 2D View</> },
  { value: '3d' as const, label: <><Box className="h-4 w-4" /> 3D View</> },
];

export default function CampusMapSection() {
  const [view, setView] = useState<MapView>('2d');
  const config = viewConfig[view];

  return (
    <section id="map" className="mt-6 scroll-mt-20 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          label={config.label}
          title={config.title}
          className="mb-0"
        />
        <ToggleGroup options={viewOptions} value={view} onChange={setView} />
      </div>

      {/* Map Container with transition */}
      <div className="relative">
        <div
          className={`transition-opacity duration-300 ${
            view === '2d' ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
          }`}
        >
          <DynamicCampusMap2D />
        </div>
        <div
          className={`transition-opacity duration-300 ${
            view === '3d' ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
          }`}
        >
          <DynamicCampusMap3D />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-panel border border-border px-4 py-3 text-sm text-foreground-secondary">
        <Sparkles className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <p>
          <strong className="text-foreground">Select a station</strong> for details. Use <strong className="text-foreground">ALT + drag</strong> for view rotation.
        </p>
      </div>
    </section>
  );
}
