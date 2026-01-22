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
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

function ToggleGroupInner<T extends string>(
  {
    options,
    value,
    onChange,
    variant = 'dark',
    size = 'md',
    className,
    ...props
  }: ToggleGroupProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const isLight = variant === 'light';

  const activeStyles = isLight
    ? 'bg-slate-800 text-white shadow-sm'
    : 'bg-background text-foreground shadow-sm ring-1 ring-border';

  const inactiveStyles = isLight
    ? 'bg-transparent text-slate-600 hover:text-slate-900'
    : 'bg-transparent text-foreground-secondary hover:text-foreground';

  const containerStyles = isLight
    ? 'bg-white/90 shadow-sm shadow-black/10 backdrop-blur'
    : 'bg-surface shadow-sm shadow-black/10 dark:shadow-black/30 backdrop-blur';

  return (
    <div
      ref={ref}
      role="group"
      className={clsx('inline-flex items-center gap-1 rounded-xl p-1', containerStyles, className)}
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
            value === option.value ? activeStyles : inactiveStyles
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const ToggleGroup = forwardRef(ToggleGroupInner) as <T extends string>(
  props: ToggleGroupProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export { ToggleGroup };
export type { ToggleGroupProps, ToggleOption };
