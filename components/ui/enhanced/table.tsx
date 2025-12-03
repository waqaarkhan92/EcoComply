import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface EnhancedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function EnhancedTable<T extends { id: string }>({
  columns,
  data,
  onSort,
  sortKey,
  sortDirection,
  onRowClick,
  emptyMessage = 'No data available',
}: EnhancedTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-4 w-4 text-text-tertiary" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary" />
    );
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-card p-12 text-center">
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    column.sortable && 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.title}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-all duration-200',
                  'hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent',
                  'group',
                  onRowClick && 'cursor-pointer',
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('py-4 px-6', column.className)}
                  >
                    {column.render
                      ? column.render((row as any)[column.key], row)
                      : (row as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Mobile Card View for Tables
interface MobileCardViewProps<T> {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
}

export function MobileCardView<T extends { id: string }>({
  data,
  renderCard,
}: MobileCardViewProps<T>) {
  return (
    <div className="space-y-4 md:hidden">
      {data.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 p-4"
        >
          {renderCard(item)}
        </div>
      ))}
    </div>
  );
}
