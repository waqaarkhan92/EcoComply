'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

export default function NewRunHoursPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();

  const preSelectedGeneratorId = searchParams.get('generator_id');

  const [formData, setFormData] = useState({
    generator_id: preSelectedGeneratorId || '',
    hours_recorded: '',
    recording_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch generators for this site
  const { data: generatorsData } = useQuery<GeneratorsResponse>({
    queryKey: ['module-3-generators', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');

      return apiClient.get<GeneratorsResponse>(`/module-3/generators?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const generators = generatorsData?.data || [];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiClient.post('/module-3/run-hours', {
        generator_id: data.generator_id,
        hours_recorded: Number(data.hours_recorded),
        recording_date: data.recording_date,
        entry_method: 'MANUAL',
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-3-run-hours'] });
      queryClient.invalidateQueries({ queryKey: ['module-3-generator'] });
      router.push(`/dashboard/sites/${siteId}/module-3/run-hours`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.generator_id || !formData.hours_recorded || !formData.recording_date) {
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/run-hours`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Log Run Hours</h1>
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
            disabled={!!preSelectedGeneratorId}
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
          <label htmlFor="recording_date" className="block text-sm font-medium text-text-primary mb-2">
            Recording Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="recording_date"
            value={formData.recording_date}
            onChange={(e) => setFormData({ ...formData, recording_date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div>
          <label htmlFor="hours_recorded" className="block text-sm font-medium text-text-primary mb-2">
            Hours Recorded <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="hours_recorded"
            value={formData.hours_recorded}
            onChange={(e) => setFormData({ ...formData, hours_recorded: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="0"
            step="0.01"
            required
          />
          <p className="mt-1 text-sm text-text-tertiary">
            Enter the number of hours the generator ran on this date
          </p>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-2">
            Notes (Optional)
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
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create run-hour record'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Saving...' : 'Save Run Hours'}
          </Button>
          <Link href={`/dashboard/sites/${siteId}/module-3/run-hours`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

