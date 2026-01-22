'use client';

import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  label?: string;
  helperText?: string;
}

const sizeStyles = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      placeholder,
      size = 'md',
      error = false,
      label,
      helperText,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs uppercase tracking-[0.2em] text-foreground-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={clsx(
              'w-full appearance-none rounded-lg border bg-surface text-foreground outline-none transition-colors',
              'focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-red-400/60 focus:ring-red-400/50 focus:border-red-400/50'
                : 'border-border hover:border-border-strong',
              sizeStyles[size],
              'pr-10', // Space for the chevron
              className
            )}
            aria-invalid={error}
            aria-describedby={helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="bg-background text-foreground"
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className="h-4 w-4 text-foreground-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {helperText && (
          <p
            id={`${selectId}-helper`}
            className={clsx(
              'mt-1.5 text-xs',
              error ? 'text-red-400' : 'text-foreground-tertiary'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export type { SelectProps, SelectOption };
