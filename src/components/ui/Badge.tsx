'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface text-foreground border-border',
  secondary: 'bg-surface-hover text-foreground border-border-strong ring-1 ring-border',
  success: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
  warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-400/30',
  error: 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-400/30',
  info: 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-400/30',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', icon, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center font-semibold rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {icon && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
export type { BadgeProps, BadgeSize };
