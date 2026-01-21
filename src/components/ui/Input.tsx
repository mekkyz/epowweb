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
  sm: 'px-2.5 py-1.5 text-xs',
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
            className="block text-xs uppercase tracking-[0.2em] text-white/60 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-black/40 text-white outline-none transition-colors',
            'placeholder:text-white/40',
            'focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-400/60 focus:ring-red-400/50 focus:border-red-400/50'
              : 'border-white/10 hover:border-white/20',
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
            className={clsx('mt-1.5 text-xs', error ? 'text-red-400' : 'text-white/50')}
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
