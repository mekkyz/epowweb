"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Badge } from "@/components/ui";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "success" | "warning" | "error" | "info";
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  label,
  icon: Icon,
  badge,
  badgeVariant = "default",
  showBack = false,
  backHref = "/",
  backLabel = "Home",
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx("mb-6", className)}>
      {(showBack || breadcrumbs) && (
        <div className="mb-4 flex items-center gap-3">
          {showBack && (
            <Link
              href={backHref}
              className="bg-surface text-foreground ring-border hover:bg-surface-hover hover:ring-border-strong inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold ring-1 transition-all"
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
                      className="text-foreground-secondary hover:text-foreground transition-colors"
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
            <Badge variant={badgeVariant} icon={Icon ? <Icon className="h-4 w-4" /> : undefined}>
              {badge}
            </Badge>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {label && (
            <div className="mb-1 flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-emerald-400" />}
              <p className="text-foreground-tertiary text-xs font-semibold tracking-widest uppercase">
                {label}
              </p>
            </div>
          )}
          <h1 className="font-display text-foreground text-2xl font-semibold sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="text-foreground-secondary mt-1 text-base">{subtitle}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
