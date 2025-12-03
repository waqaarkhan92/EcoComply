'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Deadline {
  id: string;
  obligation_id: string;
  due_date: string;
  status: string;
  is_late: boolean;
}

interface DeadlinesResponse {
  data: Deadline[];
}

export default function UpcomingDeadlinesPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  // Get deadlines due in next 30 days
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  const { data: deadlinesData, isLoading } = useQuery<DeadlinesResponse>({
    queryKey: ['upcoming-deadlines', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('filter[due_date][gte]', today.toISOString().split('T')[0]);
      params.append('filter[due_date][lte]', nextMonth.toISOString().split('T')[0]);
      params.append('filter[status]', 'PENDING');
      params.append('limit', '100');

      return apiClient.get<DeadlinesResponse>(`/deadlines?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const deadlines = deadlinesData?.data || [];

  // Sort by due date
  deadlines.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading upcoming deadlines...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upcoming Deadlines</h1>
        <p className="text-gray-600 mt-1">Deadlines due in the next 30 days</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {deadlines.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No upcoming deadlines in the next 30 days.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {deadlines.map((deadline) => {
              const daysUntilDue = Math.ceil(
                (new Date(deadline.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <div key={deadline.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(deadline.due_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days remaining`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {daysUntilDue <= 7 && (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <Link
                        href={`/dashboard/sites/${siteId}/deadlines/${deadline.id}`}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

