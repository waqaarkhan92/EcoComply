'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface CorrectiveAction {
  id: string;
  exceedance_id: string | null;
  parameter_id: string | null;
  site_id: string;
  action_type: string;
  action_title: string;
  action_description: string;
  assigned_to: string | null;
  due_date: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CLOSED';
  lifecycle_phase: string | null;
  created_at: string;
}

interface CorrectiveActionsResponse {
  data: CorrectiveAction[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  OPEN: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertTriangle },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  VERIFIED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: CheckCircle2 },
  CLOSED: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: XCircle },
};

export default function CorrectiveActionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    status: '',
    lifecycle_phase: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-2-corrective-actions', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.lifecycle_phase) params.append('lifecycle_phase', filters.lifecycle_phase);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<CorrectiveActionsResponse>(`/module-2/corrective-actions?${params.toString()}`);
    },
  });

  const actions: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredActions = actions.filter((action) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      action.action_title.toLowerCase().includes(query) ||
      action.action_description.toLowerCase().includes(query) ||
      action.action_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Corrective Actions</h1>
          <p className="text-text-secondary mt-2">
            Track and manage corrective actions for exceedances and breaches
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-2/corrective-actions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Corrective Action
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
              placeholder="Search by title, description, type..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Lifecycle Phase</label>
            <select
              value={filters.lifecycle_phase}
              onChange={(e) => setFilters({ ...filters, lifecycle_phase: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Phases</option>
              <option value="TRIGGER">Trigger</option>
              <option value="INVESTIGATION">Investigation</option>
              <option value="ACTION">Action</option>
              <option value="RESOLUTION">Resolution</option>
              <option value="CLOSURE">Closure</option>
            </select>
          </div>
        </div>
      </div>

      {/* Corrective Actions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading corrective actions...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading corrective actions. Please try again.
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No corrective actions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Lifecycle Phase
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredActions.map((action, index) => {
                    const statusStyle = statusColors[action.status] || statusColors.OPEN;
                    const StatusIcon = statusStyle.icon;
                    const isOverdue = new Date(action.due_date) < new Date() && action.status !== 'CLOSED';

                    return (
                      <tr
                        key={action.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-2/corrective-actions/${action.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {action.action_title}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{action.action_type.replace('_', ' ')}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                            {action.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {action.lifecycle_phase || '—'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {new Date(action.due_date).toLocaleDateString()}
                            {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

