'use client';

import { type ReactNode, useState, useCallback } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import MapPlaceholder from '@/components/MapPlaceholder';
import { MapErrorBoundary } from '@/components/MapErrorBoundary';
import {
  ToggleChip,
  MapFullscreenButton,
  MapAttribution,
  MapWatermark,
  GridLegend,
  StationInfoPanel,
} from './MapOverlays';
import { useWebGLCheck, useFullscreen } from './useMapControls';

interface StationInfo {
  id?: string;
  url?: string;
  description?: string;
  group?: string;
}

interface MapShellProps {
  /** Unique ID for the fullscreen container */
  containerId: string;
  /** Icon for loading/error placeholders */
  placeholderIcon: LucideIcon;
  /** Label shown during loading */
  loadingLabel?: string;
  /** Error boundary title */
  errorTitle?: string;
  /** Error boundary description */
  errorDescription?: string;
  /** Whether to show Grid/Stations toggle chips */
  showLayerToggles?: boolean;
  /** Whether to show the grid legend */
  showGridLegend?: boolean;
  /** Selected station for the info panel */
  selectedStation?: StationInfo | null;
  /** Extra class name for the container */
  className?: string;
  /** The map content to render (receives layer toggle state) */
  children: (props: {
    showLines: boolean;
    showStations: boolean;
    isFullscreen: boolean;
    onError: () => void;
  }) => ReactNode;
}

export default function MapShell({
  containerId,
  placeholderIcon,
  loadingLabel = 'Loading map...',
  errorTitle = 'Map Unavailable',
  errorDescription = 'Unable to render the map. Try refreshing the page.',
  showLayerToggles = true,
  showGridLegend = true,
  selectedStation,
  className,
  children,
}: MapShellProps) {
  const webGLSupported = useWebGLCheck();
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerId);
  const [mapError, setMapError] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showStations, setShowStations] = useState(true);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const chipGroup = 'flex items-center gap-1 rounded-lg bg-panel/90 p-1 shadow-sm shadow-black/10 backdrop-blur';

  return (
    <div
      id={containerId}
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-transparent',
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : 'h-[520px]',
        className
      )}
    >
      {/* Layer toggle chips */}
      {showLayerToggles && (
        <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <div className={chipGroup}>
            <ToggleChip active={showLines} label="Grid" onChange={setShowLines} />
            <ToggleChip active={showStations} label="Stations" onChange={setShowStations} />
          </div>
        </div>
      )}

      {/* Fullscreen button */}
      <MapFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

      {/* Attribution */}
      <MapAttribution />

      {/* Watermark */}
      <MapWatermark />

      {/* Grid legend */}
      {showGridLegend && <GridLegend />}

      {/* Map content or fallback */}
      {webGLSupported === null ? (
        <MapPlaceholder icon={placeholderIcon} label={loadingLabel} animate />
      ) : webGLSupported && !mapError ? (
        <MapErrorBoundary
          fallbackIcon="map"
          title={errorTitle}
          description={errorDescription}
        >
          {children({ showLines, showStations, isFullscreen, onError: handleMapError })}
        </MapErrorBoundary>
      ) : (
        <MapPlaceholder
          icon={placeholderIcon}
          label={errorTitle}
          description="WebGL is not available in this browser."
        />
      )}

      {/* Station info panel */}
      <StationInfoPanel station={selectedStation ?? null} />
    </div>
  );
}
