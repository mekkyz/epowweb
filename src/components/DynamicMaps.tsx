'use client';

import dynamic from 'next/dynamic';
import { Map as MapIcon, Box } from 'lucide-react';

const MapLoadingFallback = ({ icon: Icon, label }: { icon: typeof MapIcon; label: string }) => (
  <div className="relative flex h-[520px] items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-panel to-surface">
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
        <Icon className="h-8 w-8 animate-pulse text-foreground-tertiary" />
      </div>
      <p className="text-sm text-foreground-tertiary">{label}</p>
    </div>
  </div>
);

export const DynamicCampusMap2D = dynamic(
  () => import('./CampusMap2D'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback icon={MapIcon} label="Loading 2D map..." />,
  }
);

export const DynamicCampusMap3D = dynamic(
  () => import('./CampusMap3D'),
  {
    ssr: false,
    loading: () => <MapLoadingFallback icon={Box} label="Loading 3D view..." />,
  }
);
