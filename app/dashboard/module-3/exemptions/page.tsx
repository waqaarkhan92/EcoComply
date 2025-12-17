'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Shield, Calendar, CheckCircle2, XCircle, AlertTriangle, Wrench } from 'lucide-react';
import Link from 'next/link';

interface Exemption {
  id: string;
  generator_id: string;
  site_id: string;
  exemption_type: 'TESTING' | 'EMERGENCY_OPERATION' | 'MAINTENANCE' | 'OTHER';
  start_date: string;
  end_date: string | null;
  duration_hours: number | null;
  exemption_reason: string;
  evidence_ids: string[];
  compliance_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

interface ExemptionsResponse {
  data: Exemption[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const exemptionTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  TESTING: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: AlertTriangle },
  EMERGENCY_OPERATION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  MAINTENANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Wrench },
  OTHER: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Shield },
};

export default function ExemptionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    generator_id: '',
    exemption_type: '',
    compliance_verified: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-3-exemptions', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.generator_id) params.append('generator_id', filters.generator_id);
      if (filters.exemption_type) params.append('exemption_type', filters.exemption_type);
      if (filters.compliance_verified) params.append('compliance_verified', filters.compliance_verified);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ExemptionsResponse>(`/module-3/exemptions?${params.toString()}`);
    },
  });

  const exemptions: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredExemptions = exemptions.filter((exemption) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exemption.exemption_reason.toLowerCase().includes(query) ||
      exemption.exemption_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Exemptions</h1>
          <p className="text-text-secondary mt-2">
            Track emission exemptions for generators
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-3/exemptions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Exemption
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
              placeholder="Search by reason, type..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Exemption Type</label>
            <select
              value={filters.exemption_type}
              onChange={(e) => setFilters({ ...filters, exemption_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="TESTING">Testing</option>
              <option value="EMERGENCY_OPERATION">Emergency Operation</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Compliance Verified</label>
            <select
              value={filters.compliance_verified}
              onChange={(e) => setFilters({ ...filters, compliance_verified: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
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

      {/* Exemptions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading exemptions...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading exemptions. Please try again.
          </div>
        ) : filteredExemptions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No exemptions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Exemption Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredExemptions.map((exemption, index) => {
                    const typeStyle = exemptionTypeColors[exemption.exemption_type] || exemptionTypeColors.OTHER;
                    const TypeIcon = typeStyle.icon;

                    return (
                      <tr
                        key={exemption.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-3/exemptions/${exemption.id}`}
                            className="inline-flex items-center"
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                              <TypeIcon className="w-3.5 h-3.5 mr-1.5" />
                              {exemption.exemption_type.replace('_', ' ')}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-3/exemptions/${exemption.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            <div className="text-sm text-gray-900 max-w-md truncate">{exemption.exemption_reason}</div>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(exemption.start_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {exemption.end_date ? (
                              new Date(exemption.end_date).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {exemption.duration_hours ? (
                              `${exemption.duration_hours.toFixed(2)} hrs`
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {exemption.compliance_verified ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                              <XCircle className="w-3.5 h-3.5 mr-1.5" />
                              Not Verified
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

