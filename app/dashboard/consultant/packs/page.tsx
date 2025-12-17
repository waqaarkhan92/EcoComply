'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Package, Download, Share2, FileText, Filter } from 'lucide-react';
import Link from 'next/link';

interface Pack {
  id: string;
  pack_type: string;
  company_id: string;
  site_id: string | null;
  status: string;
  recipient_name: string;
  date_range_start: string;
  date_range_end: string;
  file_url: string | null;
  created_at: string;
  client_company: {
    id: string;
    name: string;
  };
}

interface ConsultantPacksResponse {
  data: Pack[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ConsultantPacksPage() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: packsData, isLoading, error } = useQuery({
    queryKey: ['consultant-packs', statusFilter, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('filter[status]', statusFilter);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<ConsultantPacksResponse>(`/consultant/packs?${params.toString()}`);
    },
  });

  const packs: Pack[] = packsData?.data || [];
  const hasMore = packsData?.pagination?.has_more || false;
  const nextCursor = packsData?.pagination?.cursor;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading packs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading packs</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Packs</h1>
          <p className="text-gray-600 mt-1">View and manage packs generated for your clients</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCursor(undefined);
            }}
            className="rounded-md border-gray-300"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="GENERATING">Generating</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Packs List */}
      <div className="bg-white rounded-lg shadow">
        {packs.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packs yet</h3>
            <p className="text-gray-500">Packs generated for your clients will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {packs.map((pack) => (
              <div key={pack.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Package className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{pack.pack_type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          pack.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          pack.status === 'GENERATING' ? 'bg-yellow-100 text-yellow-800' :
                          pack.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pack.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Client: {pack.client_company?.name || 'Unknown'} • {pack.recipient_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(pack.date_range_start).toLocaleDateString()} - {new Date(pack.date_range_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pack.status === 'COMPLETED' && pack.file_url && (
                      <>
                        <Link href={pack.file_url} target="_blank">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </Link>
                      </>
                    )}
                    <Link href={`/dashboard/consultant/clients/${pack.company_id}/packs/${pack.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Button
              variant="outline"
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

