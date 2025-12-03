'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type ColumnDef<T> = {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  mobileLabel?: string; // Label to show in mobile card view
};

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  mobileCardView?: boolean; // Enable mobile card view (default: true)
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  mobileCardView = true,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (columnId: string) => {
    setSortConfig((current) => {
      if (!current || current.key !== columnId) {
        return { key: columnId, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key: columnId, direction: 'desc' };
      }
      return null; // Reset sort
    });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return <ChevronsUpDown className="h-4 w-4 text-text-tertiary" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  const getCellValue = (item: T, column: ColumnDef<T>) => {
    if (column.cell) {
      return column.cell(item);
    }
    if (column.accessorKey) {
      return item[column.accessorKey as string];
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className={`hidden md:block overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`
                    px-6 py-4 text-left text-label-sm text-text-secondary font-semibold
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : ''}
                    ${column.width || ''}
                  `}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && getSortIcon(column.id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {sortedData.map((item, index) => (
              <tr
                key={index}
                className={`
                  transition-all duration-200
                  hover:bg-gradient-to-r hover:from-primary-50 hover:to-transparent
                  hover:shadow-sm
                  ${onRowClick ? 'cursor-pointer' : ''}
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 text-body-md text-text-primary whitespace-nowrap"
                  >
                    {getCellValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="md:hidden space-y-4">
          {sortedData.map((item, index) => (
            <div
              key={index}
              className={`
                bg-white rounded-lg shadow-card p-4
                border border-slate-200
                ${onRowClick ? 'cursor-pointer active:scale-[0.98]' : ''}
                transition-transform duration-200
              `}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => {
                const value = getCellValue(item, column);
                if (!value) return null;

                return (
                  <div key={column.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                    <span className="text-label-sm text-text-secondary font-medium">
                      {column.mobileLabel || column.header}
                    </span>
                    <span className="text-body-md text-text-primary text-right ml-4">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
