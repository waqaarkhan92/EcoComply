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

interface PermitVariation {
  id: string;
  variation_type: string;
  variation_description: string;
  requested_changes: any;
  impact_assessment: any;
  obligations_affected: string[];
}

export default function PermitVariationPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    variation_type: '',
    variation_description: '',
    requested_changes: '{}',
    impact_assessment: '{}',
    obligations_affected: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const { data: variation, isLoading, isError } = useQuery({
    queryKey: ['permit-variation', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitVariation>(`/module-1/permit-workflows/${workflowId}/variation`);
      return response.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (isError && !variation) {
      setIsCreating(true);
    }
  }, [isError, variation]);

  useEffect(() => {
    if (variation) {
      setFormData({
        variation_type: variation.variation_type,
        variation_description: variation.variation_description,
        requested_changes: JSON.stringify(variation.requested_changes || {}, null, 2),
        impact_assessment: JSON.stringify(variation.impact_assessment || {}, null, 2),
        obligations_affected: variation.obligations_affected.join(', '),
      });
    }
  }, [variation]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post(`/module-1/permit-workflows/${workflowId}/variation`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-variation', workflowId] });
      router.push(`/dashboard/module-1/permit-workflows/${workflowId}`);
    },
    onError: (error: any) => {
      console.error('Failed to create variation:', error);
      alert('Failed to create variation. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let requestedChanges = {};
    let impactAssessment = {};
    try {
      requestedChanges = JSON.parse(formData.requested_changes);
      impactAssessment = JSON.parse(formData.impact_assessment);
    } catch (e) {
      alert('Invalid JSON in requested changes or impact assessment');
      setIsSubmitting(false);
      return;
    }

    const obligationsArray = formData.obligations_affected
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const submitData = {
      variation_type: formData.variation_type,
      variation_description: formData.variation_description,
      requested_changes: requestedChanges,
      impact_assessment: impactAssessment,
      obligations_affected: obligationsArray,
    };

    createMutation.mutate(submitData);
  };

  if (isLoading && !isCreating) {
    return <div className="text-center py-12 text-text-secondary">Loading variation details...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/module-1/permit-workflows/${workflowId}`}
          className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
        >
          <ArrowLeft className="inline w-4 h-4 mr-1" />
          Back to Workflow
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">
          {isCreating ? 'Create' : 'Edit'} Variation Details
        </h1>
        <p className="text-text-secondary mt-2">
          {isCreating ? 'Add variation details to this workflow' : 'Update variation details'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="variation_type">Variation Type *</Label>
            <Input
              id="variation_type"
              required
              value={formData.variation_type}
              onChange={(e) => setFormData({ ...formData, variation_type: e.target.value })}
              placeholder="e.g., MINOR, SUBSTANTIAL, MAJOR"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="variation_description">Variation Description *</Label>
            <textarea
              id="variation_description"
              required
              value={formData.variation_description}
              onChange={(e) => setFormData({ ...formData, variation_description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Detailed description of the variation requested..."
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="requested_changes">Requested Changes (JSON)</Label>
            <textarea
              id="requested_changes"
              value={formData.requested_changes}
              onChange={(e) => setFormData({ ...formData, requested_changes: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
              placeholder='{"limit_change": "new_value", "condition_added": "description"}'
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="impact_assessment">Impact Assessment (JSON)</Label>
            <textarea
              id="impact_assessment"
              value={formData.impact_assessment}
              onChange={(e) => setFormData({ ...formData, impact_assessment: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1 font-mono text-sm"
              placeholder='{"obligations_impacted": 5, "operational_changes": "description"}'
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="obligations_affected">Affected Obligations (comma-separated UUIDs)</Label>
            <Input
              id="obligations_affected"
              value={formData.obligations_affected}
              onChange={(e) => setFormData({ ...formData, obligations_affected: e.target.value })}
              placeholder="uuid1, uuid2, uuid3"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Link href={`/dashboard/module-1/permit-workflows/${workflowId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting || createMutation.isPending ? 'Saving...' : isCreating ? 'Create Variation' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

