'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, Calendar, CheckCircle2, XCircle, GitBranch } from 'lucide-react';
import Link from 'next/link';

interface PermitVersion {
  id: string;
  document_id: string;
  company_id: string;
  site_id: string;
  version_number: number;
  version_date: string;
  effective_date: string | null;
  expiry_date: string | null;
  version_type: 'INITIAL' | 'VARIATION' | 'REVOCATION' | 'SURRENDER' | 'TRANSFER';
  change_summary: string | null;
  redline_document_url: string | null;
  impact_analysis: any;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface PermitVersionsResponse {
  data: PermitVersion[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const versionTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  INITIAL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  VARIATION: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  REVOCATION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  SURRENDER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  TRANSFER: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export default function PermitVersionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    document_id: '',
    version_type: '',
    is_current: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-1-permit-versions', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.version_type) params.append('version_type', filters.version_type);
      if (filters.is_current) params.append('is_current', filters.is_current);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<PermitVersionsResponse>(`/module-1/permit-versions?${params.toString()}`);
    },
  });

  const versions: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  // Filter by search query (client-side for now)
  const filteredVersions = versions.filter((version) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      version.version_number.toString().includes(query) ||
      version.change_summary?.toLowerCase().includes(query) ||
      version.version_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Permit Versions</h1>
          <p className="text-text-secondary mt-2">
            Track and manage permit document versions and changes
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/permit-versions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Permit Version
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
              placeholder="Search versions by number, change summary..."
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
              {/* TODO: Fetch sites from API */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Version Type</label>
            <select
              value={filters.version_type}
              onChange={(e) => setFilters({ ...filters, version_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="INITIAL">Initial</option>
              <option value="VARIATION">Variation</option>
              <option value="REVOCATION">Revocation</option>
              <option value="SURRENDER">Surrender</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_current}
              onChange={(e) => setFilters({ ...filters, is_current: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Current</option>
              <option value="false">Historical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Document ID</label>
            <input
              type="text"
              placeholder="Filter by document ID..."
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Permit Versions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading permit versions...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading permit versions. Please try again.
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No permit versions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Version Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Change Summary
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredVersions.map((version, index) => {
                    const typeStyle = versionTypeColors[version.version_type] || versionTypeColors.INITIAL;

                    return (
                      <tr
                        key={version.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/permit-versions/${version.id}`}
                            className="font-medium text-sm text-primary hover:underline flex items-center gap-2"
                          >
                            <GitBranch className="w-4 h-4" />
                            v{version.version_number}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                            {version.version_type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(version.version_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {version.effective_date ? (
                              new Date(version.effective_date).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {version.expiry_date ? (
                              new Date(version.expiry_date).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 max-w-md truncate">
                            {version.change_summary || <span className="text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {version.is_current ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Current
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Historical
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

