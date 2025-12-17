/**
 * Checkbox Component
 * Reference: docs/specs/60_Frontend_UI_UX_Design_System.md
 */

'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, label, error, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.checked);
      }
    };

    const checkbox = (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            'flex items-center justify-center w-5 h-5 border-2 rounded transition-all',
            checked
              ? 'bg-primary border-primary'
              : 'bg-white border-input-border',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer hover:border-primary'
          )}
          onClick={() => !disabled && onChange?.(!checked)}
        >
          {checked && <Check className="h-3 w-3 text-white" />}
        </div>
      </div>
    );

    if (label) {
      return (
        <div className={cn('flex items-start gap-2', className)}>
          {checkbox}
          <label
            className={cn(
              'text-sm text-text-primary cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => !disabled && onChange?.(!checked)}
          >
            {label}
          </label>
          {error && <p className="text-sm text-danger mt-1">{error}</p>}
        </div>
      );
    }

    return checkbox;
  }
);

Checkbox.displayName = 'Checkbox';

