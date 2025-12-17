'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  /** Options to display */
  options: SelectOption[];
  /** Label for the select */
  label?: string;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
  /** Custom onChange handler */
  onChange?: (value: string) => void;
}

/**
 * Styled select component that replaces raw HTML selects
 *
 * @example
 * <Select
 *   label="Status"
 *   options={[
 *     { value: '', label: 'All Statuses' },
 *     { value: 'PENDING', label: 'Pending' },
 *     { value: 'COMPLETED', label: 'Completed' },
 *   ]}
 *   value={status}
 *   onChange={setStatus}
 * />
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      label,
      placeholder,
      error,
      helperText,
      size = 'md',
      fullWidth = true,
      className,
      disabled,
      onChange,
      value,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'h-8 text-sm px-3 pr-8',
      md: 'h-10 text-sm px-4 pr-10',
      lg: 'h-12 text-base px-4 pr-10',
    };

    const iconSizes = {
      sm: 'h-4 w-4 right-2',
      md: 'h-4 w-4 right-3',
      lg: 'h-5 w-5 right-3',
    };

    return (
      <div className={cn(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            className={cn(
              'appearance-none w-full rounded-lg border bg-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              sizeStyles[size],
              error
                ? 'border-danger focus:ring-danger'
                : 'border-input-border hover:border-gray-400',
              disabled && 'bg-gray-50 text-text-tertiary cursor-not-allowed',
              // Style the placeholder option differently
              !value && 'text-text-tertiary',
              value && 'text-text-primary',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled={props.required}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron icon */}
          <ChevronDown
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary',
              iconSizes[size],
              disabled && 'opacity-50'
            )}
          />
        </div>

        {/* Error or helper text */}
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-danger' : 'text-text-secondary'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

/**
 * Multi-select variant (for future implementation)
 */
export interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  placeholder?: string;
}

// TODO: Implement MultiSelect component
