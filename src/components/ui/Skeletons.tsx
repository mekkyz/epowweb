'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Map as MapIcon } from 'lucide-react';

interface MapSkeletonProps {
  height?: string;
  className?: string;
}

export function MapSkeleton({ height = 'h-[520px]', className }: MapSkeletonProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-panel to-surface',
        height,
        className
      )}
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-surface-hover to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Center loading indicator */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface backdrop-blur">
          <MapIcon className="h-8 w-8 text-foreground-tertiary" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-2 w-32 animate-pulse rounded-full bg-surface-hover" />
          <div className="h-2 w-24 animate-pulse rounded-full bg-surface" />
        </div>
      </div>

      {/* Fake controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-xl bg-panel p-1 backdrop-blur">
        <div className="h-8 w-8 rounded-lg bg-surface-hover" />
        <div className="h-8 w-8 rounded-lg bg-surface-hover" />
      </div>
    </div>
  );
}

// Pre-computed heights for chart bars to avoid Math.random during render
const CHART_BAR_HEIGHTS = [45, 72, 38, 65, 55, 80, 42, 68, 35, 75, 50, 60];
// Pre-computed widths for card skeleton lines
const CARD_LINE_WIDTHS = [85, 70, 95, 75, 80];

interface ChartSkeletonProps {
  height?: string;
  className?: string;
}

export function ChartSkeleton({ height = 'h-[340px]', className }: ChartSkeletonProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border bg-surface p-4 backdrop-blur',
        height,
        className
      )}
    >
      {/* Header skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
          <div className="h-4 w-40 animate-pulse rounded bg-panel" />
        </div>
        <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
      </div>

      {/* Chart area skeleton */}
      <div className="relative h-[calc(100%-60px)]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-2 w-8 animate-pulse rounded bg-surface-hover" />
          ))}
        </div>

        {/* Chart area with fake bars */}
        <div className="ml-12 flex h-full items-end justify-around gap-2 border-b border-l border-border px-4 pb-6">
          {CHART_BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-full max-w-8 animate-pulse rounded-t bg-gradient-to-t from-emerald-500/20 to-emerald-500/5"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div className="ml-12 mt-2 flex justify-around">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-2 w-10 animate-pulse rounded bg-surface-hover" />
          ))}
        </div>
      </div>
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  lines?: number;
}

export function CardSkeleton({ className, lines = 3 }: CardSkeletonProps) {
  // Use pre-computed widths based on index
  const lineWidths = useMemo(
    () => CARD_LINE_WIDTHS.slice(0, lines),
    [lines]
  );

  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-panel p-4',
        className
      )}
    >
      <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
      <div className="mt-2 h-6 w-16 animate-pulse rounded bg-panel" />
      <div className="mt-3 space-y-2">
        {lineWidths.map((width, i) => (
          <div
            key={i}
            className="h-2 animate-pulse rounded bg-surface-hover"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}
