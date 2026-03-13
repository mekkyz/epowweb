"use client";

import { useState } from "react";
import clsx from "clsx";
import { Info, Maximize2, Minimize2 } from "lucide-react";
import { GRID_LEGEND } from "@/config/grid";

/* togglechip — on/off filter chip for map layers */
export function ToggleChip({
  active,
  label,
  onChange,
}: {
  active: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      className={clsx(
        "rounded-xl px-3 py-1 text-sm font-semibold transition",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-foreground-secondary hover:text-foreground",
      )}
      onClick={() => onChange(!active)}
    >
      {label}
    </button>
  );
}

/* map fullscreen button */
export function MapFullscreenButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="bg-panel/90 text-foreground hover:bg-panel pointer-events-auto absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg shadow-sm shadow-black/10 backdrop-blur transition-all hover:shadow-md"
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
    >
      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </button>
  );
}

/* map attribution — collapsible OpenFreeMap/OSM */
export function MapAttribution() {
  const [show, setShow] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-[10px] bottom-4 z-10">
      <button
        onClick={() => setShow(!show)}
        className={clsx(
          "bg-panel/90 flex h-[29px] items-center justify-center rounded-lg text-xs shadow-sm shadow-black/10 backdrop-blur transition-all",
          show
            ? "text-foreground w-auto gap-2 px-2.5"
            : "text-foreground-secondary hover:bg-surface w-[29px]",
        )}
        aria-label={show ? "Hide attribution" : "Show attribution"}
      >
        <Info className="h-3.5 w-3.5 flex-shrink-0" />
        {show && (
          <span>
            ©{" "}
            <a
              href="https://openfreemap.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OpenFreeMap
            </a>{" "}
            ·{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              OpenStreetMap
            </a>
          </span>
        )}
      </button>
    </div>
  );
}

/* map watermark — ESA/IAI-KIT copyright */
export function MapWatermark() {
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
      <div className="text-md text-foreground/25 font-semibold tracking-wide drop-shadow-sm select-none">
        © ESA, IAI-KIT
      </div>
    </div>
  );
}

/* grid legend — collapsible 20 kV Kabelringe legend */
export function GridLegend() {
  const [show, setShow] = useState(true);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10">
      <button
        onClick={() => setShow(!show)}
        className={clsx(
          "bg-panel/90 text-foreground flex items-center justify-center rounded-lg shadow-sm shadow-black/10 backdrop-blur transition-all",
          show
            ? "h-auto w-auto flex-col items-start gap-2 p-3"
            : "text-foreground-secondary hover:bg-surface h-[29px] w-[29px]",
        )}
        aria-label={show ? "Hide legend" : "Show legend"}
      >
        {show ? (
          <>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Info className="h-3.5 w-3.5" />
              20 kV Kabelringe
            </div>
            <div className="flex flex-col gap-1.5">
              {GRID_LEGEND.map((item) => (
                <div key={item.color} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full ring-1 ring-black/20"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground-secondary text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Info className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

/* station info panel — bottom overlay for selected station */
interface StationInfo {
  id?: string;
  url?: string;
  description?: string;
  group?: string;
}

export function StationInfoPanel({
  station,
  hasData = true,
  showPreview = true,
  disabled = false,
}: {
  station: StationInfo | null;
  hasData?: boolean;
  showPreview?: boolean;
  disabled?: boolean;
}) {
  if (!station) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
      <div className="bg-panel/90 text-foreground-secondary mx-auto w-fit rounded-lg p-4 text-sm shadow-sm shadow-black/10 backdrop-blur">
        <div className="flex items-stretch gap-4">
          <div className="flex flex-col justify-center">
            <p className="text-foreground text-lg font-semibold">{station.id}</p>
            <p className="text-foreground-secondary">
              {station.description || (station.id?.startsWith("G-") ? "Building" : "Power node")}
            </p>
            {station.group && <p className="text-foreground-secondary">{station.group}</p>}
          </div>

          {hasData && station.url && (
            <>
              <div className="bg-border w-px" />

              <div className="flex flex-col items-center justify-center gap-2">
                <span className="bg-surface text-foreground-tertiary rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
                  Visualization
                </span>
                <div className="pointer-events-auto flex flex-col gap-2">
                  {showPreview && (
                    <button
                      onClick={() => {
                        const el = document.getElementById("live-data");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                        window.dispatchEvent(
                          new CustomEvent("preview-visualization", { detail: station.url }),
                        );
                      }}
                      disabled={disabled}
                      title={disabled ? "Full access required" : "Preview visualization"}
                      className="border-border bg-background text-foreground hover:bg-surface inline-flex items-center justify-center rounded-lg border px-4 py-1.5 text-xs font-semibold shadow-sm shadow-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => window.open(station.url, "_blank", "noopener,noreferrer")}
                    disabled={disabled}
                    title={disabled ? "Full access required" : "Open visualization in new tab"}
                    className="border-border bg-background text-foreground hover:bg-surface inline-flex items-center justify-center rounded-lg border px-4 py-1.5 text-xs font-semibold shadow-sm shadow-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Open in Tab
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
