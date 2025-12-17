'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, FileCheck, Filter, Calendar, Link2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Badge } from '@/components/ui/badge';

interface Evidence {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  status: string;
  uploaded_at: string;
  uploaded_by?: string;
  linked_obligations_count?: number;
  expiry_date?: string;
}

interface EvidenceResponse {
  data: Evidence[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const statusColors: Record<string, string> = {
  VALID: 'bg-green-100 text-green-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  EXPIRED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function PermitEvidencePage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: evidenceData, isLoading, error } = useQuery({
    queryKey: ['permit-evidence', siteId, statusFilter, searchQuery],
    queryFn: async (): Promise<EvidenceResponse> => {
      const queryParams = new URLSearchParams();
      queryParams.append('filter[site_id]', siteId);
      if (statusFilter !== 'all') {
        queryParams.append('filter[status]', statusFilter);
      }
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }
      const response = await apiClient.get(`/evidence?${queryParams.toString()}`);
      return response as EvidenceResponse;
    },
    enabled: !!siteId,
  });

  const evidence: any[] = evidenceData?.data || [];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Sites', href: '/dashboard/sites' },
          { label: 'Site', href: `/dashboard/sites/${siteId}/dashboard` },
          { label: 'Evidence' },
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Evidence</h1>
          <p className="text-text-secondary mt-1">
            Manage compliance evidence for this site
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/evidence/upload`}>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Evidence
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="VALID">Valid</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Evidence List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load evidence. Please try again.
        </div>
      ) : evidence.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No evidence found</h3>
          <p className="text-gray-500 mb-4">
            Upload evidence to demonstrate compliance with your obligations.
          </p>
          <Link href={`/dashboard/sites/${siteId}/evidence/upload`}>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Evidence
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {evidence.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/sites/${siteId}/evidence/${item.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileCheck className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 hover:text-primary">
                          {item.title || item.file_name}
                        </p>
                        <p className="text-sm text-gray-500">{item.file_type}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={statusColors[item.status] || 'bg-gray-100 text-gray-800'}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Link2 className="h-4 w-4" />
                      {item.linked_obligations_count || 0} obligations
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(item.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {item.expiry_date ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={new Date(item.expiry_date) < new Date() ? 'text-red-600' : 'text-gray-600'}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No expiry</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unlinked Evidence Alert */}
      <Link href={`/dashboard/sites/${siteId}/evidence/unlinked`}>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors cursor-pointer">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">View Unlinked Evidence</p>
            <p className="text-sm text-amber-600">
              Evidence that hasn&apos;t been linked to any obligations yet
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
