"use client";

import { useId, type ReactNode } from "react";
import clsx from "clsx";

// Shared style constants for form controls (Input, Select, etc.)
export const fieldFocusStyles = "focus:ring-2 focus:ring-accent/50 focus:border-accent/50";
export const fieldErrorStyles = "border-red-400/60 focus:ring-red-400/50 focus:border-red-400/50";
export const fieldDisabledStyles = "disabled:opacity-50 disabled:cursor-not-allowed";
export const fieldBaseStyles =
  "w-full rounded-lg border bg-surface text-foreground outline-none transition-colors";
export const fieldBorderStyles = "border-border hover:border-border-strong";

export const fieldSizeStyles = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export type FieldSize = "sm" | "md" | "lg";

interface FormFieldProps {
  id?: string;
  label?: string;
  helperText?: string;
  error?: boolean;
  className?: string;
  children: (props: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function FormField({ id, label, helperText, error, className, children }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const describedBy = helperText ? `${fieldId}-helper` : undefined;

  return (
    <div className={clsx("w-full", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-foreground-secondary mb-1.5 block text-xs tracking-[0.2em] uppercase"
        >
          {label}
        </label>
      )}
      {children({ id: fieldId, describedBy })}
      {helperText && (
        <p
          id={`${fieldId}-helper`}
          className={clsx("mt-1.5 text-xs", error ? "text-red-400" : "text-foreground-tertiary")}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
