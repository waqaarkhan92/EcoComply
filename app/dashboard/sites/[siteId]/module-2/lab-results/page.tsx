'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Filter, Download } from 'lucide-react';
import Link from 'next/link';

interface LabResult {
  id: string;
  parameter_id: string;
  site_id: string;
  sample_date: string;
  sample_id: string | null;
  recorded_value: number;
  unit: string;
  percentage_of_limit: number;
  is_exceedance: boolean;
  lab_reference: string | null;
  entry_method: string;
  created_at: string;
  parameter_type: string;
  parameter_limit_value: number;
}

interface LabResultsResponse {
  data: LabResult[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function LabResultsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState({
    parameter_id: '',
    is_exceedance: '',
    sample_date_from: '',
    sample_date_to: '',
  });

  const { data, isLoading, error } = useQuery<LabResultsResponse>({
    queryKey: ['module-2-lab-results', siteId, filters, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (filters.parameter_id) params.append('filter[parameter_id]', filters.parameter_id);
      if (filters.is_exceedance) params.append('filter[is_exceedance]', filters.is_exceedance);
      if (filters.sample_date_from) params.append('filter[sample_date[gte]]', filters.sample_date_from);
      if (filters.sample_date_to) params.append('filter[sample_date[lte]]', filters.sample_date_to);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-sample_date');

      return apiClient.get<LabResultsResponse>(`/module-2/lab-results?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const labResults = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Lab Results</h1>
          <p className="text-text-secondary mt-2">
            Manage laboratory test results for trade effluent parameters
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Result
            </Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/import`}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-text-tertiary" />
          <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Parameter
            </label>
            <input
              type="text"
              placeholder="Filter by parameter..."
              value={filters.parameter_id}
              onChange={(e) => setFilters({ ...filters, parameter_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Exceedance Status
            </label>
            <select
              value={filters.is_exceedance}
              onChange={(e) => setFilters({ ...filters, is_exceedance: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Exceeded</option>
              <option value="false">Within Limit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.sample_date_from}
              onChange={(e) => setFilters({ ...filters, sample_date_from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.sample_date_to}
              onChange={(e) => setFilters({ ...filters, sample_date_to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Lab Results Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">Results</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">Loading lab results...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            Error loading lab results. Please try again.
          </div>
        ) : labResults.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No lab results found. Add your first result to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parameter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Limit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {new Date(result.sample_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                      {result.parameter_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      {result.recorded_value} {result.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {result.parameter_limit_value} {result.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={result.is_exceedance ? 'text-red-600 font-semibold' : 'text-text-primary'}>
                        {result.percentage_of_limit.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        result.is_exceedance 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {result.is_exceedance ? 'Exceeded' : 'OK'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/${result.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <Button
              variant="secondary"
              onClick={() => setCursor(nextCursor)}
              disabled={!nextCursor}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

