'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface RecurringTask {
  id: string;
  task_type: string;
  task_title: string;
  task_description: string | null;
  due_date: string;
  status: string;
  assigned_to: string | null;
  completion_notes: string | null;
}

export default function EditRecurringTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    task_type: 'MONITORING',
    task_title: '',
    task_description: '',
    due_date: '',
    status: 'PENDING',
    assigned_to: '',
    completion_notes: '',
  });

  const { data: task, isLoading } = useQuery<RecurringTask>({
    queryKey: ['recurring-task', taskId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RecurringTask>(`/recurring-tasks/${taskId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (task) {
      setFormData({
        task_type: task.task_type,
        task_title: task.task_title,
        task_description: task.task_description || '',
        due_date: task.due_date.split('T')[0],
        status: task.status,
        assigned_to: task.assigned_to || '',
        completion_notes: task.completion_notes || '',
      });
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/recurring-tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
      router.push(`/dashboard/recurring-tasks/${taskId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update recurring task:', error);
      alert('Failed to update recurring task. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const submitData = {
      ...formData,
      assigned_to: formData.assigned_to || undefined,
      task_description: formData.task_description || undefined,
      completion_notes: formData.completion_notes || undefined,
    };

    updateMutation.mutate(submitData);
  };

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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/recurring-tasks/${taskId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Task
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Recurring Task</h1>
        <p className="text-text-secondary mt-2">
          Update recurring task details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="task_type">Task Type *</Label>
            <select
              id="task_type"
              required
              value={formData.task_type}
              onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="MONITORING">Monitoring</option>
              <option value="EVIDENCE_COLLECTION">Evidence Collection</option>
              <option value="REPORTING">Reporting</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SAMPLING">Sampling</option>
              <option value="INSPECTION">Inspection</option>
            </select>
          </div>

          <div>
            <Label htmlFor="due_date">Due Date *</Label>
            <Input
              id="due_date"
              type="date"
              required
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="task_title">Task Title *</Label>
            <Input
              id="task_title"
              required
              value={formData.task_title}
              onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="task_description">Description</Label>
            <textarea
              id="task_description"
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          {formData.status === 'COMPLETED' && (
            <div className="md:col-span-2">
              <Label htmlFor="completion_notes">Completion Notes</Label>
              <textarea
                id="completion_notes"
                value={formData.completion_notes}
                onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/recurring-tasks/${taskId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

