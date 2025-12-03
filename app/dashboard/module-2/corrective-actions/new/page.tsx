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

export default function NewCorrectiveActionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    exceedance_id: '',
    parameter_id: '',
    site_id: '',
    action_type: 'IMMEDIATE_RESPONSE',
    action_title: '',
    action_description: '',
    assigned_to: '',
    due_date: '',
    lifecycle_phase: 'TRIGGER',
    evidence_ids: '',
    root_cause_analysis: '',
    regulator_notification_required: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/corrective-actions', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-2-corrective-actions'] });
      router.push(`/dashboard/module-2/corrective-actions/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create corrective action:', error);
      alert('Failed to create corrective action. Please try again.');
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
      exceedance_id: formData.exceedance_id || undefined,
      parameter_id: formData.parameter_id || undefined,
      assigned_to: formData.assigned_to || undefined,
      evidence_ids: formData.evidence_ids ? formData.evidence_ids.split(',').map(id => id.trim()).filter(Boolean) : [],
      root_cause_analysis: formData.root_cause_analysis || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-2/corrective-actions"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Corrective Actions
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Corrective Action</h1>
        <p className="text-text-secondary mt-2">
          Create a new corrective action for an exceedance or breach
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
              placeholder="Brief title for the corrective action"
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
              placeholder="Detailed description of the corrective action..."
            />
          </div>

          <div>
            <Label htmlFor="exceedance_id">Exceedance ID (optional)</Label>
            <Input
              id="exceedance_id"
              value={formData.exceedance_id}
              onChange={(e) => setFormData({ ...formData, exceedance_id: e.target.value })}
              placeholder="UUID of related exceedance"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="parameter_id">Parameter ID (optional)</Label>
            <Input
              id="parameter_id"
              value={formData.parameter_id}
              onChange={(e) => setFormData({ ...formData, parameter_id: e.target.value })}
              placeholder="UUID of related parameter"
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

          <div className="md:col-span-2">
            <Label htmlFor="evidence_ids">Evidence IDs (comma-separated, optional)</Label>
            <Input
              id="evidence_ids"
              value={formData.evidence_ids}
              onChange={(e) => setFormData({ ...formData, evidence_ids: e.target.value })}
              placeholder="UUID1, UUID2, UUID3"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="root_cause_analysis">Root Cause Analysis (optional)</Label>
            <textarea
              id="root_cause_analysis"
              value={formData.root_cause_analysis}
              onChange={(e) => setFormData({ ...formData, root_cause_analysis: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Analysis of the root cause..."
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
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-2/corrective-actions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Corrective Action'}
          </Button>
        </div>
      </form>
    </div>
  );
}

