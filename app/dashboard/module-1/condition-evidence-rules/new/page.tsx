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

export default function NewConditionEvidenceRulePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    obligation_id: '',
    condition_reference: '',
    site_id: '',
    allowed_evidence_types: '',
    required_evidence_types: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/condition-evidence-rules', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['condition-evidence-rules'] });
      router.push(`/dashboard/module-1/condition-evidence-rules/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create condition evidence rule:', error);
      alert('Failed to create condition evidence rule. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const allowedTypes = formData.allowed_evidence_types
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);

    const requiredTypes = formData.required_evidence_types
      .split(',')
      .map(type => type.trim())
      .filter(type => type.length > 0);

    const submitData = {
      ...formData,
      obligation_id: formData.obligation_id || undefined,
      allowed_evidence_types: allowedTypes,
      required_evidence_types: requiredTypes,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/condition-evidence-rules"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Condition Evidence Rules
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Condition Evidence Rule</h1>
        <p className="text-text-secondary mt-2">
          Configure allowed evidence types for a permit condition
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
            <Label htmlFor="condition_reference">Condition Reference *</Label>
            <Input
              id="condition_reference"
              required
              value={formData.condition_reference}
              onChange={(e) => setFormData({ ...formData, condition_reference: e.target.value })}
              placeholder="e.g., Condition 2.3"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="obligation_id">Obligation ID (Optional)</Label>
            <Input
              id="obligation_id"
              value={formData.obligation_id}
              onChange={(e) => setFormData({ ...formData, obligation_id: e.target.value })}
              placeholder="UUID of the obligation (optional)"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="allowed_evidence_types">Allowed Evidence Types (comma-separated)</Label>
            <Input
              id="allowed_evidence_types"
              value={formData.allowed_evidence_types}
              onChange={(e) => setFormData({ ...formData, allowed_evidence_types: e.target.value })}
              placeholder="e.g., Document, Photo, Measurement"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="required_evidence_types">Required Evidence Types (comma-separated)</Label>
            <Input
              id="required_evidence_types"
              value={formData.required_evidence_types}
              onChange={(e) => setFormData({ ...formData, required_evidence_types: e.target.value })}
              placeholder="e.g., Document, Certificate"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/condition-evidence-rules">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
}

