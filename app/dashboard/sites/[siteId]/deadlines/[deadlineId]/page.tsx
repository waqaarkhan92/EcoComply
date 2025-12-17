'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Deadline {
  id: string;
  obligation_id: string;
  due_date: string;
  status: string;
  compliance_period: string;
  is_late: boolean;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  created_at: string;
}

export default function DeadlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const deadlineId = params.deadlineId as string;

  const { data: deadlineData, isLoading, error } = useQuery({
    queryKey: ['deadline', deadlineId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Deadline }>(`/deadlines/${deadlineId}`);
    },
    enabled: !!deadlineId,
  });

  const completeDeadline = useMutation({
    mutationFn: async (notes?: string) => {
      return apiClient.put(`/deadlines/${deadlineId}/complete`, { completion_notes: notes });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading deadline...</div>
      </div>
    );
  }

  if (error || !deadlineData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading deadline</div>
      </div>
    );
  }

  const deadline = deadlineData.data;
  const isCompleted = deadline.status === 'COMPLETED' || deadline.status === 'LATE_COMPLETE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/deadlines`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Deadline Details</h1>
            <p className="text-gray-600 mt-1">View and manage deadline information</p>
          </div>
        </div>
        {!isCompleted && (
          <Button
            onClick={() => completeDeadline.mutate(undefined)}
            disabled={completeDeadline.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark Complete
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Due Date</label>
            <div className="mt-1 flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">
                {new Date(deadline.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                deadline.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                deadline.is_late ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {deadline.status}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Compliance Period</label>
            <div className="mt-1 text-sm text-gray-900">
              {deadline.compliance_period || 'N/A'}
            </div>
          </div>

          {deadline.completed_at && (
            <div>
              <label className="text-sm font-medium text-gray-500">Completed At</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(deadline.completed_at).toLocaleString()}
              </div>
            </div>
          )}

          {deadline.completion_notes && (
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Completion Notes</label>
              <div className="mt-1 text-sm text-gray-900">
                {deadline.completion_notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

