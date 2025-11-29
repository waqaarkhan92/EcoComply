'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  className,
  label,
  error,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (!options.find((opt) => opt.value === optionValue)?.disabled) {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'w-full px-4 py-2 text-left bg-white border rounded-lg flex items-center justify-between transition-colors',
          error
            ? 'border-danger focus:ring-danger focus:ring-2'
            : 'border-input-border focus:ring-primary focus:ring-2',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'hover:border-primary cursor-pointer'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || 'Select option'}
      >
        <span className={cn('truncate', !selectedOption && 'text-text-tertiary')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-tertiary flex-shrink-0 ml-2 transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-input-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {searchable && (
            <div className="p-2 border-b border-input-border">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-input-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          )}
          <ul role="listbox" className="py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-2 text-sm text-text-tertiary">No options found</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleOptionClick(option.value)}
                  className={cn(
                    'px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors',
                    value === option.value
                      ? 'bg-primary text-white'
                      : 'hover:bg-background-tertiary text-text-primary',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                  <span className="flex-1">{option.label}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

