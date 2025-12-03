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

export default function NewPermitVersionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    document_id: '',
    version_number: '',
    version_date: new Date().toISOString().split('T')[0],
    effective_date: '',
    expiry_date: '',
    version_type: 'INITIAL' as 'INITIAL' | 'VARIATION' | 'REVOCATION' | 'SURRENDER' | 'TRANSFER',
    change_summary: '',
    redline_document_url: '',
    impact_analysis: '',
    is_current: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-1/permit-versions', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-1-permit-versions'] });
      router.push(`/dashboard/module-1/permit-versions/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create permit version:', error);
      alert('Failed to create permit version. Please try again.');
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
      version_number: parseInt(formData.version_number),
      effective_date: formData.effective_date || undefined,
      expiry_date: formData.expiry_date || undefined,
      change_summary: formData.change_summary || undefined,
      redline_document_url: formData.redline_document_url || undefined,
      impact_analysis: formData.impact_analysis ? JSON.parse(formData.impact_analysis) : {},
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-1/permit-versions"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Permit Versions
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Permit Version</h1>
        <p className="text-text-secondary mt-2">
          Create a new version of a permit document
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
            <Label htmlFor="version_number">Version Number *</Label>
            <Input
              id="version_number"
              type="number"
              required
              min="1"
              value={formData.version_number}
              onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
              placeholder="e.g., 1, 2, 3"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="version_date">Version Date *</Label>
            <Input
              id="version_date"
              type="date"
              required
              value={formData.version_date}
              onChange={(e) => setFormData({ ...formData, version_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="version_type">Version Type *</Label>
            <select
              id="version_type"
              required
              value={formData.version_type}
              onChange={(e) => setFormData({ ...formData, version_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="INITIAL">Initial</option>
              <option value="VARIATION">Variation</option>
              <option value="REVOCATION">Revocation</option>
              <option value="SURRENDER">Surrender</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>

          <div>
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="change_summary">Change Summary</Label>
            <textarea
              id="change_summary"
              value={formData.change_summary}
              onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Summary of changes in this version..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="redline_document_url">Redline Document URL</Label>
            <Input
              id="redline_document_url"
              type="url"
              value={formData.redline_document_url}
              onChange={(e) => setFormData({ ...formData, redline_document_url: e.target.value })}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="impact_analysis">Impact Analysis (JSON)</Label>
            <textarea
              id="impact_analysis"
              value={formData.impact_analysis}
              onChange={(e) => setFormData({ ...formData, impact_analysis: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
              placeholder='{"obligations_added": 5, "obligations_removed": 2, ...}'
            />
            <p className="text-sm text-text-secondary mt-1">
              Enter impact analysis as JSON object
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={formData.is_current}
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_current" className="cursor-pointer">
                Mark as current version
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-1/permit-versions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Permit Version'}
          </Button>
        </div>
      </form>
    </div>
  );
}

