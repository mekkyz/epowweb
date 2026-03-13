"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
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

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: FieldSize;
  error?: boolean;
  label?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = "md", error = false, label, helperText, className, id, ...props }, ref) => {
    return (
      <FormField id={id} label={label} helperText={helperText} error={error}>
        {({ id: fieldId, describedBy }) => (
          <input
            ref={ref}
            id={fieldId}
            className={clsx(
              fieldBaseStyles,
              "placeholder:text-foreground-tertiary",
              fieldFocusStyles,
              fieldDisabledStyles,
              error ? fieldErrorStyles : fieldBorderStyles,
              fieldSizeStyles[size],
              className,
            )}
            aria-invalid={error}
            aria-describedby={describedBy}
            {...props}
          />
        )}
      </FormField>
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
