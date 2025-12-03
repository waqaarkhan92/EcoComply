'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Edit, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: string;
  obligation_id: string;
  frequency: string;
  base_date: string;
  next_due_date: string;
  status: string;
}

export default function ObligationSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;

  const { data: scheduleData } = useQuery<{ data: Schedule }>({
    queryKey: ['obligation-schedule', obligationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Schedule }>(`/obligations/${obligationId}/schedule`);
    },
  });

  const schedule = scheduleData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Schedule Management</h1>
            <p className="text-gray-600 mt-1">Manage monitoring schedule for this obligation</p>
          </div>
        </div>
        {!schedule && (
          <Link href={`/dashboard/sites/${siteId}/schedules/new?obligation_id=${obligationId}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        )}
      </div>

      {schedule ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Current Schedule</h2>
            <Link href={`/dashboard/sites/${siteId}/schedules/${schedule.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Schedule
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Frequency</label>
              <div className="mt-1 flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-900">{schedule.frequency}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Next Due Date</label>
              <div className="mt-1 text-sm text-gray-900">
                {schedule.next_due_date ? new Date(schedule.next_due_date).toLocaleDateString() : 'N/A'}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  schedule.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  schedule.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link href={`/dashboard/sites/${siteId}/schedules/${schedule.id}`}>
              <Button variant="outline">View Full Schedule Details</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schedule Found</h3>
          <p className="text-gray-600 mb-4">
            Create a monitoring schedule for this obligation to track deadlines and compliance.
          </p>
          <Link href={`/dashboard/sites/${siteId}/schedules/new?obligation_id=${obligationId}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Schedule
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

