"use client";

import { type ReactNode, useState, useCallback } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import MapPlaceholder from "@/components/MapPlaceholder";
import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import {
  ToggleChip,
  MapFullscreenButton,
  MapAttribution,
  MapWatermark,
  GridLegend,
  StationInfoPanel,
} from "./MapOverlays";
import { useWebGLCheck, useFullscreen } from "./useMapControls";
import { useEntityMapping } from "@/hooks/useEntityMapping";
import { useAuth } from "@/context/AuthProvider";

interface StationInfo {
  id?: string;
  url?: string;
  description?: string;
  group?: string;
}

interface MapShellProps {
  /** unique id for the fullscreen container */
  containerId: string;
  /** icon for loading/error placeholders */
  placeholderIcon: LucideIcon;
  /** label shown during loading */
  loadingLabel?: string;
  /** error boundary title */
  errorTitle?: string;
  /** error boundary description */
  errorDescription?: string;
  /** whether to show Grid/Stations toggle chips */
  showLayerToggles?: boolean;
  /** whether to show the grid legend */
  showGridLegend?: boolean;
  /** selected station for the info panel */
  selectedStation?: StationInfo | null;
  /** extra class name for the container */
  className?: string;
  /** the map content to render (receives layer toggle state) */
  children: (props: {
    showLines: boolean;
    showStations: boolean;
    showBuildings: boolean;
    isFullscreen: boolean;
    onError: () => void;
  }) => ReactNode;
}

export default function MapShell({
  containerId,
  placeholderIcon,
  loadingLabel = "Loading map...",
  errorTitle = "Map Unavailable",
  errorDescription = "Unable to render the map. Try refreshing the page.",
  showLayerToggles = true,
  showGridLegend = true,
  selectedStation,
  className,
  children,
}: MapShellProps) {
  const webGLSupported = useWebGLCheck();
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerId);
  const { isDemo } = useAuth();
  const mapping = useEntityMapping();
  const [mapError, setMapError] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);

  const handleMapError = useCallback(() => {
    setMapError(true);
  }, []);

  const chipGroup =
    "flex items-center gap-1 rounded-lg bg-panel/90 p-1 shadow-sm shadow-black/10 backdrop-blur";

  return (
    <div
      id={containerId}
      className={clsx(
        "border-border from-surface relative overflow-hidden rounded-xl border bg-gradient-to-br to-transparent",
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none" : "h-[520px]",
        className,
      )}
    >
      {/* layer toggle chips */}
      {showLayerToggles && (
        <div className="pointer-events-auto absolute top-4 left-4 z-10 flex flex-wrap gap-2">
          <div className={chipGroup}>
            <ToggleChip active={showLines} label="Grid" onChange={setShowLines} />
            <ToggleChip active={showStations} label="Stations" onChange={setShowStations} />
            <ToggleChip active={showBuildings} label="Buildings" onChange={setShowBuildings} />
          </div>
        </div>
      )}

      {/* fullscreen button */}
      <MapFullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

      {/* attribution */}
      <MapAttribution />

      {/* watermark */}
      <MapWatermark />

      {/* grid legend */}
      {showGridLegend && <GridLegend />}

      {/* map content or fallback */}
      {webGLSupported === null ? (
        <MapPlaceholder icon={placeholderIcon} label={loadingLabel} animate />
      ) : webGLSupported && !mapError ? (
        <MapErrorBoundary fallbackIcon="map" title={errorTitle} description={errorDescription}>
          {children({
            showLines,
            showStations,
            showBuildings,
            isFullscreen,
            onError: handleMapError,
          })}
        </MapErrorBoundary>
      ) : (
        <MapPlaceholder
          icon={placeholderIcon}
          label={errorTitle}
          description="WebGL is not available in this browser."
        />
      )}

      {/* station/building info panel */}
      <StationInfoPanel
        station={selectedStation ?? null}
        hasData={
          !!(
            selectedStation?.id &&
            mapping.loaded &&
            (mapping.stationIds.has(selectedStation.id) ||
              mapping.buildingIds.has(selectedStation.id))
          )
        }
        disabled={isDemo}
      />
    </div>
  );
}
