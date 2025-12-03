'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, Calendar, CheckCircle2, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface ExpiringEvidence {
  id: string;
  evidence_id: string;
  site_id: string;
  expiry_date: string;
  days_until_expiry: number;
  is_expired: boolean;
  expired_at: string | null;
  renewal_required: boolean;
  renewal_evidence_id: string | null;
  evidence_items: {
    id: string;
    title: string;
    file_name: string;
    file_url: string;
    evidence_type: string;
  };
}

interface ExpiringEvidenceResponse {
  data: ExpiringEvidence[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ExpiringEvidencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    is_expired: '',
    days_until_expiry: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<ExpiringEvidenceResponse>({
    queryKey: ['evidence-expiring', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.is_expired) params.append('is_expired', filters.is_expired);
      if (filters.days_until_expiry) params.append('days_until_expiry', filters.days_until_expiry);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ExpiringEvidenceResponse>(`/evidence/expiring?${params.toString()}`);
    },
  });

  const expiring = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredExpiring = expiring.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.evidence_items.title.toLowerCase().includes(query) ||
      item.evidence_items.file_name.toLowerCase().includes(query) ||
      item.evidence_items.evidence_type.toLowerCase().includes(query)
    );
  });

  const getUrgencyColor = (days: number, isExpired: boolean) => {
    if (isExpired) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (days <= 7) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (days <= 30) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
    if (days <= 90) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Expiring Evidence</h1>
          <p className="text-text-secondary mt-2">
            Track evidence items that are expiring or have expired
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by title, file name, type..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_expired}
              onChange={(e) => setFilters({ ...filters, is_expired: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="false">Not Expired</option>
              <option value="true">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Days Until Expiry (max)</label>
            <input
              type="number"
              placeholder="e.g., 30"
              value={filters.days_until_expiry}
              onChange={(e) => setFilters({ ...filters, days_until_expiry: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Expiring Evidence Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading expiring evidence...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading expiring evidence. Please try again.
          </div>
        ) : filteredExpiring.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No expiring evidence found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Evidence
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Days Until Expiry
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredExpiring.map((item, index) => {
                    const urgencyStyle = getUrgencyColor(item.days_until_expiry, item.is_expired);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/evidence/${item.evidence_id}`}
                            className="font-medium text-sm text-primary hover:underline flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            {item.evidence_items.title || item.evidence_items.file_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{item.evidence_items.evidence_type}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(item.expiry_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${urgencyStyle.bg} ${urgencyStyle.text} border ${urgencyStyle.border}`}>
                            {item.is_expired ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                Expired
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                                {item.days_until_expiry} days
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {item.renewal_required ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                              Renewal Required
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

