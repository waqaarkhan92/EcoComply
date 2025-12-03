'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Gauge, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface RegulationThreshold {
  id: string;
  threshold_type: 'MCPD_1_5MW' | 'MCPD_5_50MW' | 'SPECIFIED_GENERATOR' | 'CUSTOM';
  capacity_min_mw: number;
  capacity_max_mw: number | null;
  monitoring_frequency: string;
  stack_test_frequency: string;
  reporting_frequency: string;
  regulation_reference: string | null;
  is_active: boolean;
  created_at: string;
}

interface RegulationThresholdsResponse {
  data: RegulationThreshold[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const thresholdTypeColors: Record<string, { bg: string; text: string }> = {
  MCPD_1_5MW: { bg: 'bg-blue-50', text: 'text-blue-700' },
  MCPD_5_50MW: { bg: 'bg-purple-50', text: 'text-purple-700' },
  SPECIFIED_GENERATOR: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CUSTOM: { bg: 'bg-gray-50', text: 'text-gray-700' },
};

export default function RegulationThresholdsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    threshold_type: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<RegulationThresholdsResponse>({
    queryKey: ['regulation-thresholds', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.threshold_type) params.append('threshold_type', filters.threshold_type);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<RegulationThresholdsResponse>(`/module-3/regulation-thresholds?${params.toString()}`);
    },
  });

  const thresholds = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredThresholds = thresholds.filter((threshold) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      threshold.threshold_type.toLowerCase().includes(query) ||
      threshold.regulation_reference?.toLowerCase().includes(query) ||
      threshold.monitoring_frequency.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Regulation Thresholds</h1>
          <p className="text-text-secondary mt-2">
            Manage MW thresholds and monitoring frequency requirements
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-3/regulation-thresholds/new">
            <Plus className="w-4 h-4 mr-2" />
            New Threshold
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
              placeholder="Search by type, regulation reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Threshold Type</label>
            <select
              value={filters.threshold_type}
              onChange={(e) => setFilters({ ...filters, threshold_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="MCPD_1_5MW">MCPD 1-5MW</option>
              <option value="MCPD_5_50MW">MCPD 5-50MW</option>
              <option value="SPECIFIED_GENERATOR">Specified Generator</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Thresholds Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading regulation thresholds...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading regulation thresholds. Please try again.
          </div>
        ) : filteredThresholds.length === 0 ? (
          <div className="text-center py-12">
            <Gauge className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No regulation thresholds found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Capacity Range (MW)
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Monitoring
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stack Test
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reporting
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredThresholds.map((threshold, index) => {
                    const typeStyle = thresholdTypeColors[threshold.threshold_type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

                    return (
                      <tr
                        key={threshold.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-3/regulation-thresholds/${threshold.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                              {threshold.threshold_type.replace('_', ' ')}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {parseFloat(threshold.capacity_min_mw.toString()).toFixed(2)} - {threshold.capacity_max_mw ? parseFloat(threshold.capacity_max_mw.toString()).toFixed(2) : '∞'} MW
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{threshold.monitoring_frequency}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{threshold.stack_test_frequency}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{threshold.reporting_frequency}</div>
                        </td>
                        <td className="py-4 px-6">
                          {threshold.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700">
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Inactive
                            </span>
                          )}
                        </td>
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

