'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-border bg-surface',
          className
        )}
        {...props}
      >
        <div className="mb-4 text-accent">
          {icon || <FolderOpen className="h-12 w-12" aria-hidden="true" />}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-foreground-secondary max-w-sm">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
export type { EmptyStateProps };
