'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '@/components/ui';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Small label above title */
  label?: string;
  /** Icon to display next to label */
  icon?: LucideIcon;
  /** Badge text (e.g., "HEATMAP", "METER VIEW") */
  badge?: string;
  /** Badge variant */
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  /** Show back button */
  showBack?: boolean;
  /** Custom back URL (default: /) */
  backHref?: string;
  /** Custom back label */
  backLabel?: string;
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Right side actions */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  label,
  icon: Icon,
  badge,
  badgeVariant = 'default',
  showBack = false,
  backHref = '/',
  backLabel = 'Home',
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx('mb-6', className)}>
      {/* Navigation Row */}
      {(showBack || breadcrumbs) && (
        <div className="mb-4 flex items-center gap-3">
          {showBack && (
            <Link
              href={backHref}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3 text-sm font-semibold text-foreground ring-1 ring-border transition-all hover:bg-surface-hover hover:ring-border-strong"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          )}

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((item, idx) => (
                <span key={item.label} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-foreground-tertiary">/</span>}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="text-foreground-secondary transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-foreground-tertiary">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          {badge && (
            <Badge
              variant={badgeVariant}
              icon={Icon ? <Icon className="h-4 w-4" /> : undefined}
            >
              {badge}
            </Badge>
          )}
        </div>
      )}

      {/* Title Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {label && (
            <div className="mb-1 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
              <p className="text-xs font-semibold uppercase tracking-widest text-foreground-tertiary">
                {label}
              </p>
            </div>
          )}
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-base text-foreground-secondary">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
