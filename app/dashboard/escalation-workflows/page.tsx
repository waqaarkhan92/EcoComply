'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EscalationWorkflow {
  id: string;
  name: string;
  company_id: string;
  trigger_conditions: any;
  escalation_levels: any[];
  is_active: boolean;
  created_at: string;
}

interface EscalationWorkflowsResponse {
  data: EscalationWorkflow[];
  pagination?: {
    cursor?: string;
    has_more?: boolean;
    limit?: number;
  };
}

export default function EscalationWorkflowsPage() {
  const router = useRouter();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: workflowsData, isLoading, error } = useQuery<EscalationWorkflowsResponse>({
    queryKey: ['escalation-workflows', cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<EscalationWorkflowsResponse>(`/escalation-workflows?${params.toString()}`);
    },
  });

  const workflows = workflowsData?.data || [];
  const hasMore = workflowsData?.pagination?.has_more || false;
  const nextCursor = workflowsData?.pagination?.cursor;

  const toggleWorkflow = useMutation({
    mutationFn: async ({ workflowId, isActive }: { workflowId: string; isActive: boolean }) => {
      return apiClient.put(`/escalation-workflows/${workflowId}`, { is_active: !isActive });
    },
    onSuccess: () => {
      // Invalidate and refetch
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading escalation workflows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading escalation workflows</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escalation Workflows</h1>
          <p className="text-gray-600 mt-1">Configure automated escalation workflows for compliance alerts</p>
        </div>
        <Button
          style={{ backgroundColor: '#026A67' }}
          onClick={() => router.push('/dashboard/escalation-workflows/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="bg-white rounded-lg shadow">
        {workflows.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No escalation workflows configured</h3>
            <p className="text-gray-500 mb-6">Create workflows to automate compliance alert escalations</p>
            <Button
              style={{ backgroundColor: '#026A67' }}
              onClick={() => router.push('/dashboard/escalation-workflows/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Workflow
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{workflow.name}</span>
                        {workflow.is_active ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {workflow.escalation_levels?.length || 0} escalation levels
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(workflow.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWorkflow.mutate({ workflowId: workflow.id, isActive: workflow.is_active })}
                    >
                      {workflow.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Link href={`/dashboard/escalation-workflows/${workflow.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setCursor(nextCursor)}
              disabled={!nextCursor}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

