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

interface CorrectiveAction {
  id: string;
  action_type: string;
  action_title: string;
  action_description: string;
  assigned_to: string | null;
  due_date: string;
  status: string;
  lifecycle_phase: string | null;
  root_cause_analysis: string | null;
  regulator_notification_required: boolean;
  regulator_justification: string | null;
}

export default function EditCorrectiveActionPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    action_type: 'IMMEDIATE_RESPONSE',
    action_title: '',
    action_description: '',
    assigned_to: '',
    due_date: '',
    status: 'OPEN',
    lifecycle_phase: 'TRIGGER',
    root_cause_analysis: '',
    regulator_notification_required: false,
    regulator_justification: '',
  });

  const { data: action, isLoading } = useQuery<CorrectiveAction>({
    queryKey: ['corrective-action', actionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<CorrectiveAction>(`/module-2/corrective-actions/${actionId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (action) {
      setFormData({
        action_type: action.action_type,
        action_title: action.action_title,
        action_description: action.action_description,
        assigned_to: action.assigned_to || '',
        due_date: action.due_date.split('T')[0],
        status: action.status,
        lifecycle_phase: action.lifecycle_phase || 'TRIGGER',
        root_cause_analysis: action.root_cause_analysis || '',
        regulator_notification_required: action.regulator_notification_required,
        regulator_justification: action.regulator_justification || '',
      });
    }
  }, [action]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-2/corrective-actions/${actionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-corrective-actions'] });
      router.push(`/dashboard/module-2/corrective-actions/${actionId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update corrective action:', error);
      alert('Failed to update corrective action. Please try again.');
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
      root_cause_analysis: formData.root_cause_analysis || undefined,
      regulator_justification: formData.regulator_justification || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading corrective action...</div>;
  }

  if (!action) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Corrective action not found</p>
        <Link href="/dashboard/module-2/corrective-actions">
          <Button variant="outline" className="mt-4">
            Back to Corrective Actions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-2/corrective-actions/${actionId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Corrective Action
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Corrective Action</h1>
        <p className="text-text-secondary mt-2">
          Update corrective action details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="action_type">Action Type *</Label>
            <select
              id="action_type"
              required
              value={formData.action_type}
              onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="IMMEDIATE_RESPONSE">Immediate Response</option>
              <option value="ROOT_CAUSE_ANALYSIS">Root Cause Analysis</option>
              <option value="PREVENTIVE_MEASURE">Preventive Measure</option>
              <option value="PROCESS_CHANGE">Process Change</option>
              <option value="EQUIPMENT_UPGRADE">Equipment Upgrade</option>
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
            <Label htmlFor="action_title">Action Title *</Label>
            <Input
              id="action_title"
              required
              value={formData.action_title}
              onChange={(e) => setFormData({ ...formData, action_title: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="action_description">Action Description *</Label>
            <textarea
              id="action_description"
              required
              value={formData.action_description}
              onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <Label htmlFor="lifecycle_phase">Lifecycle Phase</Label>
            <select
              id="lifecycle_phase"
              value={formData.lifecycle_phase}
              onChange={(e) => setFormData({ ...formData, lifecycle_phase: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="TRIGGER">Trigger</option>
              <option value="INVESTIGATION">Investigation</option>
              <option value="ACTION">Action</option>
              <option value="RESOLUTION">Resolution</option>
              <option value="CLOSURE">Closure</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="root_cause_analysis">Root Cause Analysis</Label>
            <textarea
              id="root_cause_analysis"
              value={formData.root_cause_analysis}
              onChange={(e) => setFormData({ ...formData, root_cause_analysis: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="regulator_notification_required"
                checked={formData.regulator_notification_required}
                onChange={(e) => setFormData({ ...formData, regulator_notification_required: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="regulator_notification_required" className="cursor-pointer">
                Regulator notification required
              </Label>
            </div>
          </div>

          {formData.regulator_notification_required && (
            <div className="md:col-span-2">
              <Label htmlFor="regulator_justification">Regulator Justification</Label>
              <textarea
                id="regulator_justification"
                value={formData.regulator_justification}
                onChange={(e) => setFormData({ ...formData, regulator_justification: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-2/corrective-actions/${actionId}`}>
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

