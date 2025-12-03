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

interface RegulationThreshold {
  id: string;
  capacity_min_mw: number;
  capacity_max_mw: number | null;
  monitoring_frequency: string;
  stack_test_frequency: string;
  reporting_frequency: string;
  regulation_reference: string | null;
  is_active: boolean;
}

export default function EditRegulationThresholdPage({
  params,
}: {
  params: Promise<{ thresholdId: string }>;
}) {
  const { thresholdId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    capacity_min_mw: '',
    capacity_max_mw: '',
    monitoring_frequency: 'MONTHLY',
    stack_test_frequency: 'ANNUAL',
    reporting_frequency: 'ANNUAL',
    regulation_reference: '',
    is_active: true,
  });

  const { data: threshold, isLoading } = useQuery<RegulationThreshold>({
    queryKey: ['regulation-threshold', thresholdId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RegulationThreshold>(`/module-3/regulation-thresholds/${thresholdId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (threshold) {
      setFormData({
        capacity_min_mw: threshold.capacity_min_mw.toString(),
        capacity_max_mw: threshold.capacity_max_mw ? threshold.capacity_max_mw.toString() : '',
        monitoring_frequency: threshold.monitoring_frequency,
        stack_test_frequency: threshold.stack_test_frequency,
        reporting_frequency: threshold.reporting_frequency,
        regulation_reference: threshold.regulation_reference || '',
        is_active: threshold.is_active,
      });
    }
  }, [threshold]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.put(`/module-3/regulation-thresholds/${thresholdId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulation-threshold', thresholdId] });
      queryClient.invalidateQueries({ queryKey: ['regulation-thresholds'] });
      router.push(`/dashboard/module-3/regulation-thresholds/${thresholdId}`);
    },
    onError: (error: any) => {
      console.error('Failed to update regulation threshold:', error);
      alert('Failed to update regulation threshold. Please try again.');
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

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading regulation threshold...</div>;
  }

  if (!threshold) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Regulation threshold not found</p>
        <Link href="/dashboard/module-3/regulation-thresholds">
          <Button variant="outline" className="mt-4">
            Back to Regulation Thresholds
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-3/regulation-thresholds/${thresholdId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Threshold
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Edit Regulation Threshold</h1>
        <p className="text-text-secondary mt-2">
          Update regulation threshold details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="capacity_min_mw">Capacity Min (MW) *</Label>
            <Input
              id="capacity_min_mw"
              type="number"
              step="0.0001"
              required
              value={formData.capacity_min_mw}
              onChange={(e) => setFormData({ ...formData, capacity_min_mw: e.target.value })}
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
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-3/regulation-thresholds/${thresholdId}`}>
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

