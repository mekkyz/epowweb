"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "clsx";
import {
  FormField,
  fieldBaseStyles,
  fieldFocusStyles,
  fieldErrorStyles,
  fieldDisabledStyles,
  fieldBorderStyles,
  fieldSizeStyles,
  type FieldSize,
} from "./form-utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options: SelectOption[];
  placeholder?: string;
  size?: FieldSize;
  error?: boolean;
  label?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      placeholder,
      size = "md",
      error = false,
      label,
      helperText,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    return (
      <FormField id={id} label={label} helperText={helperText} error={error}>
        {({ id: fieldId, describedBy }) => (
          <div className="relative">
            <select
              ref={ref}
              id={fieldId}
              className={clsx(
                fieldBaseStyles,
                "appearance-none",
                fieldFocusStyles,
                fieldDisabledStyles,
                error ? fieldErrorStyles : fieldBorderStyles,
                fieldSizeStyles[size],
                "pr-10",
                className,
              )}
              aria-invalid={error}
              aria-describedby={describedBy}
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
                className="text-foreground-tertiary h-4 w-4"
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
        )}
      </FormField>
    );
  },
);

Select.displayName = "Select";

export { Select };
export type { SelectProps, SelectOption };
