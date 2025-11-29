'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  fullWidth?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      fullWidth = true,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${React.useId()}`;
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text-primary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            id={textareaId}
            className={cn(
              'flex min-h-[80px] w-full rounded-base border bg-white px-4 py-2 text-base',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-background-tertiary',
              'transition-colors resize-y',
              hasError
                ? 'border-danger focus:ring-danger'
                : 'border-input-border',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={
              errorMessage || helperText
                ? `${textareaId}-${errorMessage ? 'error' : 'helper'}`
                : undefined
            }
            {...props}
          />
          {hasError && (
            <div className="absolute right-3 top-3 text-danger">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
        </div>
        {errorMessage && (
          <p
            id={`${textareaId}-error`}
            className="mt-1 text-xs text-danger flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p
            id={`${textareaId}-helper`}
            className="mt-1 text-xs text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

