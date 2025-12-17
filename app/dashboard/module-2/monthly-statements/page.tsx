'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

interface MonthlyStatement {
  id: string;
  site_id: string;
  statement_period_start: string;
  statement_period_end: string;
  statement_date: string;
  total_volume_m3: number;
  total_charge: number | null;
  water_company_name: string;
  documents: { id: string; document_name: string };
  sites: { id: string; site_name: string };
  created_at: string;
}

interface MonthlyStatementsResponse {
  data: MonthlyStatement[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function MonthlyStatementsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthly-statements', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<MonthlyStatementsResponse>(`/module-2/monthly-statements?${params.toString()}`);
    },
  });

  const statements: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredStatements = statements.filter((statement) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      statement.water_company_name.toLowerCase().includes(query) ||
      statement.documents.document_name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Monthly Statements</h1>
          <p className="text-text-secondary mt-2">
            Manage water company monthly statements and reconciliations
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-2/monthly-statements/new">
            <Plus className="w-4 h-4 mr-2" />
            New Statement
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by water company, document name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statements Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading monthly statements...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading monthly statements. Please try again.
          </div>
        ) : filteredStatements.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No monthly statements found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Water Company
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Statement Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Volume (m³)
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Charge
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredStatements.map((statement, index) => (
                    <tr
                      key={statement.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/module-2/monthly-statements/${statement.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {statement.water_company_name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">{statement.sites.site_name}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {new Date(statement.statement_period_start).toLocaleDateString()} - {new Date(statement.statement_period_end).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(statement.statement_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {parseFloat(statement.total_volume_m3.toString()).toLocaleString()} m³
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {statement.total_charge ? `£${parseFloat(statement.total_charge.toString()).toLocaleString()}` : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
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

