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

export default function NewPermitWorkflowPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    site_id: '',
    workflow_type: 'VARIATION',
    status: 'DRAFT',
    submitted_date: '',
    regulator_response_deadline: '',
    workflow_notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/permit-workflows', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['permit-workflows'] });
      router.push(`/dashboard/module-1/permit-workflows/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create permit workflow:', error);
      alert('Failed to create permit workflow. Please try again.');
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
      workflow_notes: formData.workflow_notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/permit-workflows"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Permit Workflows
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Permit Workflow</h1>
        <p className="text-text-secondary mt-2">
          Create a new permit variation, renewal, or surrender workflow
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="document_id">Document ID *</Label>
            <Input
              id="document_id"
              required
              value={formData.document_id}
              onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
              placeholder="UUID of the permit document"
              className="mt-1"
            />
          </div>

          <div>
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
            <Label htmlFor="workflow_type">Workflow Type *</Label>
            <select
              id="workflow_type"
              required
              value={formData.workflow_type}
              onChange={(e) => setFormData({ ...formData, workflow_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="VARIATION">Variation</option>
              <option value="RENEWAL">Renewal</option>
              <option value="SURRENDER">Surrender</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
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

          <div className="md:col-span-2">
            <Label htmlFor="workflow_notes">Workflow Notes</Label>
            <textarea
              id="workflow_notes"
              value={formData.workflow_notes}
              onChange={(e) => setFormData({ ...formData, workflow_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Additional notes about this workflow..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/permit-workflows">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Workflow'}
          </Button>
        </div>
      </form>
    </div>
  );
}

