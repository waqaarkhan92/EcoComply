'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ConsentState {
  id: string;
  document_id: string;
  site_id: string;
  state: 'DRAFT' | 'IN_FORCE' | 'SUPERSEDED' | 'EXPIRED';
  effective_date: string;
  expiry_date: string | null;
  previous_state_id: string | null;
  state_transition_reason: string | null;
  transitioned_by: string | null;
  transitioned_at: string;
  documents: { id: string; document_name: string };
  created_at: string;
}

interface ConsentStatesResponse {
  data: ConsentState[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

const stateColors: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  DRAFT: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: FileText },
  IN_FORCE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  SUPERSEDED: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  EXPIRED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
};

export default function ConsentStatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    document_id: '',
    site_id: '',
    state: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['consent-states', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.document_id) params.append('document_id', filters.document_id);
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.state) params.append('state', filters.state);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ConsentStatesResponse>(`/module-2/consent-states?${params.toString()}`);
    },
  });

  const states: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const filteredStates = states.filter((state) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      state.documents.document_name.toLowerCase().includes(query) ||
      state.state.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Consent States</h1>
          <p className="text-text-secondary mt-2">
            Manage consent validity state machine (Draft → In Force → Superseded → Expired)
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/module-2/consent-states/new">
            <Plus className="w-4 h-4 mr-2" />
            New State Transition
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
              placeholder="Search by document name, state..."
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
            <label className="block text-sm font-medium text-text-secondary mb-2">State</label>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All States</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_FORCE">In Force</option>
              <option value="SUPERSEDED">Superseded</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* States Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading consent states...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading consent states. Please try again.
          </div>
        ) : filteredStates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No consent states found</p>
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
                      State
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Transitioned
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredStates.map((state, index) => {
                    const stateStyle = stateColors[state.state] || stateColors.DRAFT;
                    const StateIcon = stateStyle.icon;

                    return (
                      <tr
                        key={state.id}
                        className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <td className="py-4 px-6">
                          <Link
                            href={`/dashboard/module-2/consent-states/${state.id}`}
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {state.documents.document_name}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${stateStyle.bg} ${stateStyle.text} border ${stateStyle.border}`}>
                            <StateIcon className="w-3.5 h-3.5 mr-1.5" />
                            {state.state.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(state.effective_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {state.expiry_date ? new Date(state.expiry_date).toLocaleDateString() : '—'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600">
                            {new Date(state.transitioned_at).toLocaleDateString()}
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

