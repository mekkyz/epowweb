'use client';

import dynamic from 'next/dynamic';
import { Map as MapIcon, Box } from 'lucide-react';
import MapPlaceholder from './MapPlaceholder';

export const DynamicCampusMap2D = dynamic(
  () => import('./CampusMap2D'),
  {
    ssr: false,
    loading: () => <MapPlaceholder icon={MapIcon} label="Loading 2D map..." animate />,
  }
);

export const DynamicCampusMap3D = dynamic(
  () => import('./CampusMap3D'),
  {
    ssr: false,
    loading: () => <MapPlaceholder icon={Box} label="Loading 3D view..." animate />,
  }
);
