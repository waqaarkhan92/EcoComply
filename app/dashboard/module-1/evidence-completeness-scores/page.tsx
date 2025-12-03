'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, FileText } from 'lucide-react';

interface EvidenceCompletenessScore {
  id: string;
  obligation_id: string;
  condition_reference: string | null;
  compliance_period: string;
  completeness_score: number;
  required_evidence_count: number;
  provided_evidence_count: number;
  missing_evidence_types: string[];
  last_calculated_at: string;
  obligations: { id: string; summary: string };
}

interface EvidenceCompletenessScoresResponse {
  data: EvidenceCompletenessScore[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function EvidenceCompletenessScoresPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    obligation_id: '',
    condition_reference: '',
    compliance_period: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery<EvidenceCompletenessScoresResponse>({
    queryKey: ['evidence-completeness-scores', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.obligation_id) params.append('obligation_id', filters.obligation_id);
      if (filters.condition_reference) params.append('condition_reference', filters.condition_reference);
      if (filters.compliance_period) params.append('compliance_period', filters.compliance_period);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<EvidenceCompletenessScoresResponse>(`/module-1/evidence-completeness-scores?${params.toString()}`);
    },
  });

  const scores = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredScores = scores.filter((score) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      score.obligations.summary.toLowerCase().includes(query) ||
      score.condition_reference?.toLowerCase().includes(query) ||
      score.compliance_period.toLowerCase().includes(query)
    );
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Evidence Completeness Scores</h1>
          <p className="text-text-secondary mt-2">
            Automated completeness scoring per condition/obligation
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
              placeholder="Search by obligation, condition, compliance period..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Obligation ID</label>
            <input
              type="text"
              placeholder="Obligation UUID"
              value={filters.obligation_id}
              onChange={(e) => setFilters({ ...filters, obligation_id: e.target.value })}
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
            <label className="block text-sm font-medium text-text-secondary mb-2">Compliance Period</label>
            <input
              type="text"
              placeholder="e.g., 2024-Q1"
              value={filters.compliance_period}
              onChange={(e) => setFilters({ ...filters, compliance_period: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Scores Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading completeness scores...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading completeness scores. Please try again.
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No completeness scores found</p>
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
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Compliance Period
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Completeness Score
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Evidence Count
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Last Calculated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredScores.map((score, index) => {
                    const scoreColor = getScoreColor(parseFloat(score.completeness_score.toString()));
                    const scoreBg = getScoreBg(parseFloat(score.completeness_score.toString()));

                    return (
                      <tr
                        key={score.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{score.obligations.summary}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 font-mono">{score.condition_reference || '—'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">{score.compliance_period}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold ${scoreBg} ${scoreColor}`}>
                            <TrendingUp className="w-4 h-4 mr-1.5" />
                            {parseFloat(score.completeness_score.toString()).toFixed(1)}%
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {score.provided_evidence_count} / {score.required_evidence_count}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(score.last_calculated_at).toLocaleDateString()}
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

