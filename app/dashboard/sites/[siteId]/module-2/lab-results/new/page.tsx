'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

interface Parameter {
  id: string;
  parameter_type: string;
  limit_value: number;
  unit: string;
}

interface ParametersResponse {
  data: Parameter[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function NewLabResultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = params.siteId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    parameter_id: searchParams?.get('parameter_id') || '',
    sample_date: new Date().toISOString().split('T')[0],
    sample_id: '',
    recorded_value: '',
    lab_reference: '',
    notes: '',
  });

  // Update parameter_id when search params change
  useEffect(() => {
    const paramId = searchParams?.get('parameter_id');
    if (paramId) {
      setFormData(prev => ({ ...prev, parameter_id: paramId }));
    }
  }, [searchParams]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch parameters for this site
  const { data: parametersData, isLoading: parametersLoading } = useQuery<ParametersResponse>({
    queryKey: ['module-2-parameters', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');

      return apiClient.get<ParametersResponse>(`/module-2/parameters?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const parameters = parametersData?.data || [];
  const selectedParameter = parameters.find(p => p.id === formData.parameter_id);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post('/module-2/lab-results', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Lab result created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['module-2-lab-results'] });
      queryClient.invalidateQueries({ queryKey: ['module-2-parameters'] });
      queryClient.invalidateQueries({ queryKey: ['module-2-exceedances'] });
      router.push(`/dashboard/sites/${siteId}/module-2/lab-results`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create lab result',
        variant: 'destructive',
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.parameter_id) {
      newErrors.parameter_id = 'Parameter is required';
    }
    if (!formData.sample_date) {
      newErrors.sample_date = 'Sample date is required';
    }
    if (!formData.recorded_value) {
      newErrors.recorded_value = 'Recorded value is required';
    } else {
      const value = parseFloat(formData.recorded_value);
      if (isNaN(value) || value < 0) {
        newErrors.recorded_value = 'Recorded value must be a positive number';
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
      parameter_id: formData.parameter_id,
      site_id: siteId,
      sample_date: formData.sample_date,
      recorded_value: parseFloat(formData.recorded_value),
      unit: selectedParameter?.unit || 'mg/l',
      sample_id: formData.sample_id || undefined,
      lab_reference: formData.lab_reference || undefined,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Add Lab Result</h1>
          <p className="text-text-secondary mt-2">
            Enter a new laboratory test result for a parameter
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Parameter Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Parameter <span className="text-red-600">*</span>
            </label>
            {parametersLoading ? (
              <div className="text-sm text-text-tertiary">Loading parameters...</div>
            ) : (
              <select
                value={formData.parameter_id}
                onChange={(e) => setFormData({ ...formData, parameter_id: e.target.value })}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.parameter_id ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a parameter...</option>
                {parameters.map((param) => (
                  <option key={param.id} value={param.id}>
                    {param.parameter_type} (Limit: {param.limit_value} {param.unit})
                  </option>
                ))}
              </select>
            )}
            {errors.parameter_id && (
              <p className="mt-1 text-sm text-red-600">{errors.parameter_id}</p>
            )}
            {selectedParameter && (
              <p className="mt-1 text-sm text-text-tertiary">
                Limit: {selectedParameter.limit_value} {selectedParameter.unit}
              </p>
            )}
          </div>

          {/* Sample Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Sample Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={formData.sample_date}
              onChange={(e) => setFormData({ ...formData, sample_date: e.target.value })}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.sample_date ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.sample_date && (
              <p className="mt-1 text-sm text-red-600">{errors.sample_date}</p>
            )}
          </div>

          {/* Recorded Value */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Recorded Value <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.recorded_value}
                onChange={(e) => setFormData({ ...formData, recorded_value: e.target.value })}
                className={`flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.recorded_value ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter value"
                required
              />
              <span className="text-sm text-text-tertiary min-w-[60px]">
                {selectedParameter?.unit || 'mg/l'}
              </span>
            </div>
            {errors.recorded_value && (
              <p className="mt-1 text-sm text-red-600">{errors.recorded_value}</p>
            )}
            {selectedParameter && formData.recorded_value && !isNaN(parseFloat(formData.recorded_value)) && (
              <p className="mt-1 text-sm text-text-tertiary">
                {((parseFloat(formData.recorded_value) / selectedParameter.limit_value) * 100).toFixed(1)}% of limit
                {parseFloat(formData.recorded_value) > selectedParameter.limit_value && (
                  <span className="text-red-600 ml-2 font-semibold">(Exceeded)</span>
                )}
              </p>
            )}
          </div>

          {/* Sample ID */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Sample ID (Optional)
            </label>
            <input
              type="text"
              value={formData.sample_id}
              onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., LAB-001"
            />
          </div>

          {/* Lab Reference */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Lab Reference (Optional)
            </label>
            <input
              type="text"
              value={formData.lab_reference}
              onChange={(e) => setFormData({ ...formData, lab_reference: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Lab report number"
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
              placeholder="Additional notes about this result..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
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
                  Save Result
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

