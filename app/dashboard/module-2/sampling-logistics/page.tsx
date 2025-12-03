'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FlaskConical, Calendar, CheckCircle2, Clock, Truck, FileText } from 'lucide-react';
import Link from 'next/link';

interface SamplingLogistic {
  id: string;
  parameter_id: string;
  site_id: string;
  scheduled_date: string;
  sample_id: string | null;
  stage: 'SCHEDULED' | 'REMINDER_SENT' | 'COLLECTION_SCHEDULED' | 'COLLECTED' | 'COURIER_BOOKED' | 'IN_TRANSIT' | 'LAB_RECEIVED' | 'LAB_PROCESSING' | 'CERTIFICATE_RECEIVED' | 'EVIDENCE_LINKED' | 'COMPLETED';
  reminder_sent_at: string | null;
  collection_scheduled_at: string | null;
  collected_at: string | null;
  courier_booked_at: string | null;
  lab_received_at: string | null;
  certificate_received_at: string | null;
  evidence_linked_at: string | null;
  created_at: string;
}

interface SamplingLogisticsResponse {
  data: SamplingLogistic[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const stageColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  SCHEDULED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Calendar },
  REMINDER_SENT: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  COLLECTION_SCHEDULED: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Calendar },
  COLLECTED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  COURIER_BOOKED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: Truck },
  IN_TRANSIT: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: Truck },
  LAB_RECEIVED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: FlaskConical },
  LAB_PROCESSING: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: FlaskConical },
  CERTIFICATE_RECEIVED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: FileText },
  EVIDENCE_LINKED: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: CheckCircle2 },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
};

export default function SamplingLogisticsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    parameter_id: '',
    stage: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<SamplingLogisticsResponse>({
    queryKey: ['module-2-sampling-logistics', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.parameter_id) params.append('parameter_id', filters.parameter_id);
      if (filters.stage) params.append('stage', filters.stage);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<SamplingLogisticsResponse>(`/module-2/sampling-logistics?${params.toString()}`);
    },
  });

  const records = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredRecords = records.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.sample_id?.toLowerCase().includes(query) ||
      record.stage.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Sampling Logistics</h1>
          <p className="text-text-secondary mt-2">
            Track sampling workflow from scheduling to certificate receipt
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-2/sampling-logistics/new">
            <Plus className="w-4 h-4 mr-2" />
            New Sampling Record
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
              placeholder="Search by sample ID, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Stages</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COLLECTED">Collected</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="LAB_RECEIVED">Lab Received</option>
              <option value="CERTIFICATE_RECEIVED">Certificate Received</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Parameter ID</label>
            <input
              type="text"
              placeholder="Filter by parameter ID..."
              value={filters.parameter_id}
              onChange={(e) => setFilters({ ...filters, parameter_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Sampling Logistics Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading sampling logistics...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading sampling logistics. Please try again.
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No sampling logistics records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sample ID
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Scheduled Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Collected
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Lab Received
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Certificate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRecords.map((record, index) => {
                    const stageStyle = stageColors[record.stage] || stageColors.SCHEDULED;
                    const StageIcon = stageStyle.icon;

                    return (
                      <tr
                        key={record.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-2/sampling-logistics/${record.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {record.sample_id || `Record ${record.id.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(record.scheduled_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${stageStyle.bg} ${stageStyle.text} border ${stageStyle.border}`}>
                            <StageIcon className="w-3.5 h-3.5 mr-1.5" />
                            {record.stage.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {record.collected_at ? (
                              new Date(record.collected_at).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {record.lab_received_at ? (
                              new Date(record.lab_received_at).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {record.certificate_received_at ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600 inline mr-1" />
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
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

