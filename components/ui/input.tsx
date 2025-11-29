import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${React.useId()}`;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={props.type}
            className={cn(
              'flex h-10 w-full rounded-base border bg-white px-4 py-2 text-base',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-tertiary',
              'transition-colors',
              leftIcon && 'pl-10',
              (rightIcon || hasError) && 'pr-10',
              hasError
                ? 'border-danger focus:ring-danger'
                : 'border-input-border',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={
              errorMessage || helperText
                ? `${inputId}-${errorMessage ? 'error' : 'helper'}`
                : undefined
            }
            {...props}
          />
          {rightIcon && !hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {rightIcon}
            </div>
          )}
          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-danger">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          {!hasError && rightIcon && typeof rightIcon === 'object' && 'type' in rightIcon && rightIcon.type === CheckCircle2 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success">
              {rightIcon}
            </div>
          )}
        </div>
        {errorMessage && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-xs text-danger flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-xs text-text-secondary"
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

