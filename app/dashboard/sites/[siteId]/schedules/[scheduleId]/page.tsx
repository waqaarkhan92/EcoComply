'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Edit, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: string;
  obligation_id: string;
  frequency: string;
  base_date: string;
  next_due_date: string;
  last_completed_date: string | null;
  status: string;
  is_rolling: boolean;
  adjust_for_business_days: boolean;
  reminder_days: number[];
  created_at: string;
  updated_at: string;
}

export default function ScheduleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const scheduleId = params.scheduleId as string;

  const { data: schedule, isLoading, error } = useQuery<{ data: Schedule }>({
    queryKey: ['schedule', scheduleId],
    queryFn: async () => {
      return apiClient.get<{ data: Schedule }>(`/schedules/${scheduleId}`);
    },
    enabled: !!scheduleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading schedule...</div>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading schedule</div>
      </div>
    );
  }

  const scheduleData = schedule.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/schedules`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Schedule Details</h1>
            <p className="text-gray-600 mt-1">View and manage schedule information</p>
          </div>
        </div>
        <Link href={`/dashboard/sites/${siteId}/schedules/${scheduleId}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Schedule
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Frequency</label>
            <div className="mt-1 flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{scheduleData.frequency}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                scheduleData.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                scheduleData.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {scheduleData.status}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Base Date</label>
            <div className="mt-1 text-sm text-gray-900">
              {new Date(scheduleData.base_date).toLocaleDateString()}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Next Due Date</label>
            <div className="mt-1 flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">
                {scheduleData.next_due_date ? new Date(scheduleData.next_due_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {scheduleData.last_completed_date && (
            <div>
              <label className="text-sm font-medium text-gray-500">Last Completed</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(scheduleData.last_completed_date).toLocaleDateString()}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-500">Adjust for Business Days</label>
            <div className="mt-1 text-sm text-gray-900">
              {scheduleData.adjust_for_business_days ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link href={`/dashboard/sites/${siteId}/schedules/${scheduleId}/deadlines`}>
            <Button variant="outline">
              View Deadlines
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

