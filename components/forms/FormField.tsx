'use client';

/**
 * Enhanced Reusable FormField component
 * Features:
 * - Real-time validation with debounce
 * - Animated error messages
 * - Support for async validation
 * - Success state indication
 * - Loading state for async validation
 * Integrates with react-hook-form
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormRegister, FieldError, UseFormSetError, UseFormClearErrors } from 'react-hook-form';
import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { motion, AnimatePresence } from 'framer-motion';

export interface AsyncValidator {
  validate: (value: string) => Promise<boolean | string>;
  debounceMs?: number;
}

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
  // Enhanced validation features
  asyncValidator?: AsyncValidator;
  setError?: UseFormSetError<any>;
  clearErrors?: UseFormClearErrors<any>;
  showSuccessState?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
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
  asyncValidator,
  setError,
  clearErrors,
  showSuccessState = false,
  validateOnChange = true,
  debounceMs = 500,
}: FormFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const debouncedValue = useDebounce(inputValue, asyncValidator?.debounceMs ?? debounceMs);

  // Handle async validation
  useEffect(() => {
    if (!asyncValidator || !debouncedValue || !validateOnChange) return;

    const validateAsync = async () => {
      setIsValidating(true);
      setIsValid(false);

      try {
        const result = await asyncValidator.validate(debouncedValue);

        if (result === true) {
          setIsValid(true);
          clearErrors?.(name);
        } else if (typeof result === 'string') {
          setIsValid(false);
          setError?.(name, {
            type: 'async',
            message: result,
          });
        } else {
          setIsValid(false);
          setError?.(name, {
            type: 'async',
            message: 'Validation failed',
          });
        }
      } catch (err) {
        setIsValid(false);
        setError?.(name, {
          type: 'async',
          message: 'Validation error occurred',
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateAsync();
  }, [debouncedValue, asyncValidator, name, setError, clearErrors, validateOnChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const inputClasses = `w-full transition-colors ${
    error ? 'border-red-500 focus:ring-red-500' :
    isValid && showSuccessState ? 'border-green-500 focus:ring-green-500' : ''
  } ${className}`;

  const registerProps = register ? register(name) : {} as ReturnType<UseFormRegister<any>> | Record<string, never>;

  // Merge onChange handlers
  const enhancedRegisterProps = asyncValidator && validateOnChange ? {
    ...registerProps,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      registerProps.onChange?.(e);
      handleInputChange(e);
    },
  } : registerProps;

  const renderValidationIcon = () => {
    if (isValidating) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </motion.div>
      );
    }

    if (isValid && showSuccessState && !error) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className={required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''}>
        {label}
      </Label>

      <div className="relative">
        {type === 'textarea' ? (
          <Textarea
            id={name}
            placeholder={placeholder}
            disabled={disabled || isValidating}
            className={inputClasses}
            {...enhancedRegisterProps}
          />
        ) : type === 'select' ? (
          <select
            id={name}
            disabled={disabled}
            className={`${inputClasses} rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500`}
            {...(registerProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        ) : (
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled || isValidating}
            className={inputClasses}
            {...enhancedRegisterProps}
          />
        )}

        {asyncValidator && type !== 'textarea' && type !== 'select' && renderValidationIcon()}
      </div>

      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error.message}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
