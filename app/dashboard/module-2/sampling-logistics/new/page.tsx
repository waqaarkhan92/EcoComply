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

export default function NewSamplingLogisticPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    parameter_id: '',
    site_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    sample_id: '',
    stage: 'SCHEDULED',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/sampling-logistics', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['module-2-sampling-logistics'] });
      router.push(`/dashboard/module-2/sampling-logistics/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create sampling logistics record:', error);
      alert('Failed to create sampling logistics record. Please try again.');
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
      sample_id: formData.sample_id || undefined,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-2/sampling-logistics"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Sampling Logistics
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Sampling Record</h1>
        <p className="text-text-secondary mt-2">
          Create a new sampling logistics record
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="parameter_id">Parameter ID *</Label>
            <Input
              id="parameter_id"
              required
              value={formData.parameter_id}
              onChange={(e) => setFormData({ ...formData, parameter_id: e.target.value })}
              placeholder="UUID of the parameter"
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
            <Label htmlFor="scheduled_date">Scheduled Date *</Label>
            <Input
              id="scheduled_date"
              type="date"
              required
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="sample_id">Sample ID</Label>
            <Input
              id="sample_id"
              value={formData.sample_id}
              onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
              placeholder="Optional sample identifier"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-2/sampling-logistics">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Sampling Record'}
          </Button>
        </div>
      </form>
    </div>
  );
}

