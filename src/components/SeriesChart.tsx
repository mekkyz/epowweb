'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useTheme } from 'next-themes';
import { Spinner, EmptyState, ChartSkeleton } from '@/components/ui';
import { COLORS } from '@/lib/constants';
import {
  TrendingUp,
  AlertCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react';
import clsx from 'clsx';

type ChartMouseEvent = {
  activeLabel?: string | number | null;
  [key: string]: unknown;
};

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartHeight, setChartHeight] = useState(340);
  const [isInIframe, setIsInIframe] = useState(false);

  // zoom state
  const [zoomLeft, setZoomLeft] = useState<number | null>(null);
  const [zoomRight, setZoomRight] = useState<number | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsInIframe(window.self !== window.top);
  }, []);

  // debounce chart height update
  useEffect(() => {
    const targetHeight = isExpanded ? 580 : 340;
    const timer = setTimeout(() => setChartHeight(targetHeight), 50);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Theme-aware chart colors
  const isDark = resolvedTheme === 'dark';
  const chartColors = {
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    axisStroke: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
    axisTick: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)',
    tooltipBg: isDark ? 'rgba(11, 16, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
    tooltipText: isDark ? '#fff' : '#000',
  };

  useEffect(() => {
    if (!fetchUrl) return;
    let active = true;
    const load = async () => {
      setStatus('loading');
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
          }))
        );
        setStatus('idle');
      } catch (err) {
        console.error(err);
        if (active) setStatus('error');
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

  // compute visible data based on zoom
  const visibleData = useMemo(() => {
    if (zoomLeft === null || zoomRight === null) return data;
    return data.slice(zoomLeft, zoomRight + 1);
  }, [data, zoomLeft, zoomRight]);

  const isZoomed = zoomLeft !== null && zoomRight !== null;

  // calculate zoom percentage
  const zoomPercentage = useMemo(() => {
    if (!isZoomed || data.length === 0) return 100;
    return Math.round((visibleData.length / data.length) * 100);
  }, [isZoomed, visibleData.length, data.length]);

  // reset zoom
  const resetZoom = useCallback(() => {
    setZoomLeft(null);
    setZoomRight(null);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, []);

  // reset zoom when data changes
  useEffect(() => {
    resetZoom();
  }, [fetchUrl, resetZoom]);

  // zoom by a factor (positive = zoom in, negative = zoom out)
  const zoomBy = useCallback(
    (factor: number, centerRatio = 0.5) => {
      if (data.length < 3) return;

      const currentLeft = zoomLeft ?? 0;
      const currentRight = zoomRight ?? data.length - 1;
      const currentRange = currentRight - currentLeft;
      const centerIndex = currentLeft + centerRatio * currentRange;

      const zoomFactor = factor > 0 ? 0.7 : 1.4;
      const newRange = Math.max(10, Math.min(data.length, currentRange * zoomFactor));

      let newLeft = Math.round(centerIndex - centerRatio * newRange);
      let newRight = Math.round(centerIndex + (1 - centerRatio) * newRange);

      // clamp to valid bounds
      if (newLeft < 0) {
        newRight = Math.min(data.length - 1, newRight - newLeft);
        newLeft = 0;
      }
      if (newRight >= data.length) {
        newLeft = Math.max(0, newLeft - (newRight - data.length + 1));
        newRight = data.length - 1;
      }

      // if fully zoomed out, reset
      if (newLeft === 0 && newRight === data.length - 1) {
        resetZoom();
      } else {
        setZoomLeft(newLeft);
        setZoomRight(newRight);
      }
    },
    [data.length, zoomLeft, zoomRight, resetZoom]
  );

  // native wheel event listener to properly prevent scroll in iframes
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || data.length < 3) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const chartWidth = rect.width - 70;
      const relativeX = Math.max(0, Math.min(1, (mouseX - 60) / chartWidth));

      zoomBy(e.deltaY < 0 ? 1 : -1, relativeX);
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelEvent);
  }, [data.length, zoomBy]);

  // pan handlers for dragging when zoomed
  const handlePanStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isZoomed) return;
      // only start pan with middle mouse or when holding shift
      if (e.button === 1 || e.shiftKey) {
        e.preventDefault();
        setIsPanning(true);
        setPanStartX(e.clientX);
      }
    },
    [isZoomed]
  );

  const handlePanMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning || panStartX === null || !isZoomed) return;

      const container = chartContainerRef.current;
      if (!container) return;

      const deltaX = e.clientX - panStartX;
      const chartWidth = container.getBoundingClientRect().width - 70;
      const currentRange = (zoomRight ?? 0) - (zoomLeft ?? 0);
      const panAmount = Math.round((deltaX / chartWidth) * currentRange * -1);

      if (Math.abs(panAmount) < 1) return;

      let newLeft = (zoomLeft ?? 0) + panAmount;
      let newRight = (zoomRight ?? 0) + panAmount;

      // clamp to bounds
      if (newLeft < 0) {
        newRight -= newLeft;
        newLeft = 0;
      }
      if (newRight >= data.length) {
        newLeft -= newRight - data.length + 1;
        newRight = data.length - 1;
      }

      setZoomLeft(Math.max(0, newLeft));
      setZoomRight(Math.min(data.length - 1, newRight));
      setPanStartX(e.clientX);
    },
    [isPanning, panStartX, isZoomed, zoomLeft, zoomRight, data.length]
  );

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStartX(null);
  }, []);

  // drag-to-select handlers
  const handleMouseDown = useCallback((e: ChartMouseEvent) => {
    if (e?.activeLabel !== undefined) {
      const label = String(e.activeLabel);
      setRefAreaLeft(label);
      setRefAreaRight(label);
      setIsDragging(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: ChartMouseEvent) => {
      if (isDragging && e?.activeLabel !== undefined) {
        setRefAreaRight(String(e.activeLabel));
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !refAreaLeft || !refAreaRight) {
      setIsDragging(false);
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    setIsDragging(false);

    // find indices in original data
    const leftIdx = data.findIndex((d) => d.start === refAreaLeft);
    const rightIdx = data.findIndex((d) => d.start === refAreaRight);

    if (leftIdx === -1 || rightIdx === -1) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const minIdx = Math.min(leftIdx, rightIdx);
    const maxIdx = Math.max(leftIdx, rightIdx);

    // only zoom if selection is meaningful
    if (maxIdx - minIdx >= 2) {
      setZoomLeft(minIdx);
      setZoomRight(maxIdx);
    }

    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [isDragging, refAreaLeft, refAreaRight, data]);

  // double-click to reset
  const handleDoubleClick = useCallback(() => {
    if (isZoomed) resetZoom();
  }, [isZoomed, resetZoom]);

  if (!fetchUrl || !mounted) {
    return (
      <EmptyState
        title="Missing data source"
        className="h-[420px] w-full rounded-xl border border-border bg-surface"
      />
    );
  }

  // calculate stats from visible data
  const validData = visibleData.filter((d) => d.powerKw !== null);
  const avgPower =
    validData.length > 0
      ? validData.reduce((sum, d) => sum + (d.powerKw || 0), 0) / validData.length
      : 0;
  const maxPower =
    validData.length > 0 ? Math.max(...validData.map((d) => d.powerKw || 0)) : 0;

  return (
    <div
      id="series-chart-container"
      className={clsx(
        'overflow-hidden rounded-xl border border-border bg-surface',
        isExpanded ? 'shadow-2xl' : 'shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {title ?? 'Time-series aggregation'}
            </p>
            <p className="text-xs text-foreground-tertiary">Power consumption in kW</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'idle' && data.length > 0 && (
            <>
              <div className="text-right">
                <p className="text-xs text-foreground-tertiary">Avg</p>
                <p className="font-mono text-sm text-emerald-400">{avgPower.toFixed(2)} kW</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-right">
                <p className="text-xs text-foreground-tertiary">Peak</p>
                <p className="font-mono text-sm text-amber-400">{maxPower.toFixed(2)} kW</p>
              </div>
              <div className="h-8 w-px bg-border" />
            </>
          )}
          <div className="rounded-md bg-surface px-2 py-1 text-xs text-foreground-secondary">
            {status === 'loading' && (
              <span className="flex items-center gap-1.5">
                <Spinner size="sm" /> Loading…
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1.5 text-red-400">
                <AlertCircle className="h-3 w-3" /> Failed
              </span>
            )}
            {status === 'idle' &&
              `${visibleData.length}${isZoomed ? ` / ${data.length}` : ''} points`}
          </div>
          {!isInIframe && (
            <button
              onClick={toggleExpanded}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-hover text-foreground-secondary transition-all hover:bg-surface hover:text-foreground"
              aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* chart */}
      <div className="relative p-4">
        {status === 'loading' && data.length === 0 ? (
          <ChartSkeleton />
        ) : (
          <>
            {/* zoom controls - floating overlay */}
            {data.length > 10 && (
              <div
                className={clsx(
                  'absolute right-6 top-6 z-10 flex items-center gap-1 rounded-lg border border-border bg-panel/95 p-1 shadow-lg backdrop-blur-sm transition-opacity',
                  isDragging ? 'opacity-30' : 'opacity-100'
                )}
              >
                <button
                  onClick={() => zoomBy(1)}
                  disabled={zoomPercentage <= 5}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom in"
                  title="Zoom in (scroll up)"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="min-w-[3rem] px-1 text-center font-mono text-xs text-foreground-secondary">
                  {zoomPercentage}%
                </div>
                <button
                  onClick={() => zoomBy(-1)}
                  disabled={!isZoomed}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom out"
                  title="Zoom out (scroll down)"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                {isZoomed && (
                  <>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <button
                      onClick={resetZoom}
                      className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-foreground-secondary transition-colors hover:bg-surface hover:text-foreground"
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

            {/* pan hint when zoomed */}
            {isZoomed && !isDragging && (
              <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-panel/90 px-3 py-1.5 text-xs text-foreground-tertiary shadow-lg backdrop-blur-sm">
                <span className="flex items-center gap-2">
                  <Move className="h-3.5 w-3.5" />
                  Shift+drag to pan • Double-click to reset
                </span>
              </div>
            )}

            <div
              ref={chartContainerRef}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
              className={clsx(
                'select-none outline-none',
                isPanning && 'cursor-grabbing',
                isZoomed && !isPanning && 'cursor-crosshair'
              )}
              style={{
                height: isExpanded ? 580 : 340,
                minWidth: 280,
                minHeight: 240,
                transition: 'height 0.35s ease-out',
              }}
            >
              <ResponsiveContainer width="100%" height={chartHeight} minWidth={280} minHeight={240} className="outline-none [&_svg]:outline-none">
                <AreaChart
                  data={visibleData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
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
                      if (!value) return '';

                      const isMultiDay =
                        visibleData.length > 1 &&
                        visibleData[0]?.start?.slice(0, 10) !==
                          visibleData[visibleData.length - 1]?.start?.slice(0, 10);

                      const time = value.slice(11, 16);

                      if (isMultiDay) {
                        const hour = parseInt(time.slice(0, 2));
                        if ((hour >= 0 && hour < 6) || hour === 12) {
                          const month = value.slice(5, 7);
                          const day = value.slice(8, 10);
                          return `${month}/${day} ${time}`;
                        }
                        return time;
                      } else {
                        return time;
                      }
                    }}
                    stroke={chartColors.axisStroke}
                    tick={{ fill: chartColors.axisTick, fontSize: 10 }}
                    height={60}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    label={{
                      value: 'Time',
                      position: 'insideBottom',
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
                      value: 'Power (kW)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: chartColors.axisTick, fontSize: 11, textAnchor: 'middle' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: '8px',
                      boxShadow: isDark
                        ? '0 4px 12px rgba(0,0,0,0.5)'
                        : '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '12px',
                    }}
                    labelStyle={{
                      color: chartColors.tooltipText,
                      marginBottom: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                    }}
                    labelFormatter={(label) => {
                      if (!label) return '';
                      const date = new Date(label);
                      return date.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      });
                    }}
                    formatter={(value: ValueType | undefined) => {
                      const val = value ?? '–';
                      return [`${val} kW`, 'Power Consumption'] as [string, string];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="powerKw"
                    stroke={COLORS.accent.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPower)"
                  />
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
