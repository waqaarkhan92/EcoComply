'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Obligation {
  id: string;
  title: string;
  category: string;
  status: string;
  due_date?: string;
  compliance_status: string;
}

interface PermitObligationsResponse {
  data: Obligation[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PermitObligationsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: obligationsData, isLoading, error } = useQuery<PermitObligationsResponse>({
    queryKey: ['permit-obligations', siteId, cursor, statusFilter, categoryFilter, searchQuery],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('filter[module_id]', '1'); // Module 1 = Permits
      if (statusFilter !== 'all') {
        params.append('filter[status]', statusFilter);
      }
      if (categoryFilter !== 'all') {
        params.append('filter[category]', categoryFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<PermitObligationsResponse>(`/obligations?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const obligations = obligationsData?.data || [];
  const hasMore = obligationsData?.pagination?.has_more || false;
  const nextCursor = obligationsData?.pagination?.cursor;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800' },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading obligations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading obligations</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permit Obligations</h1>
          <p className="text-gray-600 mt-1">View and manage environmental permit obligations for this site</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search obligations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm"
          >
            <option value="all">All Categories</option>
            <option value="MONITORING">Monitoring</option>
            <option value="REPORTING">Reporting</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RECORD_KEEPING">Record Keeping</option>
          </select>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Obligations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obligation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {obligations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No permit obligations found.</p>
                  </td>
                </tr>
              ) : (
                obligations.map((obligation) => (
                  <tr key={obligation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{obligation.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {obligation.category.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(obligation.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {obligation.due_date ? (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {new Date(obligation.due_date).toLocaleDateString()}
                        </div>
                      ) : (
                        'No deadline'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/sites/${siteId}/obligations/${obligation.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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

