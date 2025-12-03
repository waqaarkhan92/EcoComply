'use client';

/**
 * Reusable FormField component
 * Wraps input with label, error display, and help text
 * Integrates with react-hook-form
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { ReactNode } from 'react';

interface FormFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'url' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  helpText?: string;
  error?: FieldError;
  required?: boolean;
  disabled?: boolean;
  register?: UseFormRegister<any>;
  children?: ReactNode; // For select options or custom inputs
  className?: string;
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  helpText,
  error,
  required = false,
  disabled = false,
  register,
  children,
  className = '',
}: FormFieldProps) {
  const inputClasses = `w-full ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
        {label}
      </Label>

      {type === 'textarea' ? (
        <Textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          {...(register ? register(name) : {})}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          disabled={disabled}
          className={`${inputClasses} rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500`}
          {...(register ? register(name) : {})}
        >
          {children}
        </select>
      ) : (
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClasses}
          {...(register ? register(name) : {})}
        />
      )}

      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error.message}
        </p>
      )}
    </div>
  );
}
