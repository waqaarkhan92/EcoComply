'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
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
  workflow_notes: string | null;
  created_at: string;
  updated_at: string;
  documents: { id: string; document_name: string };
  sites: { id: string; site_name: string };
}

export default function PermitWorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const workflowId = params.workflowId as string;

  const { data: workflow, isLoading, error } = useQuery<PermitWorkflow>({
    queryKey: ['permit-workflow', workflowId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<PermitWorkflow>(`/module-1/permit-workflows/${workflowId}`);
      return response.data;
    },
    enabled: !!workflowId,
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
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows`}>
            <Button variant="outline">Back to Workflows</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'DRAFT':
        return <FileText className="h-6 w-6 text-gray-600" />;
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
      SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800' },
      UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Workflows
          </Link>
          <div className="flex items-center gap-3">
            {getStatusIcon(workflow.status)}
            <div>
              <h1 className="text-3xl font-bold">{workflow.workflow_type} Workflow</h1>
              <p className="text-gray-600 mt-1">
                {workflow.documents?.document_name || 'Document'} • {workflow.sites?.site_name || 'Site'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {workflow.status === 'DRAFT' && (
            <Link href={`/dashboard/module-1/permit-workflows/${workflowId}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {workflow.workflow_type === 'VARIATION' && workflow.status === 'DRAFT' && (
            <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}/variation`}>
              <Button variant="outline">
                Configure Variation
              </Button>
            </Link>
          )}
          {workflow.workflow_type === 'SURRENDER' && workflow.status === 'DRAFT' && (
            <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}/surrender`}>
              <Button variant="outline">
                Configure Surrender
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>{getStatusBadge(workflow.status)}</div>
            <div>
              <p className="text-sm text-gray-600">Created: {new Date(workflow.created_at).toLocaleString()}</p>
              {workflow.updated_at !== workflow.created_at && (
                <p className="text-sm text-gray-600">Updated: {new Date(workflow.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
        {workflow.regulator_response_deadline && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm font-medium text-amber-900">
              Regulator Response Deadline: {new Date(workflow.regulator_response_deadline).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Workflow Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Workflow Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Workflow Type</label>
            <p className="text-gray-900">{workflow.workflow_type}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <p className="text-gray-900">{getStatusBadge(workflow.status)}</p>
          </div>
          {workflow.submitted_date && (
            <div>
              <label className="text-sm font-medium text-gray-700">Submitted Date</label>
              <p className="text-gray-900">{new Date(workflow.submitted_date).toLocaleDateString()}</p>
            </div>
          )}
          {workflow.regulator_response_date && (
            <div>
              <label className="text-sm font-medium text-gray-700">Regulator Response Date</label>
              <p className="text-gray-900">{new Date(workflow.regulator_response_date).toLocaleDateString()}</p>
            </div>
          )}
          {workflow.approval_date && (
            <div>
              <label className="text-sm font-medium text-gray-700">Approval Date</label>
              <p className="text-gray-900">{new Date(workflow.approval_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
        {workflow.workflow_notes && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <p className="text-gray-900 mt-1">{workflow.workflow_notes}</p>
          </div>
        )}
        {workflow.regulator_comments && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Regulator Comments</label>
            <p className="text-gray-900 mt-1">{workflow.regulator_comments}</p>
          </div>
        )}
      </div>

      {/* Navigation to type-specific pages */}
      {workflow.workflow_type === 'VARIATION' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Variation Details</h2>
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}/variation`}>
            <Button variant="outline">
              View/Edit Variation Configuration
            </Button>
          </Link>
        </div>
      )}

      {workflow.workflow_type === 'SURRENDER' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Surrender Details</h2>
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflowId}/surrender`}>
            <Button variant="outline">
              View/Edit Surrender Configuration
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

