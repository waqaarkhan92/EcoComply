'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Share2, Mail, Link as LinkIcon, Calendar, CheckCircle2, XCircle, Eye } from 'lucide-react';
import Link from 'next/link';

interface PackSharing {
  id: string;
  pack_id: string;
  access_token: string;
  distribution_method: 'EMAIL' | 'SHARED_LINK' | null;
  distributed_to: string | null;
  shared_at: string;
  expires_at: string | null;
  is_active: boolean;
  access_count: number;
  last_accessed_at: string | null;
  audit_packs: {
    id: string;
    pack_name: string;
    pack_type: string;
  };
}

interface PackSharingResponse {
  data: PackSharing[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PackSharingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    pack_id: '',
    distribution_method: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['pack-sharing', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.pack_id) params.append('pack_id', filters.pack_id);
      if (filters.distribution_method) params.append('distribution_method', filters.distribution_method);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<PackSharingResponse>(`/pack-sharing?${params.toString()}`);
    },
  });

  const sharing: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredSharing = sharing.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.audit_packs.pack_name.toLowerCase().includes(query) ||
      item.distributed_to?.toLowerCase().includes(query) ||
      item.access_token.toLowerCase().includes(query)
    );
  });

  const getShareUrl = (accessToken: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/share/packs/${accessToken}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Pack Sharing</h1>
          <p className="text-text-secondary mt-2">
            Manage shared pack links and distribution records
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
              placeholder="Search by pack name, recipient, token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Distribution Method</label>
            <select
              value={filters.distribution_method}
              onChange={(e) => setFilters({ ...filters, distribution_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Methods</option>
              <option value="EMAIL">Email</option>
              <option value="SHARED_LINK">Shared Link</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pack Sharing Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading pack sharing records...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading pack sharing records. Please try again.
          </div>
        ) : filteredSharing.length === 0 ? (
          <div className="text-center py-12">
            <Share2 className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No pack sharing records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Pack
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Distribution Method
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Shared At
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expires At
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Access Count
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredSharing.map((item, index) => {
                    const isExpired = item.expires_at && new Date(item.expires_at) < new Date();
                    const shareUrl = getShareUrl(item.access_token);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/packs/${item.pack_id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {item.audit_packs.pack_name}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1">{item.audit_packs.pack_type}</div>
                        </td>
                        <td className="py-4 px-6">
                          {item.distribution_method ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              item.distribution_method === 'EMAIL' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-green-50 text-green-700 border border-green-200'
                            }`}>
                              {item.distribution_method === 'EMAIL' ? (
                                <Mail className="w-3.5 h-3.5 mr-1.5" />
                              ) : (
                                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              {item.distribution_method.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Secure Access</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {item.distributed_to || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(item.shared_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {item.expires_at ? (
                              <>
                                {new Date(item.expires_at).toLocaleDateString()}
                                {isExpired && (
                                  <span className="ml-2 text-xs text-red-600">(Expired)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {item.access_count}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {item.is_active && !isExpired ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
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

