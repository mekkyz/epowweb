"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useTheme } from "next-themes";
import { Spinner, EmptyState, ChartSkeleton } from "@/components/ui";
import { COLORS } from "@/lib/constants";
import {
  TrendingUp,
  AlertCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Spline,
  Minus,
  CircleDot,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";
import { useChartZoom } from "@/components/chart/useChartZoom";

interface SeriesPoint {
  start: string;
  powerKw: number | null;
}

interface Props {
  fetchUrl?: string;
  title?: string;
}

export default function SeriesChart({ fetchUrl, title }: Props) {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<SeriesPoint[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartHeight, setChartHeight] = useState(340);
  const [isInIframe, setIsInIframe] = useState(false);
  const [chartStyle, setChartStyle] = useState<"curve" | "line" | "point" | "column">("curve");
  const [filled, setFilled] = useState(true);

  const {
    chartContainerRef,
    visibleData,
    isZoomed,
    zoomPercentage,
    isDragging,
    isPanning,
    refAreaLeft,
    refAreaRight,
    zoomBy,
    resetZoom,
    containerHandlers,
    chartHandlers,
  } = useChartZoom({ data, resetKey: fetchUrl });

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
  }, []);

  useEffect(() => {
    const targetHeight = isExpanded ? 720 : 340;
    const timer = setTimeout(() => setChartHeight(targetHeight), 50);

    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Theme-aware chart colors
  const isDark = resolvedTheme === "dark";
  const chartColors = useMemo(
    () => ({
      grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
      axisStroke: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)",
      axisTick: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)",
      tooltipBg: isDark ? "rgba(11, 16, 32, 0.95)" : "rgba(255, 255, 255, 0.95)",
      tooltipBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)",
      tooltipText: isDark ? "#fff" : "#000",
    }),
    [isDark],
  );

  useEffect(() => {
    if (!fetchUrl) return;
    let active = true;
    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(fetchUrl);

        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const body = await res.json();
        const series = (body?.data?.series ?? body?.series ?? []) as {
          start: string;
          powerKw?: number | null;
          power?: number | null;
        }[];

        if (!active) return;
        setData(
          series.map((row) => ({
            start: row.start,
            powerKw: row.powerKw ?? row.power ?? null,
          })),
        );
        setStatus("idle");
      } catch (err) {
        console.error(err);
        if (active) setStatus("error");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [fetchUrl]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Memoized stats from visible data
  const stats = useMemo(() => {
    const valid = visibleData.filter((d) => d.powerKw !== null);

    if (valid.length === 0) return { min: 0, avg: 0, median: 0, max: 0 };

    const values = valid.map((d) => d.powerKw || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return {
      min: Math.min(...values),
      avg: sum / valid.length,
      median,
      max: Math.max(...values),
    };
  }, [visibleData]);

  if (!fetchUrl || !mounted) {
    return (
      <EmptyState
        title="Missing data source"
        className="border-border bg-surface h-[420px] w-full rounded-xl border"
      />
    );
  }

  return (
    <div
      id="series-chart-container"
      className="border-border dark:bg-background overflow-hidden rounded-xl border bg-white shadow-lg"
      style={{
        margin: isExpanded ? "0 -18vw" : "0 0",
        transition: "margin 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange: "margin",
      }}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              {title ?? "Time-series aggregation"}
            </p>
            <p className="text-foreground-tertiary text-xs">Power consumption in kW</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === "idle" && data.length > 0 && (
            <>
              {(
                [
                  { label: "Min", value: stats.min, color: "text-sky-400" },
                  { label: "Avg", value: stats.avg, color: "text-emerald-400" },
                  { label: "Median", value: stats.median, color: "text-violet-400" },
                  { label: "Max", value: stats.max, color: "text-amber-400" },
                ] as const
              ).map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-foreground-tertiary text-xs">{label}</p>
                    <p className={`font-mono text-sm ${color}`}>{value.toFixed(2)} kW</p>
                  </div>
                  <div className="bg-border h-8 w-px" />
                </div>
              ))}
            </>
          )}
          <div className="text-foreground-secondary rounded-md px-2 py-1 text-xs">
            {status === "loading" && (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" /> Loading…
              </span>
            )}
            {status === "error" && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="h-3 w-3" /> Failed
              </span>
            )}
            {status === "idle" &&
              `${visibleData.length}${isZoomed ? ` / ${data.length}` : ""} points`}
          </div>
          <div className="border-border-strong flex items-center gap-0.5 rounded-lg border p-0.5">
            {(
              [
                { key: "curve", icon: Spline, label: "Curve" },
                { key: "line", icon: Minus, label: "Line" },
                { key: "point", icon: CircleDot, label: "Point" },
                { key: "column", icon: BarChart3, label: "Column" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setChartStyle(key)}
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                  chartStyle === key
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-foreground-tertiary hover:text-foreground-secondary",
                )}
                aria-label={label}
                title={label}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <div className="bg-border mx-0.5 h-5 w-px" />
            <button
              onClick={() => setFilled((f) => !f)}
              className={clsx(
                "flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium transition-all",
                filled
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-tertiary hover:text-foreground-secondary",
              )}
              aria-label="Toggle filled"
              title="Toggle filled"
            >
              Filled
            </button>
          </div>
          {!isInIframe && (
            <button
              onClick={toggleExpanded}
              className="border-border-strong text-foreground-secondary hover:bg-surface hover:text-foreground flex h-7 w-7 items-center justify-center rounded-lg border transition-all"
              aria-label={isExpanded ? "Collapse chart" : "Expand chart"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative p-4">
        {status === "loading" && data.length === 0 ? (
          <ChartSkeleton />
        ) : (
          <>
            {/* Zoom controls overlay */}
            {data.length > 10 && (
              <div
                className={clsx(
                  "border-border bg-panel/95 absolute top-6 right-6 z-10 flex items-center gap-1 rounded-lg border p-1 shadow-lg backdrop-blur-sm transition-opacity",
                  isDragging ? "opacity-30" : "opacity-100",
                )}
              >
                <button
                  onClick={() => zoomBy(1)}
                  disabled={zoomPercentage <= 5}
                  className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom in"
                  title="Zoom in (scroll up)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="text-foreground-secondary min-w-[3rem] px-1 text-center font-mono text-xs">
                  {zoomPercentage}%
                </div>
                <button
                  onClick={() => zoomBy(-1)}
                  disabled={!isZoomed}
                  className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom out"
                  title="Zoom out (scroll down)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                {isZoomed && (
                  <>
                    <div className="bg-border mx-1 h-5 w-px" />
                    <button
                      onClick={resetZoom}
                      className="text-foreground-secondary hover:bg-surface hover:text-foreground flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors"
                      aria-label="Reset zoom"
                      title="Reset zoom (double-click)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Pan hint when zoomed */}
            {isZoomed && !isDragging && (
              <div className="border-border bg-panel/90 text-foreground-tertiary absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm">
                <span className="flex items-center gap-2">
                  <Move className="h-3.5 w-3.5" />
                  Shift+drag to pan • Double-click to reset
                </span>
              </div>
            )}

            <div
              ref={chartContainerRef}
              {...containerHandlers}
              className={clsx(
                "outline-none select-none",
                isPanning && "cursor-grabbing",
                isZoomed && !isPanning && "cursor-crosshair",
              )}
              style={{
                height: isExpanded ? 720 : 340,
                minWidth: 280,
                minHeight: 240,
                transition: "height 0.35s ease-out",
              }}
            >
              <ResponsiveContainer
                width="100%"
                height={chartHeight}
                minWidth={280}
                minHeight={240}
                className="outline-none [&_svg]:outline-none"
              >
                <ComposedChart
                  data={visibleData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  barCategoryGap={chartStyle === "column" ? "5%" : undefined}
                  {...chartHandlers}
                >
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.accent.primary} stopOpacity={0.9} />
                      <stop offset="95%" stopColor={COLORS.accent.primary} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                    strokeWidth={1}
                    vertical={true}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="start"
                    tickFormatter={(value) => {
                      if (!value) return "";
                      const isMultiDay =
                        visibleData.length > 1 &&
                        visibleData[0]?.start?.slice(0, 10) !==
                          visibleData[visibleData.length - 1]?.start?.slice(0, 10);
                      const time = value.slice(11, 16);

                      if (isMultiDay) {
                        const hour = parseInt(time.slice(0, 2));

                        if ((hour >= 0 && hour < 6) || hour === 12) {
                          return `${value.slice(5, 7)}/${value.slice(8, 10)} ${time}`;
                        }

                        return time;
                      }

                      return time;
                    }}
                    stroke={chartColors.axisStroke}
                    tick={{ fill: chartColors.axisTick, fontSize: 10 }}
                    height={60}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    label={{
                      value: "Time",
                      position: "insideBottom",
                      offset: -10,
                      style: { fill: chartColors.axisTick, fontSize: 11 },
                    }}
                  />
                  <YAxis
                    stroke={chartColors.axisStroke}
                    tickFormatter={(v) => `${v} kW`}
                    width={60}
                    tick={{ fill: chartColors.axisTick, fontSize: 11 }}
                    label={{
                      value: "Power (kW)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: chartColors.axisTick, fontSize: 11, textAnchor: "middle" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: "8px",
                      boxShadow: isDark
                        ? "0 4px 12px rgba(0,0,0,0.5)"
                        : "0 4px 12px rgba(0,0,0,0.15)",
                      padding: "12px",
                    }}
                    labelStyle={{
                      color: chartColors.tooltipText,
                      marginBottom: "8px",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                    labelFormatter={(label) => {
                      if (!label) return "";
                      const date = new Date(label);

                      return date.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });
                    }}
                    formatter={(value: ValueType | undefined) => {
                      const val = value ?? "–";

                      return [`${val} kW`, "Power Consumption"] as [string, string];
                    }}
                  />
                  {chartStyle === "curve" && (
                    <Area
                      type="monotone"
                      dataKey="powerKw"
                      stroke={COLORS.accent.primary}
                      strokeWidth={2}
                      fillOpacity={filled ? 1 : 0}
                      fill="url(#colorPower)"
                    />
                  )}
                  {chartStyle === "line" && filled && (
                    <Area
                      type="linear"
                      dataKey="powerKw"
                      stroke={COLORS.accent.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPower)"
                    />
                  )}
                  {chartStyle === "line" && !filled && (
                    <Line
                      type="linear"
                      dataKey="powerKw"
                      stroke={COLORS.accent.primary}
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                  {chartStyle === "point" && (
                    <Line
                      type="linear"
                      dataKey="powerKw"
                      stroke="transparent"
                      dot={{
                        fill: filled ? COLORS.accent.primary : "transparent",
                        stroke: COLORS.accent.primary,
                        strokeWidth: filled ? 0 : 1,
                        r: 1,
                      }}
                      activeDot={{
                        fill: COLORS.accent.primary,
                        stroke: COLORS.accent.primary,
                        r: 2.5,
                      }}
                      isAnimationActive={false}
                    />
                  )}
                  {chartStyle === "column" && (
                    <Bar
                      dataKey="powerKw"
                      fill={COLORS.accent.primary}
                      fillOpacity={filled ? 0.8 : 0.15}
                      stroke={filled ? "none" : COLORS.accent.primary}
                      strokeWidth={filled ? 0 : 1}
                      radius={[1, 1, 0, 0]}
                      maxBarSize={
                        visibleData.length > 300
                          ? 1
                          : visibleData.length > 100
                            ? 2
                            : visibleData.length > 30
                              ? 4
                              : 10
                      }
                      barSize={visibleData.length > 300 ? 1 : undefined}
                    />
                  )}
                  {refAreaLeft && refAreaRight && (
                    <ReferenceArea
                      x1={refAreaLeft}
                      x2={refAreaRight}
                      stroke={COLORS.accent.primary}
                      strokeOpacity={0.6}
                      strokeWidth={1}
                      fill={COLORS.accent.primary}
                      fillOpacity={0.15}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
