'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Trash2, Archive, Tag, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  actions: BulkAction[];
  allSelected?: boolean;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  actions,
  allSelected = false,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-40',
          'bg-charcoal text-white rounded-xl shadow-2xl',
          'px-4 py-3 flex items-center gap-4',
          'border border-gray-700',
          className
        )}
      >
        {/* Selection info */}
        <div className="flex items-center gap-3 pr-4 border-r border-gray-600">
          <button
            onClick={onDeselectAll}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          {!allSelected && selectedCount < totalCount && (
            <button
              onClick={onSelectAll}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Select all {totalCount}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions.slice(0, 4).map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant === 'danger' ? 'danger' : 'ghost'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  action.variant !== 'danger' && 'text-white hover:bg-gray-700'
                )}
              >
                {Icon && <Icon className="h-4 w-4 mr-1.5" />}
                {action.label}
              </Button>
            );
          })}

          {actions.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-gray-700"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Common bulk action configurations
export const commonBulkActions = {
  markComplete: (onAction: () => void): BulkAction => ({
    id: 'mark-complete',
    label: 'Mark Complete',
    icon: CheckCircle2,
    onClick: onAction,
  }),

  archive: (onAction: () => void): BulkAction => ({
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    onClick: onAction,
  }),

  delete: (onAction: () => void): BulkAction => ({
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    onClick: onAction,
    variant: 'danger',
  }),

  addTag: (onAction: () => void): BulkAction => ({
    id: 'add-tag',
    label: 'Add Tag',
    icon: Tag,
    onClick: onAction,
  }),

  share: (onAction: () => void): BulkAction => ({
    id: 'share',
    label: 'Share',
    icon: Share2,
    onClick: onAction,
  }),

  export: (onAction: () => void): BulkAction => ({
    id: 'export',
    label: 'Export',
    icon: Share2,
    onClick: onAction,
  }),
};

// Hook for managing bulk selection
import { useState, useCallback, useMemo } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [allSelected, deselectAll, selectAll]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    toggleAll,
    selectedItems,
  };
}
