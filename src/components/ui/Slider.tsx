'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type' | 'value'> {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ min, max, value, onChange, step = 1, disabled, className, ...props }, ref) => {
    const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        className={clsx('slider-track', className)}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
export type { SliderProps };
