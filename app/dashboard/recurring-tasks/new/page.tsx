'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewRecurringTaskPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    schedule_id: '',
    obligation_id: '',
    site_id: '',
    task_type: 'MONITORING',
    task_title: '',
    task_description: '',
    due_date: new Date().toISOString().split('T')[0],
    assigned_to: '',
    trigger_type: 'MANUAL',
    trigger_data: {},
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/recurring-tasks', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] });
      router.push(`/dashboard/recurring-tasks/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create recurring task:', error);
      alert('Failed to create recurring task. Please try again.');
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
      schedule_id: formData.schedule_id || undefined,
      obligation_id: formData.obligation_id || undefined,
      assigned_to: formData.assigned_to || undefined,
      task_description: formData.task_description || undefined,
      trigger_data: formData.trigger_data || {},
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/recurring-tasks"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Recurring Tasks
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Recurring Task</h1>
        <p className="text-text-secondary mt-2">
          Create a new recurring task manually
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="site_id">Site ID *</Label>
            <Input
              id="site_id"
              required
              value={formData.site_id}
              onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
              placeholder="UUID of the site"
              className="mt-1"
            />
          </div>

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
            <Label htmlFor="trigger_type">Trigger Type *</Label>
            <select
              id="trigger_type"
              required
              value={formData.trigger_type}
              onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="MANUAL">Manual</option>
              <option value="SCHEDULE">Schedule</option>
              <option value="EVENT_BASED">Event Based</option>
              <option value="CONDITIONAL">Conditional</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="task_title">Task Title *</Label>
            <Input
              id="task_title"
              required
              value={formData.task_title}
              onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
              placeholder="Brief title for the task"
              className="mt-1"
            />
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

          <div>
            <Label htmlFor="assigned_to">Assigned To (optional)</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              placeholder="User UUID"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="schedule_id">Schedule ID (optional)</Label>
            <Input
              id="schedule_id"
              value={formData.schedule_id}
              onChange={(e) => setFormData({ ...formData, schedule_id: e.target.value })}
              placeholder="UUID of related schedule"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="obligation_id">Obligation ID (optional)</Label>
            <Input
              id="obligation_id"
              value={formData.obligation_id}
              onChange={(e) => setFormData({ ...formData, obligation_id: e.target.value })}
              placeholder="UUID of related obligation"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="task_description">Description (optional)</Label>
            <textarea
              id="task_description"
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Task description..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/recurring-tasks">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}

