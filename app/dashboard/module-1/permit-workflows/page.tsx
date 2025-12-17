'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PermitWorkflow {
  id: string;
  document_id: string;
  site_id: string;
  workflow_type: 'VARIATION' | 'RENEWAL' | 'SURRENDER';
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  submitted_date: string | null;
  regulator_response_deadline: string | null;
  documents: { id: string; document_name: string };
  sites: { id: string; site_name: string };
  created_at: string;
}

interface PermitWorkflowsResponse {
  data: PermitWorkflow[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: FileText },
  SUBMITTED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  UNDER_REVIEW: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  APPROVED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle },
};

const workflowTypeColors: Record<string, { bg: string; text: string }> = {
  VARIATION: { bg: 'bg-purple-50', text: 'text-purple-700' },
  RENEWAL: { bg: 'bg-blue-50', text: 'text-blue-700' },
  SURRENDER: { bg: 'bg-orange-50', text: 'text-orange-700' },
};

export default function PermitWorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    workflow_type: '',
    status: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['permit-workflows', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.workflow_type) params.append('workflow_type', filters.workflow_type);
      if (filters.status) params.append('status', filters.status);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<PermitWorkflowsResponse>(`/module-1/permit-workflows?${params.toString()}`);
    },
  });

  const workflows: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredWorkflows = workflows.filter((workflow) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      workflow.documents.document_name.toLowerCase().includes(query) ||
      workflow.workflow_type.toLowerCase().includes(query) ||
      workflow.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Permit Workflows</h1>
          <p className="text-text-secondary mt-2">
            Manage permit variations, renewals, and surrenders
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/permit-workflows/new">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by document name, type, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Workflow Type</label>
            <select
              value={filters.workflow_type}
              onChange={(e) => setFilters({ ...filters, workflow_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="VARIATION">Variation</option>
              <option value="RENEWAL">Renewal</option>
              <option value="SURRENDER">Surrender</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading permit workflows...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading permit workflows. Please try again.
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No permit workflows found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Response Deadline
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredWorkflows.map((workflow, index) => {
                    const statusStyle = statusColors[workflow.status] || statusColors.DRAFT;
                    const StatusIcon = statusStyle.icon;
                    const typeStyle = workflowTypeColors[workflow.workflow_type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

                    return (
                      <tr
                        key={workflow.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/permit-workflows/${workflow.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {workflow.documents.document_name}
                          </Link>
                          <p className="text-xs text-gray-500 mt-1">{workflow.sites.site_name}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
                            {workflow.workflow_type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                            {workflow.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {workflow.submitted_date ? new Date(workflow.submitted_date).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {workflow.regulator_response_deadline ? new Date(workflow.regulator_response_deadline).toLocaleDateString() : '—'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => nextCursor && setCursor(nextCursor)}
                  disabled={!nextCursor}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

