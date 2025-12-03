'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface PermitWorkflow {
  id: string;
  document_id: string;
  site_id: string;
  workflow_type: 'VARIATION' | 'RENEWAL' | 'SURRENDER';
  status: string;
  submitted_date: string | null;
  regulator_response_deadline: string | null;
  regulator_response_date: string | null;
  regulator_comments: string | null;
  approval_date: string | null;
  evidence_ids: string[];
  workflow_notes: string | null;
  documents: { id: string; document_name: string };
  sites: { id: string; site_name: string };
  created_at: string;
  updated_at: string;
}

export default function PermitWorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = use(params);

  const { data: workflow, isLoading } = useQuery<PermitWorkflow>({
    queryKey: ['permit-workflow', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitWorkflow>(`/module-1/permit-workflows/${workflowId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading permit workflow...</div>;
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Permit workflow not found</p>
        <Link href="/dashboard/module-1/permit-workflows">
          <Button variant="outline" className="mt-4">
            Back to Permit Workflows
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/permit-workflows"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Permit Workflows
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {workflow.workflow_type} Workflow
          </h1>
          <p className="text-text-secondary mt-2">
            {workflow.documents.document_name} • {workflow.sites.site_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-1/permit-workflows/${workflowId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className="rounded-lg p-4 border-2 bg-gray-50 border-gray-200">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-gray-700" />
          <div>
            <p className="font-semibold text-gray-900">
              Status: {workflow.status.replace('_', ' ')}
            </p>
            {workflow.regulator_response_deadline && (
              <p className="text-sm text-gray-600 mt-1">
                Response Deadline: {new Date(workflow.regulator_response_deadline).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Workflow Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Workflow Type</p>
            <p className="text-text-primary">{workflow.workflow_type}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            <p className="text-text-primary">{workflow.status.replace('_', ' ')}</p>
          </div>

          {workflow.submitted_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Submitted Date</p>
              <p className="text-text-primary">
                {new Date(workflow.submitted_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {workflow.regulator_response_deadline && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Response Deadline</p>
              <p className="text-text-primary">
                {new Date(workflow.regulator_response_deadline).toLocaleDateString()}
              </p>
            </div>
          )}

          {workflow.approval_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Approval Date</p>
              <p className="text-text-primary">
                {new Date(workflow.approval_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {workflow.workflow_notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{workflow.workflow_notes}</p>
            </div>
          )}

          {workflow.regulator_comments && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Regulator Comments</p>
              <p className="text-text-primary whitespace-pre-wrap">{workflow.regulator_comments}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(workflow.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(workflow.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Variation/Surrender Details */}
      {workflow.workflow_type === 'VARIATION' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Variation Details</h2>
          <Link href={`/dashboard/module-1/permit-workflows/${workflowId}/variation`}>
            <Button variant="outline">View/Edit Variation Details</Button>
          </Link>
        </div>
      )}

      {workflow.workflow_type === 'SURRENDER' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Surrender Details</h2>
          <Link href={`/dashboard/module-1/permit-workflows/${workflowId}/surrender`}>
            <Button variant="outline">View/Edit Surrender Details</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

