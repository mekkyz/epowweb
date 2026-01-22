'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  label?: string;
  helperText?: string;
}

const sizeStyles = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', error = false, label, helperText, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs uppercase tracking-[0.2em] text-foreground-secondary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-surface text-foreground outline-none transition-colors',
            'placeholder:text-foreground-tertiary',
            'focus:ring-2 focus:ring-accent/50 focus:border-accent/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400/60 focus:ring-red-400/50 focus:border-red-400/50'
              : 'border-border hover:border-border-strong',
            sizeStyles[size],
            className
          )}
          aria-invalid={error}
          aria-describedby={helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {helperText && (
          <p
            id={`${inputId}-helper`}
            className={clsx('mt-1.5 text-xs', error ? 'text-red-400' : 'text-foreground-tertiary')}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
