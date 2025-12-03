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

export default function NewRegulationThresholdPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    threshold_type: 'CUSTOM',
    capacity_min_mw: '',
    capacity_max_mw: '',
    monitoring_frequency: 'MONTHLY',
    stack_test_frequency: 'ANNUAL',
    reporting_frequency: 'ANNUAL',
    regulation_reference: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-3/regulation-thresholds', data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['regulation-thresholds'] });
      router.push(`/dashboard/module-3/regulation-thresholds/${response.data.id}`);
    },
    onError: (error: any) => {
      console.error('Failed to create regulation threshold:', error);
      alert('Failed to create regulation threshold. Please try again.');
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
      capacity_min_mw: parseFloat(formData.capacity_min_mw),
      capacity_max_mw: formData.capacity_max_mw ? parseFloat(formData.capacity_max_mw) : undefined,
      regulation_reference: formData.regulation_reference || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/module-3/regulation-thresholds"
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Regulation Thresholds
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">New Regulation Threshold</h1>
        <p className="text-text-secondary mt-2">
          Create a new MW threshold with monitoring frequency requirements
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="threshold_type">Threshold Type *</Label>
            <select
              id="threshold_type"
              required
              value={formData.threshold_type}
              onChange={(e) => setFormData({ ...formData, threshold_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="MCPD_1_5MW">MCPD 1-5MW</option>
              <option value="MCPD_5_50MW">MCPD 5-50MW</option>
              <option value="SPECIFIED_GENERATOR">Specified Generator</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div>
            <Label htmlFor="capacity_min_mw">Capacity Min (MW) *</Label>
            <Input
              id="capacity_min_mw"
              type="number"
              step="0.0001"
              required
              value={formData.capacity_min_mw}
              onChange={(e) => setFormData({ ...formData, capacity_min_mw: e.target.value })}
              placeholder="0.0000"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="capacity_max_mw">Capacity Max (MW)</Label>
            <Input
              id="capacity_max_mw"
              type="number"
              step="0.0001"
              value={formData.capacity_max_mw}
              onChange={(e) => setFormData({ ...formData, capacity_max_mw: e.target.value })}
              placeholder="Leave empty for unlimited"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="monitoring_frequency">Monitoring Frequency *</Label>
            <select
              id="monitoring_frequency"
              required
              value={formData.monitoring_frequency}
              onChange={(e) => setFormData({ ...formData, monitoring_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="ANNUAL">Annual</option>
              <option value="CONTINUOUS">Continuous</option>
            </select>
          </div>

          <div>
            <Label htmlFor="stack_test_frequency">Stack Test Frequency *</Label>
            <select
              id="stack_test_frequency"
              required
              value={formData.stack_test_frequency}
              onChange={(e) => setFormData({ ...formData, stack_test_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="ANNUAL">Annual</option>
              <option value="BIENNIAL">Biennial</option>
              <option value="AS_REQUIRED">As Required</option>
            </select>
          </div>

          <div>
            <Label htmlFor="reporting_frequency">Reporting Frequency *</Label>
            <select
              id="reporting_frequency"
              required
              value={formData.reporting_frequency}
              onChange={(e) => setFormData({ ...formData, reporting_frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
            >
              <option value="ANNUAL">Annual</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div>
            <Label htmlFor="regulation_reference">Regulation Reference</Label>
            <Input
              id="regulation_reference"
              value={formData.regulation_reference}
              onChange={(e) => setFormData({ ...formData, regulation_reference: e.target.value })}
              placeholder="e.g., MCPD Regulation 2018"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href="/dashboard/module-3/regulation-thresholds">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Threshold'}
          </Button>
        </div>
      </form>
    </div>
  );
}

