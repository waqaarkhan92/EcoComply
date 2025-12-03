'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: string;
  obligation_id: string;
  frequency: string;
  next_due_date: string;
  status: string;
  created_at: string;
}

interface SchedulesResponse {
  data: Schedule[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function SchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: schedulesData, isLoading, error } = useQuery<SchedulesResponse>({
    queryKey: ['schedules', siteId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<SchedulesResponse>(`/schedules?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const schedules = schedulesData?.data || [];
  const hasMore = schedulesData?.pagination?.has_more || false;
  const nextCursor = schedulesData?.pagination?.cursor;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading schedules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading schedules</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedules</h1>
          <p className="text-gray-600 mt-1">Manage monitoring schedules for obligations</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/schedules/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Schedule
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No schedules found. Create your first schedule to get started.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{schedule.frequency}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(schedule.status)}`}>
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/sites/${siteId}/schedules/${schedule.id}`}
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

