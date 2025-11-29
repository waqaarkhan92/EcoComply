'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

interface Consent {
  id: string;
  title: string;
  reference_number: string;
  water_company: string;
}

interface ConsentsResponse {
  data: Consent[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function NewDischargeVolumePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    document_id: '',
    recording_date: new Date().toISOString().split('T')[0],
    volume_m3: '',
    measurement_method: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch consents for this site
  const { data: consentsData, isLoading: consentsLoading } = useQuery<ConsentsResponse>({
    queryKey: ['module-2-consents', siteId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');

      return apiClient.get<ConsentsResponse>(`/module-2/consents?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const consents = consentsData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/discharge-volumes', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Discharge volume record created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['module-2-discharge-volumes'] });
      router.push(`/dashboard/sites/${siteId}/module-2/discharge-volumes`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create discharge volume record',
        variant: 'destructive',
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.document_id) {
      newErrors.document_id = 'Consent document is required';
    }
    if (!formData.recording_date) {
      newErrors.recording_date = 'Recording date is required';
    }
    if (!formData.volume_m3) {
      newErrors.volume_m3 = 'Volume is required';
    } else {
      const value = parseFloat(formData.volume_m3);
      if (isNaN(value) || value < 0) {
        newErrors.volume_m3 = 'Volume must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData = {
      document_id: formData.document_id,
      recording_date: formData.recording_date,
      volume_m3: parseFloat(formData.volume_m3),
      measurement_method: formData.measurement_method || undefined,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Add Discharge Volume</h1>
          <p className="text-text-secondary mt-2">
            Record a new discharge volume measurement
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Consent Document Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Consent Document <span className="text-red-600">*</span>
            </label>
            {consentsLoading ? (
              <div className="text-sm text-text-tertiary">Loading consents...</div>
            ) : (
              <select
                value={formData.document_id}
                onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.document_id ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a consent document...</option>
                {consents.map((consent) => (
                  <option key={consent.id} value={consent.id}>
                    {consent.title} {consent.reference_number ? `(${consent.reference_number})` : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.document_id && (
              <p className="mt-1 text-sm text-red-600">{errors.document_id}</p>
            )}
          </div>

          {/* Recording Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Recording Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formData.recording_date}
              onChange={(e) => setFormData({ ...formData, recording_date: e.target.value })}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.recording_date ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.recording_date && (
              <p className="mt-1 text-sm text-red-600">{errors.recording_date}</p>
            )}
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Volume (m³) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.volume_m3}
              onChange={(e) => setFormData({ ...formData, volume_m3: e.target.value })}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.volume_m3 ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter volume in cubic meters"
              required
            />
            {errors.volume_m3 && (
              <p className="mt-1 text-sm text-red-600">{errors.volume_m3}</p>
            )}
          </div>

          {/* Measurement Method */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Measurement Method (Optional)
            </label>
            <input
              type="text"
              value={formData.measurement_method}
              onChange={(e) => setFormData({ ...formData, measurement_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Meter reading, Estimated, Calculated"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Additional notes about this volume record..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes`}>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button 
              variant="primary" 
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Record
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

