'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Activity, Calendar, CheckCircle2, AlertCircle, Wrench, Zap } from 'lucide-react';
import Link from 'next/link';

interface RuntimeMonitoring {
  id: string;
  generator_id: string;
  site_id: string;
  run_date: string;
  runtime_hours: number;
  run_duration: number;
  reason_code: 'Test' | 'Emergency' | 'Maintenance' | 'Normal';
  data_source: string;
  evidence_linkage_id: string | null;
  validation_status: string | null;
  created_at: string;
}

interface RuntimeMonitoringResponse {
  data: RuntimeMonitoring[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const reasonCodeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  Test: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Zap },
  Emergency: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  Maintenance: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Wrench },
  Normal: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
};

export default function RuntimeMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    generator_id: '',
    reason_code: '',
    data_source: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<RuntimeMonitoringResponse>({
    queryKey: ['module-3-runtime-monitoring', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.generator_id) params.append('generator_id', filters.generator_id);
      if (filters.reason_code) params.append('reason_code', filters.reason_code);
      if (filters.data_source) params.append('data_source', filters.data_source);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<RuntimeMonitoringResponse>(`/module-3/runtime-monitoring?${params.toString()}`);
    },
  });

  const records = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredRecords = records.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return record.reason_code.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Runtime Monitoring</h1>
          <p className="text-text-secondary mt-2">
            Track generator runtime hours and operational status
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-3/runtime-monitoring/new">
            <Plus className="w-4 h-4 mr-2" />
            New Runtime Entry
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
              placeholder="Search by reason code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Reason Code</label>
            <select
              value={filters.reason_code}
              onChange={(e) => setFilters({ ...filters, reason_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Reasons</option>
              <option value="Test">Test</option>
              <option value="Emergency">Emergency</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Data Source</label>
            <select
              value={filters.data_source}
              onChange={(e) => setFilters({ ...filters, data_source: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sources</option>
              <option value="AUTOMATED">Automated</option>
              <option value="MANUAL">Manual</option>
              <option value="MAINTENANCE_RECORD">Maintenance Record</option>
              <option value="INTEGRATION">Integration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Generator ID</label>
            <input
              type="text"
              placeholder="Filter by generator ID..."
              value={filters.generator_id}
              onChange={(e) => setFilters({ ...filters, generator_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Runtime Monitoring Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading runtime monitoring records...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading runtime monitoring records. Please try again.
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No runtime monitoring records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Run Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reason Code
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Runtime Hours
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Data Source
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Validation
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRecords.map((record, index) => {
                    const reasonStyle = reasonCodeColors[record.reason_code] || reasonCodeColors.Normal;
                    const ReasonIcon = reasonStyle.icon;

                    return (
                      <tr
                        key={record.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-3/runtime-monitoring/${record.id}`}
                            className="font-medium text-sm text-primary hover:underline flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            {new Date(record.run_date).toLocaleDateString()}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${reasonStyle.bg} ${reasonStyle.text} border ${reasonStyle.border}`}>
                            <ReasonIcon className="w-3.5 h-3.5 mr-1.5" />
                            {record.reason_code}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 font-medium">
                            {record.runtime_hours.toFixed(2)} hrs
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {record.run_duration.toFixed(2)} hrs
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {record.data_source}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {record.validation_status ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              record.validation_status === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                              record.validation_status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}>
                              {record.validation_status}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

