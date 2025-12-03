'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  showCharCount?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number; // ms
  onAutoSave?: () => Promise<void>;
  validation?: 'success' | 'error' | 'warning' | null;
  options?: { label: string; value: string }[]; // For select
  rows?: number; // For textarea
  className?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  required = false,
  disabled = false,
  placeholder,
  maxLength,
  showCharCount = false,
  autoSave = false,
  autoSaveDelay = 2000,
  onAutoSave,
  validation,
  options = [],
  rows = 4,
  className = '',
}: FormFieldProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  // Auto-save logic
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;

    const timer = setTimeout(async () => {
      if (localValue !== value) {
        setIsSaving(true);
        try {
          await onAutoSave();
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
          console.error('Auto-save failed:', err);
        } finally {
          setIsSaving(false);
        }
      }
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [localValue, autoSave, autoSaveDelay, onAutoSave, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const newValue = type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const charCount = String(value).length;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  const getStatusIcon = () => {
    if (isSaving) return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    if (saveSuccess) return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (error || validation === 'error') return <AlertCircle className="h-4 w-4 text-danger" />;
    if (validation === 'success') return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (validation === 'warning') return <AlertCircle className="h-4 w-4 text-warning" />;
    return null;
  };

  const getStatusMessage = () => {
    if (isSaving) return 'Saving...';
    if (saveSuccess) return 'Saved';
    if (error) return error;
    return null;
  };

  const inputClasses = `
    w-full px-4 py-2.5 rounded-lg border
    text-body-lg text-text-primary
    placeholder:text-text-tertiary
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-primary/20
    disabled:bg-slate-50 disabled:cursor-not-allowed
    ${error || validation === 'error' ? 'border-danger focus:border-danger' : 'border-input-border focus:border-primary'}
    ${validation === 'success' ? 'border-success focus:border-success' : ''}
    ${validation === 'warning' ? 'border-warning focus:border-warning' : ''}
  `;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-label-lg text-text-primary font-medium">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </Label>

        {/* Status Indicator */}
        {(autoSave || validation) && (
          <div className="flex items-center gap-1.5 text-label-sm">
            {getStatusIcon()}
            {getStatusMessage() && (
              <span className={`
                ${isSaving ? 'text-primary' : ''}
                ${saveSuccess ? 'text-success' : ''}
                ${error || validation === 'error' ? 'text-danger' : ''}
                ${validation === 'success' ? 'text-success' : ''}
                ${validation === 'warning' ? 'text-warning' : ''}
              `}>
                {getStatusMessage()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={rows}
            className={inputClasses}
          />
        ) : type === 'select' ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={inputClasses}
          >
            <option value="">{placeholder || 'Select an option'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            className={inputClasses}
          />
        )}
      </div>

      {/* Helper Text & Character Count */}
      <div className="flex items-start justify-between gap-2 min-h-[20px]">
        {/* Hint or Error */}
        {(hint || error) && (
          <div className="flex items-start gap-1.5">
            {hint && !error && <Info className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />}
            <p className={`text-body-sm ${error ? 'text-danger' : 'text-text-secondary'}`}>
              {error || hint}
            </p>
          </div>
        )}

        {/* Character Count */}
        {showCharCount && maxLength && (
          <p className={`text-label-xs ${isOverLimit ? 'text-danger' : 'text-text-tertiary'} flex-shrink-0`}>
            {charCount}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
