"use client";

import clsx from "clsx";

const CHART_BAR_HEIGHTS = [45, 72, 38, 65, 55, 80, 42, 68, 35, 75, 50, 60];

interface ChartSkeletonProps {
  height?: string;
  className?: string;
}

export function ChartSkeleton({ height = "h-[340px]", className }: ChartSkeletonProps) {
  return (
    <div
      className={clsx(
        "border-border bg-surface relative overflow-hidden rounded-xl border p-4 backdrop-blur",
        height,
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="bg-surface-hover h-3 w-20 animate-pulse rounded" />
          <div className="bg-panel h-4 w-40 animate-pulse rounded" />
        </div>
        <div className="bg-surface-hover h-3 w-16 animate-pulse rounded" />
      </div>

      <div className="relative h-[calc(100%-60px)]">
        <div className="absolute top-0 left-0 flex h-full flex-col justify-between py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface-hover h-2 w-8 animate-pulse rounded" />
          ))}
        </div>

        <div className="border-border ml-12 flex h-full items-end justify-around gap-2 border-b border-l px-4 pb-6">
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

        <div className="mt-2 ml-12 flex justify-around">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-hover h-2 w-10 animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
