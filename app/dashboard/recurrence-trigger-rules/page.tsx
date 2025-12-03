'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, Settings, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface RecurrenceTriggerRule {
  id: string;
  schedule_id: string;
  site_id: string;
  rule_type: 'DYNAMIC_OFFSET' | 'EVENT_BASED' | 'CONDITIONAL' | 'FIXED';
  rule_config: any;
  is_active: boolean;
  next_execution_date: string | null;
  schedules: { id: string; schedule_name: string };
  recurrence_events: { id: string; event_name: string; event_type: string } | null;
  created_at: string;
}

interface RecurrenceTriggerRulesResponse {
  data: RecurrenceTriggerRule[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function RecurrenceTriggerRulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    rule_type: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<RecurrenceTriggerRulesResponse>({
    queryKey: ['recurrence-trigger-rules', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.rule_type) params.append('rule_type', filters.rule_type);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<RecurrenceTriggerRulesResponse>(`/recurrence-trigger-rules?${params.toString()}`);
    },
  });

  const rules = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return rule.schedules.schedule_name.toLowerCase().includes(query) || rule.rule_type.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Recurrence Trigger Rules</h1>
          <p className="text-text-secondary mt-2">
            Manage dynamic rules that trigger recurring tasks from schedules
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recurrence-trigger-rules/new">
            <Plus className="w-4 h-4 mr-2" />
            New Trigger Rule
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
              placeholder="Search by schedule name, rule type..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Rule Type</label>
            <select
              value={filters.rule_type}
              onChange={(e) => setFilters({ ...filters, rule_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="DYNAMIC_OFFSET">Dynamic Offset</option>
              <option value="EVENT_BASED">Event Based</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading trigger rules...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading trigger rules. Please try again.
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No trigger rules found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rule Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Next Execution
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRules.map((rule, index) => (
                    <tr
                      key={rule.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/dashboard/recurrence-trigger-rules/${rule.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {rule.schedules.schedule_name}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">{rule.rule_type.replace('_', ' ')}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {rule.recurrence_events ? rule.recurrence_events.event_name : '—'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {rule.next_execution_date ? new Date(rule.next_execution_date).toLocaleDateString() : '—'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {rule.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
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

