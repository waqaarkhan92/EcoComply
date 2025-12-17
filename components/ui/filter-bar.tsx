'use client';

import { ReactNode, useState } from 'react';
import { Search, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectOption } from './select';

// =============================================================================
// TYPES
// =============================================================================

export interface FilterConfig {
  /** Unique key for this filter */
  key: string;
  /** Display label */
  label: string;
  /** Type of filter */
  type: 'select' | 'date' | 'dateRange' | 'search' | 'range' | 'multiSelect';
  /** Options for select type */
  options?: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: string;
  /** Min value for range type */
  min?: number;
  /** Max value for range type */
  max?: number;
  /** Step for range type */
  step?: number;
  /** Unit label for range type (e.g., '%', 'days') */
  unit?: string;
  /** Format value for display */
  formatValue?: (value: number) => string;
}

export interface RangeValue {
  from: string;
  to: string;
}

export interface FilterValues {
  [key: string]: string | string[] | RangeValue;
}

interface FilterBarProps {
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Current filter values */
  filterValues?: FilterValues;
  /** Filter change handler */
  onFilterChange?: (key: string, value: string | string[] | RangeValue) => void;
  /** Clear all filters handler */
  onClearFilters?: () => void;
  /** Show clear button */
  showClearButton?: boolean;
  /** Actions to show on the right (e.g., view toggle buttons) */
  actions?: ReactNode;
  /** Additional className */
  className?: string;
  /** Collapsible filters (for mobile) */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Standardized filter bar component for list/table pages
 *
 * @example
 * <FilterBar
 *   searchPlaceholder="Search obligations..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   filters={[
 *     {
 *       key: 'status',
 *       label: 'Status',
 *       type: 'select',
 *       options: [
 *         { value: '', label: 'All Statuses' },
 *         { value: 'PENDING', label: 'Pending' },
 *         { value: 'COMPLETED', label: 'Completed' },
 *       ],
 *     },
 *     {
 *       key: 'site_id',
 *       label: 'Site',
 *       type: 'select',
 *       options: sites.map(s => ({ value: s.id, label: s.name })),
 *     },
 *   ]}
 *   filterValues={filters}
 *   onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
 *   onClearFilters={() => setFilters({})}
 *   actions={
 *     <ViewToggle value={view} onChange={setView} />
 *   }
 * />
 */
export function FilterBar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearFilters,
  showClearButton = true,
  actions,
  className,
  collapsible = false,
  defaultCollapsed = true,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  const hasActiveFilters = Object.values(filterValues).some((v) => {
    if (typeof v === 'string') return v !== '';
    if (Array.isArray(v)) return v.length > 0;
    return v.from !== '' || v.to !== '';
  });

  const activeFilterCount = Object.values(filterValues).filter((v) => {
    if (typeof v === 'string') return v !== '';
    if (Array.isArray(v)) return v.length > 0;
    return v.from !== '' || v.to !== '';
  }).length;

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Main row: Search + Actions */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          {onSearchChange && (
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    'w-full h-10 pl-10 pr-4 rounded-lg border border-input-border',
                    'text-sm text-text-primary placeholder:text-text-tertiary',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'transition-colors'
                  )}
                />
                {searchValue && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filter toggle (mobile) or Actions */}
          <div className="flex items-center gap-2">
            {collapsible && filters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            )}
            {actions}
          </div>
        </div>
      </div>

      {/* Filters row */}
      {filters.length > 0 && (
        <div
          className={cn(
            'border-t border-gray-100 p-4',
            collapsible && !isExpanded && 'hidden sm:block'
          )}
        >
          <div className="flex flex-wrap gap-4 items-end">
            {filters.map((filter) => (
              <div key={filter.key} className="min-w-[160px] flex-1 max-w-[240px]">
                {filter.type === 'select' && filter.options && (
                  <Select
                    label={filter.label}
                    options={filter.options}
                    value={(filterValues[filter.key] as string) || ''}
                    onChange={(value) => onFilterChange?.(filter.key, value)}
                    placeholder={filter.placeholder || `All ${filter.label}`}
                    size="sm"
                  />
                )}

                {filter.type === 'date' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {filter.label}
                    </label>
                    <input
                      type="date"
                      value={(filterValues[filter.key] as string) || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className={cn(
                        'w-full h-8 px-3 rounded-lg border border-input-border',
                        'text-sm text-text-primary',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                      )}
                    />
                  </div>
                )}

                {filter.type === 'search' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {filter.label}
                    </label>
                    <input
                      type="text"
                      placeholder={filter.placeholder}
                      value={(filterValues[filter.key] as string) || ''}
                      onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                      className={cn(
                        'w-full h-8 px-3 rounded-lg border border-input-border',
                        'text-sm text-text-primary placeholder:text-text-tertiary',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                      )}
                    />
                  </div>
                )}

                {filter.type === 'dateRange' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {filter.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={(filterValues[filter.key] as RangeValue)?.from || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          from: e.target.value,
                          to: (filterValues[filter.key] as RangeValue)?.to || '',
                        })}
                        className={cn(
                          'flex-1 h-8 px-2 rounded-lg border border-input-border',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                        )}
                      />
                      <span className="text-text-tertiary text-sm">to</span>
                      <input
                        type="date"
                        value={(filterValues[filter.key] as RangeValue)?.to || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          from: (filterValues[filter.key] as RangeValue)?.from || '',
                          to: e.target.value,
                        })}
                        className={cn(
                          'flex-1 h-8 px-2 rounded-lg border border-input-border',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                        )}
                      />
                    </div>
                  </div>
                )}

                {filter.type === 'range' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {filter.label}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={filter.min}
                        max={filter.max}
                        step={filter.step || 1}
                        placeholder="Min"
                        value={(filterValues[filter.key] as RangeValue)?.from || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          from: e.target.value,
                          to: (filterValues[filter.key] as RangeValue)?.to || '',
                        })}
                        className={cn(
                          'w-20 h-8 px-2 rounded-lg border border-input-border',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                        )}
                      />
                      <span className="text-text-tertiary text-sm">to</span>
                      <input
                        type="number"
                        min={filter.min}
                        max={filter.max}
                        step={filter.step || 1}
                        placeholder="Max"
                        value={(filterValues[filter.key] as RangeValue)?.to || ''}
                        onChange={(e) => onFilterChange?.(filter.key, {
                          from: (filterValues[filter.key] as RangeValue)?.from || '',
                          to: e.target.value,
                        })}
                        className={cn(
                          'w-20 h-8 px-2 rounded-lg border border-input-border',
                          'text-sm text-text-primary',
                          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
                        )}
                      />
                      {filter.unit && (
                        <span className="text-text-tertiary text-sm">{filter.unit}</span>
                      )}
                    </div>
                  </div>
                )}

                {filter.type === 'multiSelect' && filter.options && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {filter.label}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {filter.options.map((option) => {
                        const currentValues = (filterValues[filter.key] as string[]) || [];
                        const isSelected = currentValues.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newValues = isSelected
                                ? currentValues.filter(v => v !== option.value)
                                : [...currentValues, option.value];
                              onFilterChange?.(filter.key, newValues);
                            }}
                            className={cn(
                              'px-2 py-1 text-xs rounded-full border transition-colors',
                              isSelected
                                ? 'bg-primary text-white border-primary'
                                : 'bg-white text-text-secondary border-gray-200 hover:border-gray-300'
                            )}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Clear filters button */}
            {showClearButton && hasActiveFilters && onClearFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ViewToggleProps {
  value: 'grid' | 'list';
  onChange: (value: 'grid' | 'list') => void;
}

/**
 * Grid/List view toggle buttons
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border border-input-border rounded-lg overflow-hidden">
      <button
        onClick={() => onChange('grid')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium transition-colors',
          value === 'grid'
            ? 'bg-primary text-white'
            : 'bg-white text-text-secondary hover:bg-gray-50'
        )}
      >
        Grid
      </button>
      <button
        onClick={() => onChange('list')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium transition-colors border-l border-input-border',
          value === 'list'
            ? 'bg-primary text-white'
            : 'bg-white text-text-secondary hover:bg-gray-50'
        )}
      >
        List
      </button>
    </div>
  );
}

interface ActiveFiltersProps {
  filters: FilterConfig[];
  values: FilterValues;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

/**
 * Display active filters as removable chips
 */
export function ActiveFilters({
  filters,
  values,
  onRemove,
  onClearAll,
}: ActiveFiltersProps) {
  const activeFilters = filters.filter((f) => {
    const value = values[f.key];
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    return value && (value.from !== '' || value.to !== '');
  });

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <span className="text-sm text-text-secondary">Active filters:</span>
      {activeFilters.map((filter) => {
        const value = values[filter.key];
        let displayValue = '';

        if (typeof value === 'string' && filter.options) {
          const option = filter.options.find((o) => o.value === value);
          displayValue = option?.label || value;
        } else if (typeof value === 'string') {
          displayValue = value;
        } else if (Array.isArray(value)) {
          // MultiSelect
          if (filter.options) {
            displayValue = value
              .map(v => filter.options?.find(o => o.value === v)?.label || v)
              .join(', ');
          } else {
            displayValue = value.join(', ');
          }
        } else if (value && typeof value === 'object') {
          // Range or DateRange
          const from = value.from;
          const to = value.to;
          if (from && to) {
            displayValue = `${from} - ${to}`;
          } else if (from) {
            displayValue = `>= ${from}`;
          } else if (to) {
            displayValue = `<= ${to}`;
          }
          if (filter.unit) {
            displayValue += ` ${filter.unit}`;
          }
        }

        return (
          <span
            key={filter.key}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
          >
            <span className="font-medium">{filter.label}:</span>
            <span>{displayValue}</span>
            <button
              onClick={() => onRemove(filter.key)}
              className="ml-1 hover:text-primary-dark"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <button
        onClick={onClearAll}
        className="text-sm text-text-secondary hover:text-text-primary underline"
      >
        Clear all
      </button>
    </div>
  );
}
