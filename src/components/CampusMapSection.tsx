'use client';

import { useState } from 'react';
import { Layers, Box } from 'lucide-react';
import { DynamicCampusMap2D, DynamicCampusMap3D } from './DynamicMaps';

type MapView = '2d' | '3d';

const viewConfig = {
  '2d': {
    label: 'Normal View',
    title: '2D Power Grid',
    color: 'emerald',
  },
  '3d': {
    label: 'Immersive View',
    title: '3D Station & Cable Network',
    color: 'purple',
  },
} as const;

export default function CampusMapSection() {
  const [view, setView] = useState<MapView>('2d');
  const config = viewConfig[view];


  return (
    <section id="map" className="mt-6 scroll-mt-20 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
              {config.label}
            </p>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {config.title}
            </h2>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-surface p-1 shadow-sm shadow-black/10 dark:shadow-black/30 backdrop-blur">
          <button
            type="button"
            onClick={() => setView('2d')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              view === '2d'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'bg-transparent text-foreground-secondary hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>2D View</span>
          </button>
          <button
            type="button"
            onClick={() => setView('3d')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
              view === '3d'
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'bg-transparent text-foreground-secondary hover:text-foreground'
            }`}
          >
            <Box className="h-4 w-4" />
            <span>3D View</span>
          </button>
        </div>
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
    </section>
  );
}
