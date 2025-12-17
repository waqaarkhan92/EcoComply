'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface Generator {
  id: string;
  generator_identifier: string;
  generator_type: string;
}

interface GeneratorsResponse {
  data: Generator[];
}

export default function NewMaintenanceRecordPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    generator_id: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: '',
    description: '',
    run_hours_at_service: '',
    service_provider: '',
    service_reference: '',
    next_service_due: '',
    notes: '',
  });

  // Fetch generators for this site
  const { data: generatorsData } = useQuery({
    queryKey: ['module-3-generators', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');

      return apiClient.get<GeneratorsResponse>(`/module-3/generators?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const generators: any[] = generatorsData?.data || [];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiClient.post('/module-3/maintenance-records', {
        generator_id: data.generator_id,
        maintenance_date: data.maintenance_date,
        maintenance_type: data.maintenance_type,
        description: data.description || null,
        run_hours_at_service: data.run_hours_at_service ? Number(data.run_hours_at_service) : null,
        service_provider: data.service_provider || null,
        service_reference: data.service_reference || null,
        next_service_due: data.next_service_due || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-3-maintenance-records'] });
      router.push(`/dashboard/sites/${siteId}/module-3/maintenance-records`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.generator_id || !formData.maintenance_date || !formData.maintenance_type) {
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/maintenance-records`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Add Maintenance Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-6 max-w-2xl">
        <div>
          <label htmlFor="generator_id" className="block text-sm font-medium text-text-primary mb-2">
            Generator <span className="text-red-500">*</span>
          </label>
          <select
            id="generator_id"
            value={formData.generator_id}
            onChange={(e) => setFormData({ ...formData, generator_id: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select a generator</option>
            {generators.map((gen) => (
              <option key={gen.id} value={gen.id}>
                {gen.generator_identifier} ({gen.generator_type.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="maintenance_date" className="block text-sm font-medium text-text-primary mb-2">
            Maintenance Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="maintenance_date"
            value={formData.maintenance_date}
            onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="maintenance_type" className="block text-sm font-medium text-text-primary mb-2">
            Maintenance Type <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="maintenance_type"
            value={formData.maintenance_type}
            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Annual Service, Oil Change, Filter Replacement"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
            placeholder="Describe the maintenance work performed..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="service_provider" className="block text-sm font-medium text-text-primary mb-2">
              Service Provider
            </label>
            <input
              type="text"
              id="service_provider"
              value={formData.service_provider}
              onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Company name"
            />
          </div>
          <div>
            <label htmlFor="service_reference" className="block text-sm font-medium text-text-primary mb-2">
              Service Reference
            </label>
            <input
              type="text"
              id="service_reference"
              value={formData.service_reference}
              onChange={(e) => setFormData({ ...formData, service_reference: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Invoice/Work order number"
            />
          </div>
        </div>

        <div>
          <label htmlFor="run_hours_at_service" className="block text-sm font-medium text-text-primary mb-2">
            Run Hours at Service
          </label>
          <input
            type="number"
            id="run_hours_at_service"
            value={formData.run_hours_at_service}
            onChange={(e) => setFormData({ ...formData, run_hours_at_service: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="0"
            step="0.01"
            placeholder="Total run hours when service was performed"
          />
          <p className="mt-1 text-sm text-text-tertiary">
            If provided, this will automatically create a run-hour record
          </p>
        </div>

        <div>
          <label htmlFor="next_service_due" className="block text-sm font-medium text-text-primary mb-2">
            Next Service Due Date
          </label>
          <input
            type="date"
            id="next_service_due"
            value={formData.next_service_due}
            onChange={(e) => setFormData({ ...formData, next_service_due: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
        </div>

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create maintenance record'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Saving...' : 'Save Maintenance Record'}
          </Button>
          <Link href={`/dashboard/sites/${siteId}/module-3/maintenance-records`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

