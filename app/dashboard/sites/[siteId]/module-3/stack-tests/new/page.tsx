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

export default function NewStackTestPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    generator_id: '',
    test_date: new Date().toISOString().split('T')[0],
    test_company: '',
    test_reference: '',
    nox_result: '',
    so2_result: '',
    co_result: '',
    particulates_result: '',
    compliance_status: 'PENDING',
    exceedances_found: false,
    exceedance_details: '',
    next_test_due: '',
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
      return apiClient.post('/module-3/stack-tests', {
        generator_id: data.generator_id,
        test_date: data.test_date,
        test_company: data.test_company || null,
        test_reference: data.test_reference || null,
        nox_result: data.nox_result ? Number(data.nox_result) : null,
        so2_result: data.so2_result ? Number(data.so2_result) : null,
        co_result: data.co_result ? Number(data.co_result) : null,
        particulates_result: data.particulates_result ? Number(data.particulates_result) : null,
        compliance_status: data.compliance_status,
        exceedances_found: data.exceedances_found,
        exceedance_details: data.exceedance_details || null,
        next_test_due: data.next_test_due || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-3-stack-tests'] });
      router.push(`/dashboard/sites/${siteId}/module-3/stack-tests`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.generator_id || !formData.test_date) {
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/stack-tests`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">Add Stack Test</h1>
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
          <label htmlFor="test_date" className="block text-sm font-medium text-text-primary mb-2">
            Test Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="test_date"
            value={formData.test_date}
            onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="test_company" className="block text-sm font-medium text-text-primary mb-2">
              Test Company
            </label>
            <input
              type="text"
              id="test_company"
              value={formData.test_company}
              onChange={(e) => setFormData({ ...formData, test_company: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="test_reference" className="block text-sm font-medium text-text-primary mb-2">
              Test Reference
            </label>
            <input
              type="text"
              id="test_reference"
              value={formData.test_reference}
              onChange={(e) => setFormData({ ...formData, test_reference: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Emission Results</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="nox_result" className="block text-sm font-medium text-text-primary mb-2">
                NOx (mg/m³)
              </label>
              <input
                type="number"
                id="nox_result"
                value={formData.nox_result}
                onChange={(e) => setFormData({ ...formData, nox_result: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="so2_result" className="block text-sm font-medium text-text-primary mb-2">
                SO₂ (mg/m³)
              </label>
              <input
                type="number"
                id="so2_result"
                value={formData.so2_result}
                onChange={(e) => setFormData({ ...formData, so2_result: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="co_result" className="block text-sm font-medium text-text-primary mb-2">
                CO (mg/m³)
              </label>
              <input
                type="number"
                id="co_result"
                value={formData.co_result}
                onChange={(e) => setFormData({ ...formData, co_result: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="particulates_result" className="block text-sm font-medium text-text-primary mb-2">
                Particulates (mg/m³)
              </label>
              <input
                type="number"
                id="particulates_result"
                value={formData.particulates_result}
                onChange={(e) => setFormData({ ...formData, particulates_result: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="compliance_status" className="block text-sm font-medium text-text-primary mb-2">
            Compliance Status
          </label>
          <select
            id="compliance_status"
            value={formData.compliance_status}
            onChange={(e) => setFormData({ ...formData, compliance_status: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PENDING">Pending</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
            <option value="NON_COMPLIANT">Non-Compliant</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.exceedances_found}
              onChange={(e) => setFormData({ ...formData, exceedances_found: e.target.checked })}
              className="rounded border-border"
            />
            <span className="text-sm font-medium text-text-primary">Exceedances Found</span>
          </label>
        </div>

        {formData.exceedances_found && (
          <div>
            <label htmlFor="exceedance_details" className="block text-sm font-medium text-text-primary mb-2">
              Exceedance Details
            </label>
            <textarea
              id="exceedance_details"
              value={formData.exceedance_details}
              onChange={(e) => setFormData({ ...formData, exceedance_details: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
        )}

        <div>
          <label htmlFor="next_test_due" className="block text-sm font-medium text-text-primary mb-2">
            Next Test Due Date
          </label>
          <input
            type="date"
            id="next_test_due"
            value={formData.next_test_due}
            onChange={(e) => setFormData({ ...formData, next_test_due: e.target.value })}
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
              {mutation.error instanceof Error ? mutation.error.message : 'Failed to create stack test'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {mutation.isPending ? 'Saving...' : 'Save Stack Test'}
          </Button>
          <Link href={`/dashboard/sites/${siteId}/module-3/stack-tests`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

