'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Calendar, CheckCircle2, Clock, AlertCircle, XCircle, User } from 'lucide-react';
import Link from 'next/link';

interface RecurringTask {
  id: string;
  schedule_id: string | null;
  obligation_id: string | null;
  site_id: string;
  task_type: string;
  task_title: string;
  task_description: string | null;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  assigned_to: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  trigger_type: string;
  trigger_data: any;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  PENDING: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Clock },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle },
};

export default function RecurringTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery<RecurringTask>({
    queryKey: ['recurring-task', taskId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurringTask>(`/recurring-tasks/${taskId}`);
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiClient.put(`/recurring-tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading recurring task...</div>;
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Recurring task not found</p>
        <Link href="/dashboard/recurring-tasks">
          <Button variant="outline" className="mt-4">
            Back to Recurring Tasks
          </Button>
        </Link>
      </div>
    );
  }

  const statusStyle = statusColors[task.status] || statusColors.PENDING;
  const StatusIcon = statusStyle.icon;
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/recurring-tasks"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Recurring Tasks
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {task.task_title}
          </h1>
          <p className="text-text-secondary mt-2">
            {task.task_type.replace('_', ' ')} • {task.trigger_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/recurring-tasks/${taskId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${statusStyle.bg} ${statusStyle.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-6 h-6 ${statusStyle.text}`} />
            <div>
              <p className="font-semibold text-gray-900">
                Status: {task.status}
                {isOverdue && <span className="text-red-600 ml-2">(Overdue)</span>}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Due Date: {new Date(task.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {task.status === 'PENDING' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatusMutation.mutate('IN_PROGRESS')}
                disabled={updateStatusMutation.isPending}
              >
                Start Task
              </Button>
            )}
            {task.status === 'IN_PROGRESS' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateStatusMutation.mutate('COMPLETED')}
                disabled={updateStatusMutation.isPending}
              >
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Task Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Task Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Task Title</p>
            <p className="text-text-primary font-medium">{task.task_title}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Task Type</p>
            <p className="text-text-primary">{task.task_type.replace('_', ' ')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              <StatusIcon className="w-4 h-4 mr-2" />
              {task.status}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Due Date</p>
            <p className={`text-text-primary flex items-center gap-2 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-4 h-4" />
              {new Date(task.due_date).toLocaleDateString()}
              {isOverdue && <span className="text-xs">(Overdue)</span>}
            </p>
          </div>

          {task.assigned_to && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Assigned To</p>
              <p className="text-text-primary flex items-center gap-2">
                <User className="w-4 h-4" />
                {task.assigned_to}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Trigger Type</p>
            <p className="text-text-primary">{task.trigger_type.replace('_', ' ')}</p>
          </div>

          {task.task_description && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Description</p>
              <p className="text-text-primary whitespace-pre-wrap">{task.task_description}</p>
            </div>
          )}

          {task.completion_notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Completion Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{task.completion_notes}</p>
            </div>
          )}

          {task.completed_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Completed At</p>
              <p className="text-text-primary">
                {new Date(task.completed_at).toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(task.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(task.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

