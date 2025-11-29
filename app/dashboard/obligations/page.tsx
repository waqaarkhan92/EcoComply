'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Search, Filter, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

interface Obligation {
  id: string;
  obligation_title: string;
  original_text: string;
  category: string;
  status: string;
  deadline_date: string | null;
  evidence_count?: number;
  document_id: string;
}

interface ObligationsResponse {
  data: Obligation[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ObligationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    document_id: '',
    status: '',
    category: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data, isLoading, error } = useQuery<ObligationsResponse>({
    queryKey: ['obligations', filters, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ObligationsResponse>(`/obligations?${params.toString()}`);
    },
  });

  const obligations = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const getDaysUntilDeadline = (deadlineDate: string | null): number | null => {
    if (!deadlineDate) return null;
    const today = new Date();
    const deadline = new Date(deadlineDate);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusFromDeadline = (deadlineDate: string | null, status: string): string => {
    if (status === 'COMPLETED' || status === 'NOT_APPLICABLE') return status;
    if (!deadlineDate) return 'PENDING';
    
    const daysUntil = getDaysUntilDeadline(deadlineDate);
    if (daysUntil === null) return 'PENDING';
    if (daysUntil < 0) return 'OVERDUE';
    if (daysUntil <= 7) return 'DUE_SOON';
    return 'PENDING';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Obligations</h1>
          <p className="text-text-secondary mt-2">
            Track and manage your compliance obligations
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search obligations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Site
            </label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
              {/* TODO: Fetch sites from API */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="DUE_SOON">Due Soon</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETED">Completed</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Categories</option>
              <option value="MONITORING">Monitoring</option>
              <option value="REPORTING">Reporting</option>
              <option value="RECORD_KEEPING">Record Keeping</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Document
            </label>
            <select
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Documents</option>
              {/* TODO: Fetch documents from API */}
            </select>
          </div>
        </div>
      </div>

      {/* Obligations Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading obligations...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading obligations. Please try again.
          </div>
        ) : obligations.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No obligations found</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Obligation
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Category
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Deadline
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Evidence
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {obligations.map((obligation) => {
                  const effectiveStatus = getStatusFromDeadline(obligation.deadline_date, obligation.status);
                  const daysUntil = getDaysUntilDeadline(obligation.deadline_date);
                  
                  return (
                    <tr key={obligation.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/obligations/${obligation.id}`}
                          className="text-primary hover:text-primary-dark font-medium"
                        >
                          {obligation.obligation_title || obligation.original_text.substring(0, 60) + '...'}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-sm text-text-secondary">
                        {obligation.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={effectiveStatus} />
                      </td>
                      <td className="py-4 px-6 text-sm text-text-secondary">
                        {obligation.deadline_date ? (
                          <div>
                            <div>{new Date(obligation.deadline_date).toLocaleDateString()}</div>
                            {daysUntil !== null && (
                              <div className="text-xs text-text-tertiary">
                                {daysUntil < 0
                                  ? `${Math.abs(daysUntil)} days overdue`
                                  : daysUntil === 0
                                  ? 'Due today'
                                  : `${daysUntil} days remaining`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-tertiary">No deadline</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm text-text-secondary">
                        {obligation.evidence_count || 0}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/obligations/${obligation.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          <Link href={`/dashboard/obligations/${obligation.id}/evidence`}>
                            <Button variant="ghost" size="sm">
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    DUE_SOON: { label: 'Due Soon', className: 'bg-warning/20 text-warning' },
    OVERDUE: { label: 'Overdue', className: 'bg-danger/20 text-danger' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
    NOT_APPLICABLE: { label: 'N/A', className: 'bg-gray-100 text-gray-600' },
    ACTIVE: { label: 'Active', className: 'bg-primary/20 text-primary' },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${badgeConfig.className}`}>
      {badgeConfig.label}
    </span>
  );
}
