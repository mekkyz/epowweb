"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import MapGL, { Layer, LayerProps, MapRef, NavigationControl, Source } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { Info } from "lucide-react";
import clsx from "clsx";
import { Spinner, useToast } from "@/components/ui";
import { MAP_STYLES } from "@/lib/constants";
import { downloadBlob } from "@/lib/download";
import { checkWebGLSupport } from "@/lib/webgl";
import { useAuth } from "@/context/AuthProvider";
import { MapAttribution, MapWatermark, StationInfoPanel } from "./map/MapOverlays";
import { useAltDragRotation, useFullscreen } from "./map/useMapControls";
import { useHeatmapData } from "./map/useHeatmapData";
import HeatmapControls from "./map/HeatmapControls";
import StationRankings from "./map/StationRankings";

export default function HeatmapExplorer() {
  const { resolvedTheme } = useTheme();
  const { success, error: showError } = useToast();
  const { isDemo } = useAuth();

  const data = useHeatmapData(showError);
  const { isFullscreen, toggleFullscreen } = useFullscreen("heatmap-explorer-container");
  const setupAltDrag = useAltDragRotation();
  const mapRef = useRef<MapRef | null>(null);

  const [hover, setHover] = useState<{
    stationId: string;
    valueKw: number;
    meters: number;
    x: number;
    y: number;
  } | null>(null);
  const [selected, setSelected] = useState<{ id: string; url: string } | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [thresholdMin, setThresholdMin] = useState(0);
  const [thresholdMax, setThresholdMax] = useState(800);
  const [canRenderMap] = useState<boolean>(() => checkWebGLSupport());

  const mapStyleType = (resolvedTheme === "light" ? "light" : "dark") as "light" | "dark";
  const mapStyle = useMemo(() => MAP_STYLES[mapStyleType], [mapStyleType]);

  const handleMapRef = useCallback(
    (ref: MapRef | null) => {
      mapRef.current = ref;
      if (ref) setupAltDrag(ref);
    },
    [setupAltDrag],
  );

  // Helper: lerp a value between min/max
  const tFrac = useCallback(
    (frac: number) => {
      return thresholdMin + frac * (thresholdMax - thresholdMin);
    },
    [thresholdMin, thresholdMax],
  );

  // Map layers
  const heatmapLayer: LayerProps = useMemo(
    () => ({
      id: "heat-layer",
      type: "heatmap",
      maxzoom: 17,
      paint: {
        "heatmap-weight": [
          "interpolate",
          ["exponential", 2],
          ["get", "valueKw"],
          tFrac(0),
          0.1,
          tFrac(0.06),
          0.3,
          tFrac(0.19),
          0.5,
          tFrac(0.38),
          0.75,
          tFrac(0.63),
          0.9,
          tFrac(1),
          1,
        ],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 12, 2.2, 14, 2.8, 16, 3.5],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0, 255, 0, 0)",
          0.08,
          "rgba(0, 255, 0, 0.8)",
          0.2,
          "rgba(128, 255, 0, 0.9)",
          0.35,
          "rgba(200, 255, 0, 0.95)",
          0.45,
          "rgba(255, 255, 0, 0.97)",
          0.55,
          "rgba(255, 200, 0, 1)",
          0.65,
          "rgba(255, 140, 0, 1)",
          0.75,
          "rgba(255, 70, 0, 1)",
          0.88,
          "rgba(255, 20, 0, 1)",
          1,
          "rgba(180, 0, 0, 1)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 12, 25, 14, 40, 16, 60, 18, 80],
        "heatmap-opacity": 0.85,
      },
    }),
    [tFrac],
  );

  const circleGlowLayer: LayerProps = useMemo(
    () => ({
      id: "heat-circles-glow",
      type: "circle",
      minzoom: 14,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 12, 16, 20, 18, 30],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "valueKw"],
          tFrac(0),
          "#00ff00",
          tFrac(0.33),
          "#ffff00",
          tFrac(0.5),
          "#ff9600",
          tFrac(0.83),
          "#ff1e00",
        ],
        "circle-opacity": 0.4,
        "circle-blur": 1,
      },
    }),
    [tFrac],
  );

  const circleLayer: LayerProps = useMemo(
    () => ({
      id: "heat-circles",
      type: "circle",
      minzoom: 14,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 5, 16, 10, 18, 16],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "valueKw"],
          tFrac(0),
          "#00ff00",
          tFrac(0.07),
          "#80ff00",
          tFrac(0.13),
          "#c8ff00",
          tFrac(0.19),
          "#ffff00",
          tFrac(0.25),
          "#ffc800",
          tFrac(0.38),
          "#ff9600",
          tFrac(0.5),
          "#ff5000",
          tFrac(0.63),
          "#ff1e00",
          tFrac(0.88),
          "#c80000",
        ],
        "circle-opacity": 1,
      },
    }),
    [tFrac],
  );

  const mapView = { longitude: 8.4346, latitude: 49.099, zoom: 14.5 };

  const downloadSlice = async (format: "json" | "csv") => {
    if (!data.selected) return;
    try {
      const res = await fetch(`/api/heatmap?timestamp=${encodeURIComponent(data.selected)}`);
      if (!res.ok) {
        showError("Failed to download data");
        return;
      }
      const body = await res.json();
      if (format === "json") {
        downloadBlob(
          JSON.stringify(body, null, 2),
          `heatmap-${data.selected}.json`,
          "application/json",
        );
      } else {
        const stations = body.data?.stations ?? [];
        const rows = ["stationId,totalKw,meterCount"];
        stations.forEach((s: { stationId: string; totalKw: number; meterCount: number }) => {
          rows.push(`${s.stationId},${s.totalKw},${s.meterCount}`);
        });
        downloadBlob(rows.join("\n"), `heatmap-${data.selected}.csv`, "text/csv");
      }
      success(`Downloaded heatmap data as ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Download failed:", err);
      showError("Failed to download data");
    }
  };

  const downloadPng = () => {
    const map = mapRef.current?.getMap();
    if (!map) {
      showError("Map not ready");
      return;
    }
    map.once("render", () => {
      try {
        const mapCanvas = map.getCanvas();
        const isDark = document.documentElement.classList.contains("dark");
        const scale = 2;
        const pad = 12 * scale;
        const headerH = 56 * scale;
        const footerH = 52 * scale;
        const w = mapCanvas.width;
        const h = mapCanvas.height;

        const canvas = document.createElement("canvas");
        canvas.width = w + 2 * pad;
        canvas.height = h + headerH + footerH;
        const ctx = canvas.getContext("2d")!;

        const bg = isDark ? "#0b1020" : "#ffffff";
        const textColor = isDark ? "#e2e8f0" : "#1a202c";
        const mutedColor = isDark ? "#94a3b8" : "#64748b";
        const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

        // Background
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Title
        ctx.fillStyle = textColor;
        ctx.font = `600 ${14 * scale}px "Work Sans", system-ui, sans-serif`;
        ctx.fillText("KIT-CN 20 kV Power Grid Heatmap", pad, pad + 16 * scale);

        // Timestamp next to title
        if (data.selected) {
          const titleW = ctx.measureText("KIT-CN 20 kV Power Grid Heatmap").width;
          ctx.fillStyle = mutedColor;
          ctx.font = `${10 * scale}px "Work Sans", system-ui, sans-serif`;
          const ts = new Date(data.selected).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          ctx.fillText(`  ·  ${ts}`, pad + titleW, pad + 16 * scale);
        }

        // Thin separator line
        ctx.fillStyle = borderColor;
        ctx.fillRect(pad, headerH - 4 * scale, canvas.width - 2 * pad, 1);

        // Map image
        ctx.drawImage(mapCanvas, pad, headerH);

        // Footer separator
        const footerTop = headerH + h;
        ctx.fillStyle = borderColor;
        ctx.fillRect(pad, footerTop + 4 * scale, canvas.width - 2 * pad, 1);

        // Legend gradient bar
        const legendY = footerTop + 12 * scale;
        const legendH = 10 * scale;
        const gradW = 180 * scale;
        const grad = ctx.createLinearGradient(pad, 0, pad + gradW, 0);
        grad.addColorStop(0, "#00ff00");
        grad.addColorStop(0.25, "#ffff00");
        grad.addColorStop(0.5, "#ffa500");
        grad.addColorStop(0.75, "#ff0000");
        grad.addColorStop(1, "#b40000");
        ctx.fillStyle = grad;
        ctx.fillRect(pad, legendY, gradW, legendH);

        // Legend labels below bar
        ctx.fillStyle = mutedColor;
        ctx.font = `${8 * scale}px "Work Sans", system-ui, sans-serif`;
        ctx.fillText(`${thresholdMin} kW`, pad, legendY + legendH + 12 * scale);
        const maxLabel = `${thresholdMax} kW`;
        ctx.fillText(
          maxLabel,
          pad + gradW - ctx.measureText(maxLabel).width,
          legendY + legendH + 12 * scale,
        );

        // Attribution on the right
        ctx.textAlign = "right";
        ctx.font = `${8 * scale}px "Work Sans", system-ui, sans-serif`;
        ctx.fillText("© ESA, IAI-KIT", canvas.width - pad, legendY + legendH + 12 * scale);
        ctx.textAlign = "left";

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `heatmap-${data.selected || "snapshot"}-${Date.now()}.png`;
        a.click();
        success("Map downloaded as PNG");
      } catch (err) {
        console.error("PNG export failed:", err);
        showError("Failed to export PNG");
      }
    });
    map.triggerRepaint();
  };

  return (
    <div
      id="heatmap-explorer-container"
      className={clsx(
        "space-y-4",
        isFullscreen && "bg-background fixed inset-0 z-50 flex h-screen w-screen flex-col p-4",
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
        onDownloadPng={downloadPng}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        isDemo={isDemo}
        hasSelected={!!data.selected}
      />

      {/* Map and List Grid */}
      <div
        className={clsx(
          "grid gap-6",
          isFullscreen ? "flex-1 lg:grid-cols-1" : "lg:grid-cols-[1.5fr,1fr]",
        )}
      >
        {/* Map Panel */}
        <div
          className={clsx(
            "border-border from-surface relative overflow-hidden rounded-xl border bg-gradient-to-br to-transparent",
            isFullscreen ? "h-[calc(100vh-200px)]" : "h-[520px]",
          )}
        >
          {data.loading && (
            <div className="pointer-events-none absolute top-3 right-3 z-10">
              <span className="bg-panel/90 text-foreground-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs shadow-sm shadow-black/10 backdrop-blur">
                <Spinner size="sm" /> Loading…
              </span>
            </div>
          )}
          {!canRenderMap ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="text-foreground-secondary text-sm">WebGL is not available</div>
              <div className="text-foreground-tertiary text-xs">
                Heatmap view requires WebGL support
              </div>
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
              interactiveLayerIds={["heat-circles"]}
              onClick={(evt) => {
                const f = evt.features?.[0];
                if (!f) {
                  setSelected(null);
                  return;
                }
                const props = f.properties as { stationId: string };
                setSelected({
                  id: props.stationId,
                  url: `/visualization/station/${props.stationId}`,
                });
              }}
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
              <NavigationControl position="bottom-right" style={{ marginBottom: "52px" }} />

              {/* Heatmap Legend */}
              {showLegend ? (
                <div
                  className="bg-panel/90 text-foreground pointer-events-auto absolute bottom-3 left-3 flex w-48 flex-col gap-2.5 rounded-lg p-3 shadow-sm shadow-black/10 backdrop-blur"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowLegend(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Heat Intensity
                  </button>
                  <p className="text-foreground-secondary text-[10px] leading-tight">
                    Power consumption/generation
                  </p>
                  <div className="flex flex-col gap-1">
                    <div
                      className="h-2.5 rounded-sm"
                      style={{
                        background:
                          "linear-gradient(to right, #00ff00, #ffff00, #ffa500, #ff0000, #b40000)",
                      }}
                    />
                    <div className="text-foreground-secondary flex justify-between font-mono text-[10px]">
                      <span>{thresholdMin} kW</span>
                      <span>{thresholdMax} kW</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-foreground-secondary text-[10px] font-medium">Min</span>
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
                        className="border-border bg-background text-foreground focus:border-accent h-6 w-20 rounded border px-1.5 text-right font-mono text-[11px] outline-none"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                      <span className="text-foreground-secondary text-[10px] font-medium">Max</span>
                      <input
                        type="number"
                        value={thresholdMax}
                        onChange={(e) => {
                          const v = Math.max(thresholdMin + 1, Number(e.target.value));
                          setThresholdMax(v);
                        }}
                        min={thresholdMin + 1}
                        step={10}
                        className="border-border bg-background text-foreground focus:border-accent h-6 w-20 rounded border px-1.5 text-right font-mono text-[11px] outline-none"
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      setThresholdMin(0);
                      setThresholdMax(800);
                    }}
                    className="text-foreground-tertiary hover:text-foreground-secondary self-end text-[10px] font-medium transition-colors"
                  >
                    Reset defaults
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLegend(true)}
                  className="bg-panel/90 text-foreground-secondary hover:bg-surface pointer-events-auto absolute bottom-3 left-3 flex h-[29px] w-[29px] items-center justify-center rounded-lg shadow-sm shadow-black/10 backdrop-blur transition-all"
                  aria-label="Show legend"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}

              <MapAttribution />
              <MapWatermark />

              {hover && (
                <div
                  className="bg-panel/90 text-foreground pointer-events-none absolute z-10 rounded-lg p-3 text-xs shadow-sm shadow-black/10 backdrop-blur"
                  style={{ left: hover.x + 12, top: hover.y + 12, fontFamily: "var(--font-sans)" }}
                >
                  <p className="text-foreground text-sm font-semibold">{hover.stationId}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-foreground-secondary">Power:</span>
                    <span className="text-foreground font-mono font-semibold">
                      {hover.valueKw.toFixed(2)} kW
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-foreground-secondary">Meters:</span>
                    <span className="text-foreground-secondary font-mono">{hover.meters}</span>
                  </div>
                </div>
              )}
              <StationInfoPanel
                station={selected}
                hasData={true}
                showPreview={false}
                disabled={isDemo}
              />
            </MapGL>
          )}
        </div>

        {/* Station List Panel - hidden in fullscreen */}
        {!isFullscreen && <StationRankings features={data.features} loading={data.loading} />}
      </div>
    </div>
  );
}
