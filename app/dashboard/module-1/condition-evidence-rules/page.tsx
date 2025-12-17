'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ConditionEvidenceRule {
  id: string;
  document_id: string;
  obligation_id: string | null;
  condition_reference: string;
  allowed_evidence_types: string[];
  required_evidence_types: string[];
  evidence_requirements: any;
  is_active: boolean;
  documents: { id: string; document_name: string };
  obligations: { id: string; summary: string } | null;
  created_at: string;
}

interface ConditionEvidenceRulesResponse {
  data: ConditionEvidenceRule[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ConditionEvidenceRulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    document_id: '',
    condition_reference: '',
    is_active: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['condition-evidence-rules', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.condition_reference) params.append('condition_reference', filters.condition_reference);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ConditionEvidenceRulesResponse>(`/module-1/condition-evidence-rules?${params.toString()}`);
    },
  });

  const rules: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      rule.documents.document_name.toLowerCase().includes(query) ||
      rule.condition_reference.toLowerCase().includes(query) ||
      rule.allowed_evidence_types.some((type: string) => type.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Condition Evidence Rules</h1>
          <p className="text-text-secondary mt-2">
            Configure allowed evidence types per permit condition
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-1/condition-evidence-rules/new">
            <Plus className="w-4 h-4 mr-2" />
            New Rule
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
              placeholder="Search by document, condition reference, evidence type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Document ID</label>
            <input
              type="text"
              placeholder="Document UUID"
              value={filters.document_id}
              onChange={(e) => setFilters({ ...filters, document_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Condition Reference</label>
            <input
              type="text"
              placeholder="e.g., Condition 2.3"
              value={filters.condition_reference}
              onChange={(e) => setFilters({ ...filters, condition_reference: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading condition evidence rules...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading condition evidence rules. Please try again.
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No condition evidence rules found</p>
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
                      Condition
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Allowed Types
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Required Types
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
                          href={`/dashboard/module-1/condition-evidence-rules/${rule.id}`}
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {rule.documents.document_name}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600 font-mono">{rule.condition_reference}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {rule.allowed_evidence_types.length > 0 ? (
                            rule.allowed_evidence_types.map((type: string, i: number) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1">
                          {rule.required_evidence_types.length > 0 ? (
                            rule.required_evidence_types.map((type: string, i: number) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-700">
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {rule.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700">
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

