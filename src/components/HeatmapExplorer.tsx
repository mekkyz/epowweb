'use client';

import { useCallback, useMemo, useState } from 'react';
import MapGL, { Layer, LayerProps, NavigationControl, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { useTheme } from 'next-themes';
import { Info } from 'lucide-react';
import clsx from 'clsx';
import { Spinner, useToast } from '@/components/ui';
import { MAP_STYLES } from '@/lib/constants';
import { downloadBlob } from '@/lib/download';
import { checkWebGLSupport } from '@/lib/webgl';
import { useAuth } from '@/context/AuthProvider';
import { MapAttribution, MapWatermark } from './map/MapOverlays';
import { useAltDragRotation, useFullscreen } from './map/useMapControls';
import { useHeatmapData } from './map/useHeatmapData';
import HeatmapControls from './map/HeatmapControls';
import StationRankings from './map/StationRankings';

export default function HeatmapExplorer() {
  const { resolvedTheme } = useTheme();
  const { success, error: showError } = useToast();
  const { isDemo } = useAuth();

  const data = useHeatmapData(showError);
  const { isFullscreen, toggleFullscreen } = useFullscreen('heatmap-explorer-container');
  const setupAltDrag = useAltDragRotation();

  const [hover, setHover] = useState<{
    stationId: string;
    valueKw: number;
    meters: number;
    x: number;
    y: number;
  } | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [thresholdMin, setThresholdMin] = useState(0);
  const [thresholdMax, setThresholdMax] = useState(800);
  const [canRenderMap] = useState<boolean>(() => checkWebGLSupport());

  const mapStyleType = (resolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType].detailed, [mapStyleType]);

  const handleMapRef = useCallback((ref: { getMap: () => maplibregl.Map } | null) => {
    if (ref) setupAltDrag(ref);
  }, [setupAltDrag]);

  // Helper: lerp a value between min/max
  const tFrac = useCallback((frac: number) => {
    return thresholdMin + frac * (thresholdMax - thresholdMin);
  }, [thresholdMin, thresholdMax]);

  // Map layers
  const heatmapLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-layer',
      type: 'heatmap',
      maxzoom: 17,
      paint: {
        'heatmap-weight': [
          'interpolate', ['exponential', 2], ['get', 'valueKw'],
          tFrac(0), 0.1, tFrac(0.06), 0.3, tFrac(0.19), 0.5,
          tFrac(0.38), 0.75, tFrac(0.63), 0.9, tFrac(1), 1,
        ],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 12, 2.2, 14, 2.8, 16, 3.5],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0, 255, 0, 0)', 0.08, 'rgba(0, 255, 0, 0.8)',
          0.2, 'rgba(128, 255, 0, 0.9)', 0.35, 'rgba(200, 255, 0, 0.95)',
          0.45, 'rgba(255, 255, 0, 0.97)', 0.55, 'rgba(255, 200, 0, 1)',
          0.65, 'rgba(255, 140, 0, 1)', 0.75, 'rgba(255, 70, 0, 1)',
          0.88, 'rgba(255, 20, 0, 1)', 1, 'rgba(180, 0, 0, 1)',
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 12, 25, 14, 40, 16, 60, 18, 80],
        'heatmap-opacity': 0.85,
      },
    }),
    [tFrac],
  );

  const circleGlowLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-circles-glow',
      type: 'circle',
      minzoom: 14,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 12, 16, 20, 18, 30],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'valueKw'],
          tFrac(0), '#00ff00', tFrac(0.33), '#ffff00',
          tFrac(0.5), '#ff9600', tFrac(0.83), '#ff1e00',
        ],
        'circle-opacity': 0.4,
        'circle-blur': 1,
      },
    }),
    [tFrac],
  );

  const circleLayer: LayerProps = useMemo(
    () => ({
      id: 'heat-circles',
      type: 'circle',
      minzoom: 14,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 5, 16, 10, 18, 16],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'valueKw'],
          tFrac(0), '#00ff00', tFrac(0.07), '#80ff00', tFrac(0.13), '#c8ff00',
          tFrac(0.19), '#ffff00', tFrac(0.25), '#ffc800', tFrac(0.38), '#ff9600',
          tFrac(0.5), '#ff5000', tFrac(0.63), '#ff1e00', tFrac(0.88), '#c80000',
        ],
        'circle-opacity': 1,
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 14, 2, 16, 3, 18, 4],
        'circle-stroke-color': mapStyleType === 'light' ? '#ffffff' : '#1a1a2e',
        'circle-stroke-opacity': 1,
      },
    }),
    [mapStyleType, tFrac],
  );

  const mapView = { longitude: 8.4346, latitude: 49.099, zoom: 14.5 };

  const downloadSlice = async (format: 'json' | 'csv') => {
    if (!data.selected) return;
    try {
      const res = await fetch(`/api/heatmap?timestamp=${encodeURIComponent(data.selected)}`);
      if (!res.ok) {
        showError('Failed to download data');
        return;
      }
      const body = await res.json();
      if (format === 'json') {
        downloadBlob(
          JSON.stringify(body, null, 2),
          `heatmap-${data.selected}.json`,
          'application/json',
        );
      } else {
        const stations = body.data?.stations ?? [];
        const rows = ['stationId,totalKw,meterCount'];
        stations.forEach((s: { stationId: string; totalKw: number; meterCount: number }) => {
          rows.push(`${s.stationId},${s.totalKw},${s.meterCount}`);
        });
        downloadBlob(rows.join('\n'), `heatmap-${data.selected}.csv`, 'text/csv');
      }
      success(`Downloaded heatmap data as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Download failed:', err);
      showError('Failed to download data');
    }
  };

  return (
    <div
      id="heatmap-explorer-container"
      className={clsx(
        'space-y-4',
        isFullscreen && 'fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background p-4'
      )}
    >
      <HeatmapControls
        selectedDate={data.selectedDate}
        onDateChange={data.onDateChange}
        minDateAvail={data.minDateAvail}
        maxDateAvail={data.maxDateAvail}
        availableDates={data.availableDates}
        stepByDay={data.stepByDay}
        sliderIndex={data.sliderIndex}
        dayTimestamps={data.dayTimestamps}
        currentTime={data.currentTime}
        minTime={data.minTime}
        maxTime={data.maxTime}
        stepByIndex={data.stepByIndex}
        onSliderChange={data.onSliderChange}
        isPlaying={data.isPlaying}
        setIsPlaying={data.setIsPlaying}
        playSpeed={data.playSpeed}
        setPlaySpeed={data.setPlaySpeed}
        stopPlayback={data.stopPlayback}
        onDownload={downloadSlice}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isDemo={isDemo}
        hasSelected={!!data.selected}
      />

      {/* Map and List Grid */}
      <div className={clsx(
        'grid gap-6',
        isFullscreen ? 'flex-1 lg:grid-cols-1' : 'lg:grid-cols-[1.5fr,1fr]'
      )}>
        {/* Map Panel */}
        <div className={clsx(
          'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-transparent',
          isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-[520px]'
        )}>
          {data.loading && (
            <div className="pointer-events-none absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-2 rounded-lg bg-panel/90 px-3 py-1.5 text-xs text-foreground-secondary shadow-sm shadow-black/10 backdrop-blur">
                <Spinner size="sm" /> Loading…
              </span>
            </div>
          )}
          {!canRenderMap ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="text-sm text-foreground-secondary">WebGL is not available</div>
              <div className="text-xs text-foreground-tertiary">Heatmap view requires WebGL support</div>
            </div>
          ) : (
            <MapGL
              ref={handleMapRef}
              reuseMaps={false}
              mapLib={maplibregl}
              mapStyle={mapStyle}
              initialViewState={mapView}
              minZoom={12}
              maxZoom={18}
              attributionControl={false}
              interactiveLayerIds={['heat-circles']}
              onMouseMove={(evt) => {
                const f = evt.features?.[0];
                if (!f) return setHover(null);
                const props = f.properties as {
                  stationId: string;
                  valueKw: number;
                  meters: number;
                };
                setHover({
                  stationId: props.stationId,
                  valueKw: props.valueKw,
                  meters: props.meters,
                  x: evt.point.x,
                  y: evt.point.y,
                });
              }}
              onMouseLeave={() => setHover(null)}
            >
              {data.features && (
                <Source id="heat-stations" type="geojson" data={data.features}>
                  <Layer {...heatmapLayer} />
                  <Layer {...circleGlowLayer} />
                  <Layer {...circleLayer} />
                </Source>
              )}
              <NavigationControl position="bottom-right" style={{ marginBottom: '52px' }} />

              {/* Heatmap Legend */}
              {showLegend ? (
                <div
                  className="pointer-events-auto absolute left-3 bottom-3 flex w-48 flex-col gap-2.5 rounded-lg bg-panel/90 p-3 text-foreground shadow-sm shadow-black/10 backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowLegend(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Heat Intensity
                  </button>
                  <p className="text-[10px] leading-tight text-foreground-secondary">Power consumption/generation</p>
                  <div className="flex flex-col gap-1">
                    <div
                      className="h-2.5 rounded-sm"
                      style={{
                        background: 'linear-gradient(to right, #00ff00, #ffff00, #ffa500, #ff0000, #b40000)',
                      }}
                    />
                    <div className="flex justify-between text-[10px] font-mono text-foreground-secondary">
                      <span>{thresholdMin} kW</span>
                      <span>{thresholdMax} kW</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-foreground-secondary">Min</span>
                      <input
                        type="number"
                        value={thresholdMin}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(Number(e.target.value), thresholdMax - 1));
                          setThresholdMin(v);
                        }}
                        min={0}
                        max={thresholdMax - 1}
                        step={10}
                        className="h-6 w-20 rounded border border-border bg-background px-1.5 text-right text-[11px] font-mono text-foreground outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-foreground-secondary">Max</span>
                      <input
                        type="number"
                        value={thresholdMax}
                        onChange={(e) => {
                          const v = Math.max(thresholdMin + 1, Number(e.target.value));
                          setThresholdMax(v);
                        }}
                        min={thresholdMin + 1}
                        step={10}
                        className="h-6 w-20 rounded border border-border bg-background px-1.5 text-right text-[11px] font-mono text-foreground outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => { setThresholdMin(0); setThresholdMax(800); }}
                    className="self-end text-[10px] font-medium text-foreground-tertiary transition-colors hover:text-foreground-secondary"
                  >
                    Reset defaults
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLegend(true)}
                  className="pointer-events-auto absolute left-3 bottom-3 flex h-[29px] w-[29px] items-center justify-center rounded-lg bg-panel/90 text-foreground-secondary shadow-sm shadow-black/10 backdrop-blur transition-all hover:bg-surface"
                  aria-label="Show legend"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}

              <MapAttribution />
              <MapWatermark />

              {hover && (
                <div
                  className="pointer-events-none absolute z-10 rounded-lg bg-panel/90 p-3 text-xs text-foreground shadow-sm shadow-black/10 backdrop-blur"
                  style={{ left: hover.x + 12, top: hover.y + 12, fontFamily: 'var(--font-sans)' }}
                >
                  <p className="text-sm font-semibold text-foreground">{hover.stationId}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-foreground-secondary">Power:</span>
                    <span className="font-mono font-semibold text-foreground">{hover.valueKw.toFixed(2)} kW</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-foreground-secondary">Meters:</span>
                    <span className="font-mono text-foreground-secondary">{hover.meters}</span>
                  </div>
                </div>
              )}
            </MapGL>
          )}
        </div>

        {/* Station List Panel - hidden in fullscreen */}
        {!isFullscreen && (
          <StationRankings features={data.features} loading={data.loading} />
        )}
      </div>
    </div>
  );
}
