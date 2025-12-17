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

interface PermitSurrender {
  id: string;
  surrender_reason: string;
  surrender_date: string | null;
  final_inspection_date: string | null;
  final_report_evidence_id: string | null;
  obligations_closed: string[];
  site_decommission_complete: boolean;
}

export default function PermitSurrenderPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    surrender_reason: '',
    surrender_date: '',
    final_inspection_date: '',
    final_report_evidence_id: '',
    obligations_closed: '',
    site_decommission_complete: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  const { data: surrender, isLoading, isError } = useQuery({
    queryKey: ['permit-surrender', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitSurrender>(`/module-1/permit-workflows/${workflowId}/surrender`);
      return response.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (isError && !surrender) {
      setIsCreating(true);
    }
  }, [isError, surrender]);

  useEffect(() => {
    if (surrender) {
      setFormData({
        surrender_reason: surrender.surrender_reason,
        surrender_date: surrender.surrender_date ? surrender.surrender_date.split('T')[0] : '',
        final_inspection_date: surrender.final_inspection_date ? surrender.final_inspection_date.split('T')[0] : '',
        final_report_evidence_id: surrender.final_report_evidence_id || '',
        obligations_closed: surrender.obligations_closed.join(', '),
        site_decommission_complete: surrender.site_decommission_complete,
      });
    }
  }, [surrender]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiClient.post(`/module-1/permit-workflows/${workflowId}/surrender`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permit-surrender', workflowId] });
      router.push(`/dashboard/module-1/permit-workflows/${workflowId}`);
    },
    onError: (error: any) => {
      console.error('Failed to create surrender:', error);
      alert('Failed to create surrender. Please try again.');
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const obligationsArray = formData.obligations_closed
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);

    const submitData = {
      surrender_reason: formData.surrender_reason,
      surrender_date: formData.surrender_date || undefined,
      final_inspection_date: formData.final_inspection_date || undefined,
      final_report_evidence_id: formData.final_report_evidence_id || undefined,
      obligations_closed: obligationsArray,
      site_decommission_complete: formData.site_decommission_complete,
    };

    createMutation.mutate(submitData);
  };

  if (isLoading && !isCreating) {
    return <div className="text-center py-12 text-text-secondary">Loading surrender details...</div>;
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
          {isCreating ? 'Create' : 'Edit'} Surrender Details
        </h1>
        <p className="text-text-secondary mt-2">
          {isCreating ? 'Add surrender details to this workflow' : 'Update surrender details'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="surrender_reason">Surrender Reason *</Label>
            <textarea
              id="surrender_reason"
              required
              value={formData.surrender_reason}
              onChange={(e) => setFormData({ ...formData, surrender_reason: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary mt-1"
              placeholder="Reason for permit surrender..."
            />
          </div>

          <div>
            <Label htmlFor="surrender_date">Surrender Date</Label>
            <Input
              id="surrender_date"
              type="date"
              value={formData.surrender_date}
              onChange={(e) => setFormData({ ...formData, surrender_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="final_inspection_date">Final Inspection Date</Label>
            <Input
              id="final_inspection_date"
              type="date"
              value={formData.final_inspection_date}
              onChange={(e) => setFormData({ ...formData, final_inspection_date: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="final_report_evidence_id">Final Report Evidence ID</Label>
            <Input
              id="final_report_evidence_id"
              value={formData.final_report_evidence_id}
              onChange={(e) => setFormData({ ...formData, final_report_evidence_id: e.target.value })}
              placeholder="UUID of final report evidence"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="obligations_closed">Closed Obligations (comma-separated UUIDs)</Label>
            <Input
              id="obligations_closed"
              value={formData.obligations_closed}
              onChange={(e) => setFormData({ ...formData, obligations_closed: e.target.value })}
              placeholder="uuid1, uuid2, uuid3"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="site_decommission_complete"
                checked={formData.site_decommission_complete}
                onChange={(e) => setFormData({ ...formData, site_decommission_complete: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <Label htmlFor="site_decommission_complete" className="cursor-pointer">
                Site Decommission Complete
              </Label>
            </div>
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
            {isSubmitting || createMutation.isPending ? 'Saving...' : isCreating ? 'Create Surrender' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

