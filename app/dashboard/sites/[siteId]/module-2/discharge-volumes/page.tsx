'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Calendar } from 'lucide-react';
import Link from 'next/link';

interface DischargeVolume {
  id: string;
  document_id: string;
  site_id: string;
  recording_date: string;
  volume_m3: number;
  measurement_method: string | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
  consent_id: string; // API alias
  date: string; // API alias
}

interface DischargeVolumesResponse {
  data: DischargeVolume[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function DischargeVolumesPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState({
    document_id: '',
    date_from: '',
    date_to: '',
  });

  const { data, isLoading, error } = useQuery<DischargeVolumesResponse>({
    queryKey: ['module-2-discharge-volumes', siteId, filters, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (filters.document_id) params.append('filter[document_id]', filters.document_id);
      if (filters.date_from) params.append('filter[recording_date[gte]]', filters.date_from);
      if (filters.date_to) params.append('filter[recording_date[lte]]', filters.date_to);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-recording_date');

      return apiClient.get<DischargeVolumesResponse>(`/module-2/discharge-volumes?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const volumes = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  // Calculate totals
  const totalVolume = volumes.reduce((sum, vol) => sum + vol.volume_m3, 0);
  const averageVolume = volumes.length > 0 ? totalVolume / volumes.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Discharge Volumes</h1>
          <p className="text-text-secondary mt-2">
            Track discharge volumes for surcharge calculations
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Volume Record
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      {volumes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-text-tertiary mb-1">Total Records</p>
            <p className="text-2xl font-bold text-text-primary">{volumes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-text-tertiary mb-1">Total Volume</p>
            <p className="text-2xl font-bold text-text-primary">{totalVolume.toFixed(2)} m³</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-text-tertiary mb-1">Average Volume</p>
            <p className="text-2xl font-bold text-text-primary">{averageVolume.toFixed(2)} m³</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-text-tertiary" />
          <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Consent Document
            </label>
            <input
              type="text"
              placeholder="Filter by document ID..."
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Volumes Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">Volume Records</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">Loading discharge volumes...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            Error loading discharge volumes. Please try again.
          </div>
        ) : volumes.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No discharge volume records found. Add your first record to get started.
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
                    Volume (m³)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Measurement Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {volumes.map((volume) => (
                  <tr key={volume.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-text-tertiary" />
                        {new Date(volume.recording_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                      {volume.volume_m3.toFixed(2)} m³
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {volume.measurement_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary max-w-xs truncate">
                      {volume.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes/${volume.id}`}>
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

