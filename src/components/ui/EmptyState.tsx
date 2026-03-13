"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";
import { FolderOpen } from "lucide-react";

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
          "border-border bg-surface flex flex-col items-center justify-center rounded-2xl border p-8 text-center",
          className,
        )}
        {...props}
      >
        <div className="text-accent mb-4">
          {icon || <FolderOpen className="h-12 w-12" aria-hidden="true" />}
        </div>
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-foreground-secondary mt-1 max-w-sm text-sm">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export { EmptyState };
export type { EmptyStateProps };
