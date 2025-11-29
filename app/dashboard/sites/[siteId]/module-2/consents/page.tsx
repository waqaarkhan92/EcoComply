'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Upload, FileText, Search } from 'lucide-react';
import Link from 'next/link';

interface Consent {
  id: string;
  site_id: string;
  title: string;
  reference_number: string | null;
  status: string;
  extraction_status: string;
  created_at: string;
}

interface ConsentsResponse {
  data: Consent[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ConsentsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery<ConsentsResponse>({
    queryKey: ['module-2-consents', siteId, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-created_at');

      return apiClient.get<ConsentsResponse>(`/module-2/consents?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const consents = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  // Filter consents by search query
  const filteredConsents = consents.filter(consent => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      consent.title.toLowerCase().includes(query) ||
      (consent.reference_number && consent.reference_number.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Trade Effluent Consents</h1>
          <p className="text-text-secondary mt-2">
            Manage your trade effluent consent documents
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href={`/dashboard/sites/${siteId}/module-2/consents/upload`}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Consent
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search consents by title or reference number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Consents List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">
            {filteredConsents.length} Consent{filteredConsents.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">Loading consents...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            Error loading consents. Please try again.
          </div>
        ) : filteredConsents.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            {searchQuery ? 'No consents match your search.' : 'No consent documents found. Upload your first consent to get started.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConsents.map((consent) => (
              <div key={consent.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-text-tertiary" />
                      <h3 className="text-lg font-semibold text-text-primary">
                        {consent.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        consent.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : consent.status === 'EXPIRED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {consent.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        consent.extraction_status === 'COMPLETED' 
                          ? 'bg-blue-100 text-blue-800' 
                          : consent.extraction_status === 'PROCESSING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {consent.extraction_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {consent.reference_number && (
                        <div>
                          <p className="text-sm text-text-tertiary">Reference Number</p>
                          <p className="text-sm font-medium text-text-primary">
                            {consent.reference_number}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-text-tertiary">Uploaded</p>
                        <p className="text-sm font-medium text-text-primary">
                          {new Date(consent.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Link href={`/dashboard/sites/${siteId}/module-2/consents/${consent.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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

