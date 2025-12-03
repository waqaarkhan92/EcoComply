'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Search, Plus, FileText, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface EnforcementNotice {
  id: string;
  company_id: string;
  site_id: string;
  document_id: string | null;
  notice_number: string;
  notice_date: string;
  notice_type: 'WARNING' | 'NOTICE' | 'VARIATION' | 'SUSPENSION' | 'REVOCATION' | 'PROSECUTION';
  regulator: string;
  subject: string;
  description: string;
  requirements: string | null;
  deadline_date: string | null;
  status: 'OPEN' | 'RESPONDED' | 'CLOSED' | 'APPEALED';
  response_submitted_at: string | null;
  response_document_url: string | null;
  response_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EnforcementNoticesResponse {
  data: EnforcementNotice[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const noticeTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  WARNING: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  NOTICE: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  VARIATION: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SUSPENSION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  REVOCATION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  PROSECUTION: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const statusColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  OPEN: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
  RESPONDED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2 },
  CLOSED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  APPEALED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: FileText },
};

export default function EnforcementNoticesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    status: '',
    notice_type: '',
    regulator: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<EnforcementNoticesResponse>({
    queryKey: ['module-1-enforcement-notices', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.notice_type) params.append('notice_type', filters.notice_type);
      if (filters.regulator) params.append('regulator', filters.regulator);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<EnforcementNoticesResponse>(`/module-1/enforcement-notices?${params.toString()}`);
    },
  });

  const notices = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  // Filter by search query (client-side for now)
  const filteredNotices = notices.filter((notice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      notice.notice_number.toLowerCase().includes(query) ||
      notice.subject.toLowerCase().includes(query) ||
      notice.regulator.toLowerCase().includes(query) ||
      notice.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Enforcement Notices</h1>
          <p className="text-text-secondary mt-2">
            Track and manage enforcement notices from regulators
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/enforcement-notices/new">
            <Plus className="w-4 h-4 mr-2" />
            New Enforcement Notice
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
              placeholder="Search notices by number, subject, regulator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="RESPONDED">Responded</option>
              <option value="CLOSED">Closed</option>
              <option value="APPEALED">Appealed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Notice Type</label>
            <select
              value={filters.notice_type}
              onChange={(e) => setFilters({ ...filters, notice_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="WARNING">Warning</option>
              <option value="NOTICE">Notice</option>
              <option value="VARIATION">Variation</option>
              <option value="SUSPENSION">Suspension</option>
              <option value="REVOCATION">Revocation</option>
              <option value="PROSECUTION">Prosecution</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Regulator</label>
            <input
              type="text"
              placeholder="Filter by regulator..."
              value={filters.regulator}
              onChange={(e) => setFilters({ ...filters, regulator: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Enforcement Notices Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading enforcement notices...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading enforcement notices. Please try again.
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No enforcement notices found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Notice Number
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Regulator
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Notice Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredNotices.map((notice, index) => {
                    const StatusIcon = statusColors[notice.status]?.icon || AlertCircle;
                    const statusStyle = statusColors[notice.status] || statusColors.OPEN;
                    const typeStyle = noticeTypeColors[notice.notice_type] || noticeTypeColors.WARNING;
                    const isOverdue = notice.deadline_date && new Date(notice.deadline_date) < new Date() && notice.status === 'OPEN';

                    return (
                      <tr
                        key={notice.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/enforcement-notices/${notice.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {notice.notice_number}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900 max-w-md truncate">{notice.subject}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{notice.regulator}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                            {notice.notice_type}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                            {notice.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(notice.notice_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {notice.deadline_date ? (
                            <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                              <Calendar className="inline w-4 h-4 mr-1" />
                              {new Date(notice.deadline_date).toLocaleDateString()}
                              {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
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

