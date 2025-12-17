'use client';

/**
 * Reusable CRUD List Page Template
 * Generic list page with search, filters, pagination
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface CrudListPageProps<T> {
  title: string;
  description: string;
  apiEndpoint: string;
  createLink?: string;
  columns: Array<{
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
  }>;
  filters?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select';
    options?: Array<{ value: string; label: string }>;
  }>;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  rowLink?: (item: T) => string;
}

export function CrudListPage<T extends { id: string }>({
  title,
  description,
  apiEndpoint,
  createLink,
  columns,
  filters = [],
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
  onRowClick,
  rowLink,
}: CrudListPageProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: [apiEndpoint, searchQuery, filterValues, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');
      
      const queryString = params.toString();
      const url = apiEndpoint + (queryString ? '?' + queryString : '');
      return apiClient.get<T[]>(url);
    },
  });

  const items: T[] = (data?.data as T[]) ?? [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
          <p className="text-text-secondary mt-2">{description}</p>
        </div>
        {createLink && (
          <Link href={createLink}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create New
            </Button>
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {filters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {filter.label}
                </label>
                {filter.type === 'select' ? (
                  <select
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => setFilterValues({ ...filterValues, [filter.key]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={filterValues[filter.key] || ''}
                    onChange={(e) => setFilterValues({ ...filterValues, [filter.key]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">Error loading data. Please try again.</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">{emptyMessage}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.map((item) => {
                    const link = rowLink ? rowLink(item) : null;
                    const content = (
                      <>
                        {columns.map((column) => (
                          <td key={column.key} className="py-4 px-6">
                            {column.render
                              ? column.render(item)
                              : String((item as any)[column.key] || '')}
                          </td>
                        ))}
                      </>
                    );

                    return link ? (
                      <tr key={item.id} className="hover:bg-gray-50 cursor-pointer">
                        <Link href={link} className="contents">
                          {content}
                        </Link>
                      </tr>
                    ) : (
                      <tr
                        key={item.id}
                        onClick={() => onRowClick?.(item)}
                        className={onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
                      >
                        {content}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => nextCursor && setCursor(nextCursor)}
                  disabled={!nextCursor}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
