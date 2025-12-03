'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Deadline {
  id: string;
  obligation_id: string;
  due_date: string;
  status: string;
  compliance_period: string;
  is_late: boolean;
  created_at: string;
}

interface DeadlinesResponse {
  data: Deadline[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function DeadlinesPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<string>('all');

  const { data: deadlinesData, isLoading, error } = useQuery<DeadlinesResponse>({
    queryKey: ['deadlines', siteId, cursor, filter],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (filter !== 'all') {
        params.append('filter[status]', filter);
      }
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<DeadlinesResponse>(`/deadlines?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const deadlines = deadlinesData?.data || [];
  const hasMore = deadlinesData?.pagination?.has_more || false;
  const nextCursor = deadlinesData?.pagination?.cursor;

  const getStatusIcon = (status: string, isLate: boolean) => {
    if (status === 'COMPLETED') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (isLate || status === 'OVERDUE') return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-yellow-600" />;
  };

  const getStatusColor = (status: string, isLate: boolean): string => {
    if (status === 'COMPLETED') return 'bg-green-100 text-green-800';
    if (isLate || status === 'OVERDUE') return 'bg-red-100 text-red-800';
    if (status === 'DUE_SOON') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading deadlines...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading deadlines</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Deadlines</h1>
          <p className="text-gray-600 mt-1">Track and manage compliance deadlines</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'OVERDUE' ? 'default' : 'outline'}
            onClick={() => setFilter('OVERDUE')}
          >
            Overdue
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compliance Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deadlines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No deadlines found.
                  </td>
                </tr>
              ) : (
                deadlines.map((deadline) => (
                  <tr key={deadline.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">
                          {new Date(deadline.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {deadline.compliance_period || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(deadline.status, deadline.is_late)}
                        <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deadline.status, deadline.is_late)}`}>
                          {deadline.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/sites/${siteId}/deadlines/${deadline.id}`}
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

