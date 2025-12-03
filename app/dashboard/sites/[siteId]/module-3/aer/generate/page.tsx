'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Save } from 'lucide-react';
import Link from 'next/link';

interface MCPDRegistration {
  id: string;
  title: string;
  reference_number: string | null;
  generators: Array<{
    id: string;
    generator_identifier: string;
  }>;
}

interface RegistrationsResponse {
  data: MCPDRegistration[];
}

export default function GenerateAERPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    document_id: '',
    year: new Date().getFullYear().toString(),
    generator_ids: [] as string[],
  });

  // Fetch MCPD registrations for this site
  const { data: registrationsData } = useQuery<RegistrationsResponse>({
    queryKey: ['module-3-registrations', siteId],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      params.append('limit', '100');

      return apiClient.get<RegistrationsResponse>(`/module-3/mcpd-registrations?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const registrations = registrationsData?.data || [];
  const selectedRegistration = registrations.find((r) => r.id === formData.document_id);
  const availableGenerators = selectedRegistration?.generators || [];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiClient.post('/module-3/aer/generate', {
        document_id: data.document_id,
        year: Number(data.year),
        generator_ids: data.generator_ids.length > 0 ? data.generator_ids : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-3-aer'] });
      router.push(`/dashboard/sites/${siteId}/module-3/aer`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.document_id || !formData.year) {
      return;
    }
    mutation.mutate(formData);
  };

  const handleGeneratorToggle = (generatorId: string) => {
    setFormData((prev) => ({
      ...prev,
      generator_ids: prev.generator_ids.includes(generatorId)
        ? prev.generator_ids.filter((id) => id !== generatorId)
        : [...prev.generator_ids, generatorId],
    }));
  };

  const handleSelectAll = () => {
    if (availableGenerators.length === 0) return;
    if (formData.generator_ids.length === availableGenerators.length) {
      setFormData((prev) => ({ ...prev, generator_ids: [] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        generator_ids: availableGenerators.map((g) => g.id),
      }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/aer`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Generate Annual Emissions Report</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border p-6 space-y-6 max-w-2xl">
        <div>
          <label htmlFor="document_id" className="block text-sm font-medium text-text-primary mb-2">
            MCPD Registration <span className="text-red-500">*</span>
          </label>
          <select
            id="document_id"
            value={formData.document_id}
            onChange={(e) => {
              setFormData({
                ...formData,
                document_id: e.target.value,
                generator_ids: [], // Reset generator selection when registration changes
              });
            }}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select a registration</option>
            {registrations.map((reg) => (
              <option key={reg.id} value={reg.id}>
                {reg.title} {reg.reference_number && `(${reg.reference_number})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium text-text-primary mb-2">
            Reporting Year <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="year"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            min="2020"
            max={new Date().getFullYear() + 1}
            required
          />
          <p className="mt-1 text-sm text-text-tertiary">
            The reporting period will be January 1 - December 31 of the selected year
          </p>
        </div>

        {selectedRegistration && availableGenerators.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-text-primary">
                Generators to Include
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {formData.generator_ids.length === availableGenerators.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
            </div>
            <p className="text-sm text-text-tertiary mb-3">
              Select which generators to include in the AER. If none selected, all generators will be included.
            </p>
            <div className="border border-border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
              {availableGenerators.map((generator) => (
                <label
                  key={generator.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.generator_ids.includes(generator.id)}
                    onChange={() => handleGeneratorToggle(generator.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-text-primary">{generator.generator_identifier}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedRegistration && availableGenerators.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              This registration has no generators. Please ensure generators are extracted from the registration document first.
            </p>
          </div>
        )}

        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to generate AER'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending || !formData.document_id}>
            <FileText className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Generating...' : 'Generate AER'}
          </Button>
          <Link href={`/dashboard/sites/${siteId}/module-3/aer`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

