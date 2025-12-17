'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PermitWorkflow {
  id: string;
  workflow_type: 'VARIATION' | 'RENEWAL' | 'SURRENDER';
  status: string;
  created_at: string;
  updated_at: string;
  submitted_date: string | null;
  regulator_response_deadline: string | null;
}

interface PermitWorkflowsResponse {
  data: PermitWorkflow[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PermitWorkflowsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: workflowsData, isLoading, error } = useQuery({
    queryKey: ['permit-workflows', documentId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[document_id]', documentId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<PermitWorkflowsResponse>(`/module-1/permit-workflows?${params.toString()}`);
    },
    enabled: !!documentId,
  });

  const workflows: any[] = workflowsData?.data || [];
  const hasMore = workflowsData?.pagination?.has_more || false;
  const nextCursor = workflowsData?.pagination?.cursor;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'DRAFT':
        return <FileText className="h-5 w-5 text-gray-600" />;
      case 'SUBMITTED':
      case 'UNDER_REVIEW':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getWorkflowTypeColor = (type: string) => {
    switch (type) {
      case 'VARIATION':
        return 'text-blue-600 bg-blue-50';
      case 'RENEWAL':
        return 'text-green-600 bg-green-50';
      case 'SURRENDER':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading workflows</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/documents/${documentId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Document
          </Link>
          <h1 className="text-2xl font-bold">Permit Workflows</h1>
          <p className="text-gray-600 mt-1">Manage permit variations, renewals, and surrenders</p>
        </div>
        <Button
          style={{ backgroundColor: '#026A67' }}
          onClick={() => router.push(`/dashboard/module-1/permit-workflows/new?document_id=${documentId}`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <div className="bg-white rounded-lg shadow">
        {workflows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
            <p className="text-gray-500 mb-6">Create your first permit workflow to get started</p>
            <Button
              style={{ backgroundColor: '#026A67' }}
              onClick={() => router.push(`/dashboard/module-1/permit-workflows/new?document_id=${documentId}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflow.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(workflow.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getWorkflowTypeColor(workflow.workflow_type)}`}>
                          {workflow.workflow_type}
                        </span>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(workflow.created_at).toLocaleDateString()}
                        {workflow.updated_at !== workflow.created_at && (
                          <> • Updated: {new Date(workflow.updated_at).toLocaleDateString()}</>
                        )}
                      </p>
                      {workflow.regulator_response_deadline && (
                        <p className="text-xs text-amber-600 mt-1">
                          Response Deadline: {new Date(workflow.regulator_response_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {workflow.status === 'DRAFT' && (
                      <>
                        <Link
                          href={`/dashboard/module-1/permit-workflows/${workflow.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      </>
                    )}
                    <Link
                      href={`/dashboard/sites/${siteId}/documents/${documentId}/workflows/${workflow.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
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

