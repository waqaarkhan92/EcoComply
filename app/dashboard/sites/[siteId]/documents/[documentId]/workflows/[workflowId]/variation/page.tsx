'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface VariationDetails {
  variation_type: string;
  proposed_changes: string;
  impact_assessment: string;
  regulator_consultation_required: boolean;
  public_consultation_required: boolean;
}

export default function PermitVariationPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const workflowId = params.workflowId as string;

  const [variationType, setVariationType] = useState<string>('');
  const [proposedChanges, setProposedChanges] = useState<string>('');
  const [impactAssessment, setImpactAssessment] = useState<string>('');
  const [regulatorConsultation, setRegulatorConsultation] = useState<boolean>(false);
  const [publicConsultation, setPublicConsultation] = useState<boolean>(false);

  const { data: variationData, isLoading } = useQuery<{ data: VariationDetails }>({
    queryKey: ['permit-workflow-variation', workflowId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: VariationDetails }>(`/module-1/permit-workflows/${workflowId}/variation`);
    },
    enabled: !!workflowId,
    onSuccess: (data) => {
      if (data?.data) {
        setVariationType(data.data.variation_type || '');
        setProposedChanges(data.data.proposed_changes || '');
        setImpactAssessment(data.data.impact_assessment || '');
        setRegulatorConsultation(data.data.regulator_consultation_required || false);
        setPublicConsultation(data.data.public_consultation_required || false);
      }
    },
  });

  const updateVariation = useMutation({
    mutationFn: async (data: VariationDetails) => {
      return apiClient.put(`/module-1/permit-workflows/${workflowId}/variation`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateVariation.mutate({
      variation_type: variationType,
      proposed_changes: proposedChanges,
      impact_assessment: impactAssessment,
      regulator_consultation_required: regulatorConsultation,
      public_consultation_required: publicConsultation,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading variation details...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Workflow
          </Link>
          <h1 className="text-2xl font-bold">Variation Configuration</h1>
          <p className="text-gray-600 mt-1">Configure the details of this permit variation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="variation_type">Variation Type</Label>
          <select
            id="variation_type"
            value={variationType}
            onChange={(e) => setVariationType(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="">Select variation type</option>
            <option value="SUBSTANTIAL">Substantial</option>
            <option value="NON_SUBSTANTIAL">Non-Substantial</option>
            <option value="MINOR">Minor</option>
          </select>
        </div>

        <div>
          <Label htmlFor="proposed_changes">Proposed Changes</Label>
          <textarea
            id="proposed_changes"
            value={proposedChanges}
            onChange={(e) => setProposedChanges(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Describe the proposed changes to the permit..."
            required
          />
        </div>

        <div>
          <Label htmlFor="impact_assessment">Impact Assessment</Label>
          <textarea
            id="impact_assessment"
            value={impactAssessment}
            onChange={(e) => setImpactAssessment(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Assess the environmental and operational impact of these changes..."
            required
          />
        </div>

        <div className="flex items-center">
          <input
            id="regulator_consultation"
            type="checkbox"
            checked={regulatorConsultation}
            onChange={(e) => setRegulatorConsultation(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="regulator_consultation" className="ml-2">
            Regulator Consultation Required
          </Label>
        </div>

        <div className="flex items-center">
          <input
            id="public_consultation"
            type="checkbox"
            checked={publicConsultation}
            onChange={(e) => setPublicConsultation(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="public_consultation" className="ml-2">
            Public Consultation Required
          </Label>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateVariation.isPending} style={{ backgroundColor: '#026A67' }}>
            {updateVariation.isPending ? 'Saving...' : 'Save Variation'}
          </Button>
        </div>
      </form>
    </div>
  );
}

