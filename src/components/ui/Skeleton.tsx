'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

const variantStyles = {
  default: 'rounded-lg',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
};

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'default', width, height, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'animate-pulse bg-white/10',
          variantStyles[variant],
          className
        )}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Pre-built skeleton patterns for common use cases
const SkeletonText = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { lines?: number }
>(({ lines = 3, className, ...props }, ref) => {
  return (
    <div ref={ref} className={clsx('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  );
});

SkeletonText.displayName = 'SkeletonText';

const SkeletonCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl border border-white/10 bg-slate-900/70 p-4 space-y-4',
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} className="w-1/3" />
            <Skeleton height={12} className="w-1/2" />
          </div>
        </div>
        <SkeletonText lines={2} />
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonChart = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton height={12} width={80} />
            <Skeleton height={16} width={140} />
          </div>
          <Skeleton height={12} width={60} />
        </div>
        <Skeleton height={280} className="w-full" />
      </div>
    );
  }
);

SkeletonChart.displayName = 'SkeletonChart';

export { Skeleton, SkeletonText, SkeletonCard, SkeletonChart };
export type { SkeletonProps };
