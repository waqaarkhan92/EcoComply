'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ClipboardList, Search, Filter, Link as LinkIcon, Activity, FileText, BookOpen, Settings, Wrench, Clock, Calendar, FileCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
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
  condition_reference?: string | null;
  page_reference?: number | null;
  frequency?: string | null;
  confidence_score?: number;
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

  // Reset cursor when search query or filters change
  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  // Fetch sites for dropdown
  const { data: sitesData } = useQuery<{ data: Array<{ id: string; site_name: string }> }>({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Array<{ id: string; site_name: string }> }>('/sites');
    },
  });

  // Fetch documents for dropdown (filtered by selected site if applicable)
  const { data: documentsData } = useQuery<{ data: Array<{ id: string; document_name: string; document_type: string }> }>({
    queryKey: ['documents', filters.site_id],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      return apiClient.get<{ data: Array<{ id: string; document_name: string; document_type: string }> }>(`/documents?${params.toString()}`);
    },
  });

  const { data, isLoading, error } = useQuery<ObligationsResponse>({
    queryKey: ['obligations', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (searchQuery) params.append('search', searchQuery);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ObligationsResponse>(`/obligations?${params.toString()}`);
    },
  });

  const obligations = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;
  const sites = sitesData?.data || [];
  const documents = documentsData?.data || [];

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
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value, document_id: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.site_name}
                </option>
              ))}
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
              disabled={documents.length === 0}
            >
              <option value="">All Documents</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.document_name} ({doc.document_type})
                </option>
              ))}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Obligation
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Deadline
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {obligations.map((obligation, index) => {
                    const effectiveStatus = getStatusFromDeadline(obligation.deadline_date, obligation.status);
                    const daysUntil = getDaysUntilDeadline(obligation.deadline_date);
                    
                    return (
                      <tr 
                        key={obligation.id} 
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/obligations/${obligation.id}`}
                            className="group block"
                          >
                            <div className="flex items-start gap-3">
                              {/* Category Icon */}
                              <CategoryIcon category={obligation.category} />
                              
                              {/* Title and Category */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 group-hover:text-primary transition-colors mb-1">
                                  {obligation.obligation_title || obligation.original_text.substring(0, 80) + '...'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {obligation.category.replace(/_/g, ' ')}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={effectiveStatus} />
                        </td>
                        <td className="py-4 px-6">
                          {obligation.deadline_date ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900 mb-0.5">
                                {new Date(obligation.deadline_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                              {daysUntil !== null && (
                                <div className={`text-xs font-medium ${
                                  daysUntil < 0 
                                    ? 'text-red-600' 
                                    : daysUntil === 0 
                                    ? 'text-orange-600'
                                    : daysUntil <= 7 
                                    ? 'text-yellow-600'
                                    : 'text-gray-500'
                                }`}>
                                  {daysUntil < 0
                                    ? `${Math.abs(daysUntil)} days overdue`
                                    : daysUntil === 0
                                    ? 'Due today'
                                    : `${daysUntil} days left`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No deadline</span>
                          )}
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

function StatusBadge({ status }: { status: string }) {
  const config = {
    PENDING: { 
      label: 'Pending', 
      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
      icon: Clock
    },
    DUE_SOON: { 
      label: 'Due Soon', 
      className: 'bg-orange-50 text-orange-700 border border-orange-200',
      icon: AlertCircle
    },
    OVERDUE: { 
      label: 'Overdue', 
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: XCircle
    },
    COMPLETED: { 
      label: 'Completed', 
      className: 'bg-green-50 text-green-700 border border-green-200',
      icon: CheckCircle2
    },
    NOT_APPLICABLE: { 
      label: 'N/A', 
      className: 'bg-gray-50 text-gray-600 border border-gray-200',
      icon: XCircle
    },
    ACTIVE: { 
      label: 'Active', 
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: CheckCircle2
    },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Clock
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const categoryConfig: Record<string, { 
    icon: any;
    color: string;
  }> = {
    MONITORING: { 
      icon: Activity,
      color: 'text-blue-500'
    },
    REPORTING: { 
      icon: FileText,
      color: 'text-purple-500'
    },
    RECORD_KEEPING: { 
      icon: BookOpen,
      color: 'text-green-500'
    },
    OPERATIONAL: { 
      icon: Settings,
      color: 'text-orange-500'
    },
    MAINTENANCE: { 
      icon: Wrench,
      color: 'text-yellow-500'
    },
  };

  const config = categoryConfig[category] || {
    icon: FileText,
    color: 'text-gray-400'
  };

  const Icon = config.icon;

  return (
    <div className={`${config.color} flex-shrink-0 mt-0.5`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}
