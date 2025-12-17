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

interface PermitWorkflow {
  id: string;
  status: string;
  submitted_date: string | null;
  regulator_response_deadline: string | null;
  regulator_response_date: string | null;
  regulator_comments: string | null;
  approval_date: string | null;
  workflow_notes: string | null;
}

export default function EditPermitWorkflowPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: 'DRAFT',
    submitted_date: '',
    regulator_response_deadline: '',
    regulator_response_date: '',
    regulator_comments: '',
    approval_date: '',
    workflow_notes: '',
  });

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['permit-workflow', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitWorkflow>(`/module-1/permit-workflows/${workflowId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (workflow) {
      setFormData({
        status: workflow.status,
        submitted_date: workflow.submitted_date ? workflow.submitted_date.split('T')[0] : '',
        regulator_response_deadline: workflow.regulator_response_deadline ? workflow.regulator_response_deadline.split('T')[0] : '',
        regulator_response_date: workflow.regulator_response_date ? workflow.regulator_response_date.split('T')[0] : '',
        regulator_comments: workflow.regulator_comments || '',
        approval_date: workflow.approval_date ? workflow.approval_date.split('T')[0] : '',
        workflow_notes: workflow.workflow_notes || '',
      });
    }
  }, [workflow]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-1/permit-workflows/${workflowId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['permit-workflows'] });
      router.push(`/dashboard/module-1/permit-workflows/${workflowId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update permit workflow:', error);
      alert('Failed to update permit workflow. Please try again.');
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
      submitted_date: formData.submitted_date || undefined,
      regulator_response_deadline: formData.regulator_response_deadline || undefined,
      regulator_response_date: formData.regulator_response_date || undefined,
      regulator_comments: formData.regulator_comments || undefined,
      approval_date: formData.approval_date || undefined,
      workflow_notes: formData.workflow_notes || undefined,
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading permit workflow...</div>;
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Permit workflow not found</p>
        <Link href="/dashboard/module-1/permit-workflows">
          <Button variant="outline" className="mt-4">
            Back to Permit Workflows
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/permit-workflows/${workflowId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Workflow
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Permit Workflow</h1>
        <p className="text-text-secondary mt-2">
          Update permit workflow details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <Label htmlFor="submitted_date">Submitted Date</Label>
            <Input
              id="submitted_date"
              type="date"
              value={formData.submitted_date}
              onChange={(e) => setFormData({ ...formData, submitted_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="regulator_response_deadline">Regulator Response Deadline</Label>
            <Input
              id="regulator_response_deadline"
              type="date"
              value={formData.regulator_response_deadline}
              onChange={(e) => setFormData({ ...formData, regulator_response_deadline: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="regulator_response_date">Regulator Response Date</Label>
            <Input
              id="regulator_response_date"
              type="date"
              value={formData.regulator_response_date}
              onChange={(e) => setFormData({ ...formData, regulator_response_date: e.target.value })}
              className="mt-1"
            />
          </div>

          {formData.status === 'APPROVED' && (
            <div>
              <Label htmlFor="approval_date">Approval Date</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                className="mt-1"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="regulator_comments">Regulator Comments</Label>
            <textarea
              id="regulator_comments"
              value={formData.regulator_comments}
              onChange={(e) => setFormData({ ...formData, regulator_comments: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="workflow_notes">Workflow Notes</Label>
            <textarea
              id="workflow_notes"
              value={formData.workflow_notes}
              onChange={(e) => setFormData({ ...formData, workflow_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/permit-workflows/${workflowId}`}>
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

