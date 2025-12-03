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

interface SurrenderDetails {
  surrender_reason: string;
  site_closure_date: string;
  final_site_condition_report_required: boolean;
  regulator_sign_off_required: boolean;
}

export default function PermitSurrenderPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const workflowId = params.workflowId as string;

  const [surrenderReason, setSurrenderReason] = useState<string>('');
  const [siteClosureDate, setSiteClosureDate] = useState<string>('');
  const [finalReportRequired, setFinalReportRequired] = useState<boolean>(true);
  const [regulatorSignOffRequired, setRegulatorSignOffRequired] = useState<boolean>(true);

  const { data: surrenderData, isLoading } = useQuery<{ data: SurrenderDetails }>({
    queryKey: ['permit-workflow-surrender', workflowId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: SurrenderDetails }>(`/module-1/permit-workflows/${workflowId}/surrender`);
    },
    enabled: !!workflowId,
    onSuccess: (data) => {
      if (data?.data) {
        setSurrenderReason(data.data.surrender_reason || '');
        setSiteClosureDate(data.data.site_closure_date || '');
        setFinalReportRequired(data.data.final_site_condition_report_required ?? true);
        setRegulatorSignOffRequired(data.data.regulator_sign_off_required ?? true);
      }
    },
  });

  const updateSurrender = useMutation({
    mutationFn: async (data: SurrenderDetails) => {
      return apiClient.put(`/module-1/permit-workflows/${workflowId}/surrender`, data);
    },
    onSuccess: () => {
      router.push(`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSurrender.mutate({
      surrender_reason: surrenderReason,
      site_closure_date: siteClosureDate,
      final_site_condition_report_required: finalReportRequired,
      regulator_sign_off_required: regulatorSignOffRequired,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading surrender details...</div>
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
          <h1 className="text-2xl font-bold">Surrender Configuration</h1>
          <p className="text-gray-600 mt-1">Configure the details of this permit surrender</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <Label htmlFor="surrender_reason">Surrender Reason</Label>
          <textarea
            id="surrender_reason"
            value={surrenderReason}
            onChange={(e) => setSurrenderReason(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="Explain the reason for surrendering this permit..."
            required
          />
        </div>

        <div>
          <Label htmlFor="site_closure_date">Site Closure Date</Label>
          <Input
            id="site_closure_date"
            type="date"
            value={siteClosureDate}
            onChange={(e) => setSiteClosureDate(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div className="flex items-center">
          <input
            id="final_report"
            type="checkbox"
            checked={finalReportRequired}
            onChange={(e) => setFinalReportRequired(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="final_report" className="ml-2">
            Final Site Condition Report Required
          </Label>
        </div>

        <div className="flex items-center">
          <input
            id="regulator_sign_off"
            type="checkbox"
            checked={regulatorSignOffRequired}
            onChange={(e) => setRegulatorSignOffRequired(e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="regulator_sign_off" className="ml-2">
            Regulator Sign-Off Required
          </Label>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateSurrender.isPending} style={{ backgroundColor: '#026A67' }}>
            {updateSurrender.isPending ? 'Saving...' : 'Save Surrender'}
          </Button>
        </div>
      </form>
    </div>
  );
}

