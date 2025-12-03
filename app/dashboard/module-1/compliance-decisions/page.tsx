'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, CheckCircle2, XCircle, AlertCircle, Clock, Minus } from 'lucide-react';
import Link from 'next/link';

interface ComplianceDecision {
  id: string;
  company_id: string;
  site_id: string;
  obligation_id: string | null;
  decision_type: 'COMPLIANCE' | 'NON_COMPLIANCE' | 'PARTIAL_COMPLIANCE' | 'NOT_APPLICABLE' | 'DEFERRED';
  decision_date: string;
  decision_maker: string;
  rationale: string;
  evidence_references: string[];
  impact_assessment: string | null;
  review_date: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ComplianceDecisionsResponse {
  data: ComplianceDecision[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const decisionTypeColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  COMPLIANCE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  NON_COMPLIANCE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  PARTIAL_COMPLIANCE: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: AlertCircle },
  NOT_APPLICABLE: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Minus },
  DEFERRED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Clock },
};

export default function ComplianceDecisionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    obligation_id: '',
    decision_type: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<ComplianceDecisionsResponse>({
    queryKey: ['module-1-compliance-decisions', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.obligation_id) params.append('obligation_id', filters.obligation_id);
      if (filters.decision_type) params.append('decision_type', filters.decision_type);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ComplianceDecisionsResponse>(`/module-1/compliance-decisions?${params.toString()}`);
    },
  });

  const decisions = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  // Filter by search query (client-side for now)
  const filteredDecisions = decisions.filter((decision) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      decision.rationale.toLowerCase().includes(query) ||
      decision.impact_assessment?.toLowerCase().includes(query) ||
      decision.decision_type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Compliance Decisions</h1>
          <p className="text-text-secondary mt-2">
            Track and document compliance decisions with justification
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/compliance-decisions/new">
            <Plus className="w-4 h-4 mr-2" />
            New Compliance Decision
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
              placeholder="Search decisions by rationale, impact assessment..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Decision Type</label>
            <select
              value={filters.decision_type}
              onChange={(e) => setFilters({ ...filters, decision_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="COMPLIANCE">Compliance</option>
              <option value="NON_COMPLIANCE">Non-Compliance</option>
              <option value="PARTIAL_COMPLIANCE">Partial Compliance</option>
              <option value="NOT_APPLICABLE">Not Applicable</option>
              <option value="DEFERRED">Deferred</option>
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

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Obligation ID</label>
            <input
              type="text"
              placeholder="Filter by obligation ID..."
              value={filters.obligation_id}
              onChange={(e) => setFilters({ ...filters, obligation_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Compliance Decisions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading compliance decisions...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading compliance decisions. Please try again.
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No compliance decisions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Decision Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Rationale
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Decision Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Evidence
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Review Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredDecisions.map((decision, index) => {
                    const typeStyle = decisionTypeColors[decision.decision_type] || decisionTypeColors.COMPLIANCE;
                    const DecisionIcon = typeStyle.icon;

                    return (
                      <tr
                        key={decision.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/compliance-decisions/${decision.id}`}
                            className="inline-flex items-center"
                          >
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                              <DecisionIcon className="w-3.5 h-3.5 mr-1.5" />
                              {decision.decision_type.replace('_', ' ')}
                            </span>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-1/compliance-decisions/${decision.id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            <div className="text-sm text-gray-900 max-w-md truncate">{decision.rationale}</div>
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(decision.decision_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {decision.evidence_references?.length > 0 ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                                {decision.evidence_references.length} reference{decision.evidence_references.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {decision.is_active ? (
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
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {decision.review_date ? (
                              new Date(decision.review_date).toLocaleDateString()
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
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

