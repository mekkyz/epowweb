"use client";

import { type LucideIcon } from "lucide-react";
import clsx from "clsx";

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
        "border-border from-panel to-surface relative flex h-[520px] items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-br",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="border-border bg-surface flex h-16 w-16 items-center justify-center rounded-2xl border">
          <Icon className={clsx("text-foreground-tertiary h-8 w-8", animate && "animate-pulse")} />
        </div>
        <p className="text-foreground-secondary text-sm font-medium">{label}</p>
        {description && <p className="text-foreground-tertiary max-w-xs text-xs">{description}</p>}
      </div>
    </div>
  );
}
