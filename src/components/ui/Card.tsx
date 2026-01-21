'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-slate-900/70 border-white/10',
  elevated: 'bg-slate-900/70 border-white/10 shadow-xl shadow-black/40',
  glass: 'bg-white/5 border-white/10 backdrop-blur-sm',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl border',
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, icon, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx('flex items-center justify-between gap-3', className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-emerald-300 shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <div>
            {subtitle && (
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{subtitle}</p>
            )}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

type CardContentProps = HTMLAttributes<HTMLDivElement>;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={clsx('mt-4', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardContent };
export type { CardProps, CardHeaderProps, CardContentProps };
