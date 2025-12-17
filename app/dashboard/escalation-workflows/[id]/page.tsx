'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EscalationWorkflow {
  id: string;
  name: string;
  company_id: string;
  trigger_conditions: any;
  escalation_levels: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EscalationWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ['escalation-workflow', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<EscalationWorkflow>(`/escalation-workflows/${workflowId}`);
      return response.data;
    },
    enabled: !!workflowId,
  });

  const toggleWorkflow = useMutation({
    mutationFn: async (isActive: boolean) => {
      return apiClient.put(`/escalation-workflows/${workflowId}`, { is_active: !isActive });
    },
    onSuccess: () => {
      // Invalidate and refetch
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workflow...</div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading workflow</p>
          <Link href="/dashboard/escalation-workflows">
            <Button variant="outline">Back to Workflows</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/escalation-workflows"
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Workflows
          </Link>
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-3xl font-bold">{workflow.name}</h1>
              <p className="text-gray-600 mt-1">
                {workflow.is_active ? (
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toggleWorkflow.mutate(workflow.is_active)}
          >
            {workflow.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Trigger Conditions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Trigger Conditions</h2>
        {workflow.trigger_conditions ? (
          <pre className="p-4 bg-gray-50 rounded text-sm overflow-x-auto">
            {JSON.stringify(workflow.trigger_conditions, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">No trigger conditions configured</p>
        )}
      </div>

      {/* Escalation Levels */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Escalation Levels</h2>
        {workflow.escalation_levels && workflow.escalation_levels.length > 0 ? (
          <div className="space-y-4">
            {workflow.escalation_levels.map((level: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Level {index + 1}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Delay Duration:</span>
                    <span className="ml-2 font-medium">{level.delay_duration || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Recipients:</span>
                    <span className="ml-2 font-medium">{level.recipients?.length || 0}</span>
                  </div>
                </div>
                {level.actions && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Actions: </span>
                    <span className="text-sm font-medium">{level.actions.join(', ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No escalation levels configured</p>
        )}
      </div>
    </div>
  );
}

