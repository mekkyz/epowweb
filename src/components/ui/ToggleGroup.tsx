'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface ToggleOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface ToggleGroupProps<T extends string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

function ToggleGroupInner<T extends string>(
  { options, value, onChange, size = 'md', className, ...props }: ToggleGroupProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  return (
    <div
      ref={ref}
      role="group"
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl bg-surface p-1 shadow-sm shadow-black/10 backdrop-blur dark:shadow-black/30',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-lg font-medium transition-colors',
            sizeStyles[size],
            value === option.value
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
              : 'bg-transparent text-foreground-secondary hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ToggleGroup = forwardRef(ToggleGroupInner) as <T extends string>(
  props: ToggleGroupProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement;

export { ToggleGroup };
export type { ToggleGroupProps, ToggleOption };
