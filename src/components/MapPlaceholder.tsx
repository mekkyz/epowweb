'use client';

import { type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface MapPlaceholderProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  animate?: boolean;
  className?: string;
}

export default function MapPlaceholder({
  icon: Icon,
  label,
  description,
  animate = false,
  className,
}: MapPlaceholderProps) {
  return (
    <div
      className={clsx(
        'relative flex h-[520px] items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-panel to-surface',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <Icon className={clsx('h-8 w-8 text-foreground-tertiary', animate && 'animate-pulse')} />
        </div>
        <p className="text-sm font-medium text-foreground-secondary">{label}</p>
        {description && (
          <p className="max-w-xs text-xs text-foreground-tertiary">{description}</p>
        )}
      </div>
    </div>
  );
}
