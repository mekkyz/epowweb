'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { useTheme } from 'next-themes';
import { Spinner, EmptyState, ChartSkeleton } from '@/components/ui';
import { COLORS } from '@/lib/constants';
import { TrendingUp, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import clsx from 'clsx';

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

  useEffect(() => {
    setMounted(true);
    // Detect if running inside an iframe
    setIsInIframe(window.self !== window.top);
  }, []);

  // Debounce chart height update to avoid re-rendering during animation
  useEffect(() => {
    const targetHeight = isExpanded ? 580 : 340;
    const timer = setTimeout(() => {
      setChartHeight(targetHeight);
    }, 50);
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
        const series =
          (body?.data?.series ??
            body?.series ??
            []) as {
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

  if (!fetchUrl || !mounted) {
    return (
      <EmptyState
        title="Missing data source"
        className="h-[420px] w-full rounded-xl border border-border bg-surface"
      />
    );
  }

  // Calculate stats
  const validData = data.filter(d => d.powerKw !== null);
  const avgPower = validData.length > 0
    ? validData.reduce((sum, d) => sum + (d.powerKw || 0), 0) / validData.length
    : 0;
  const maxPower = validData.length > 0
    ? Math.max(...validData.map(d => d.powerKw || 0))
    : 0;

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
            {status === 'idle' && `${data.length} points`}
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

      {/* Chart */}
      <div className="p-4">
        {status === 'loading' && data.length === 0 ? (
          <ChartSkeleton />
        ) : (
          <div
            style={{
              height: isExpanded ? 580 : 340,
              minWidth: 280,
              minHeight: 240,
              transition: 'height 0.35s ease-out',
            }}
          >
            <ResponsiveContainer width="100%" height={chartHeight} minWidth={280} minHeight={240}>
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

                    // Check if this is a multi-day dataset by comparing first and last data points
                    const isMultiDay = data.length > 1 &&
                      data[0]?.start?.slice(0, 10) !== data[data.length - 1]?.start?.slice(0, 10);

                    const time = value.slice(11, 16); // HH:mm

                    if (isMultiDay) {
                      // For multi-day data, show date for morning times and key transition points
                      const hour = parseInt(time.slice(0, 2));

                      // Show date at midnight/early morning or every 12 hours
                      if ((hour >= 0 && hour < 6) || hour === 12) {
                        const month = value.slice(5, 7);
                        const day = value.slice(8, 10);
                        return `${month}/${day} ${time}`;
                      }
                      return time;
                    } else {
                      // Single day: just show time
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
                    style: { fill: chartColors.axisTick, fontSize: 11 }
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
                    style: { fill: chartColors.axisTick, fontSize: 11, textAnchor: 'middle' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: '8px',
                    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '12px',
                  }}
                  labelStyle={{
                    color: chartColors.tooltipText,
                    marginBottom: '8px',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}
                  labelFormatter={(label) => {
                    if (!label) return '';
                    // Format: "Jan 21, 2026 14:30"
                    const date = new Date(label);
                    return date.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
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
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
