'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Share2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  Users,
  Zap,
  ArrowUpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SharedPattern {
  id: string;
  regulator: string;
  documentType: string;
  patternTemplate: string;
  crossCustomerUsageCount: number;
  successRate: number;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SharedPatternsResponse {
  patterns: SharedPattern[];
  count: number;
  filters: {
    regulator: string | null;
    documentType: string | null;
  };
}

export default function SharedPatternsPage() {
  const queryClient = useQueryClient();
  const [filterRegulator, setFilterRegulator] = useState<string>('');
  const [filterDocType, setFilterDocType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch shared patterns
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shared-patterns', filterRegulator, filterDocType],
    queryFn: async (): Promise<SharedPatternsResponse> => {
      const params = new URLSearchParams();
      if (filterRegulator) params.set('regulator', filterRegulator);
      if (filterDocType) params.set('documentType', filterDocType);
      const response = await apiClient.get<SharedPatternsResponse>(
        `/admin/shared-patterns?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Promote pattern mutation
  const promoteMutation = useMutation({
    mutationFn: async (patternId: string) => {
      const response = await apiClient.post('/admin/shared-patterns', { patternId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-patterns'] });
      toast.success('Pattern promoted to shared global pattern');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to promote pattern');
    },
  });

  const patterns = data?.patterns || [];

  // Filter patterns by search
  const filteredPatterns = patterns.filter((pattern) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pattern.patternTemplate.toLowerCase().includes(query) ||
      pattern.regulator.toLowerCase().includes(query) ||
      pattern.documentType.toLowerCase().includes(query)
    );
  });

  // Get unique regulators and doc types for filters
  const regulators = [...new Set(patterns.map((p) => p.regulator))];
  const docTypes = [...new Set(patterns.map((p) => p.documentType))];

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Shared Patterns"
          description="Manage cross-customer AI extraction patterns"
        />
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Failed to Load Patterns</h2>
          <p className="text-text-secondary mb-4">
            {(error as Error)?.message || 'An error occurred while fetching shared patterns.'}
          </p>
          <Button onClick={() => refetch()} variant="primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared Patterns"
        description="Cross-customer AI extraction patterns for cost reduction"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Patterns</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? <Skeleton className="h-8 w-12" /> : patterns.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Global Patterns</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  patterns.filter((p) => p.isGlobal).length
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Users className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Total Uses</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  patterns.reduce((sum, p) => sum + p.crossCustomerUsageCount, 0).toLocaleString()
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <TrendingUp className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Avg Success Rate</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : patterns.length > 0 ? (
                  `${((patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length) * 100).toFixed(1)}%`
                ) : (
                  'N/A'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Regulator Filter */}
          <select
            value={filterRegulator}
            onChange={(e) => setFilterRegulator(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Regulators</option>
            {regulators.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>

          {/* Document Type Filter */}
          <select
            value={filterDocType}
            onChange={(e) => setFilterDocType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Document Types</option>
            {docTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Patterns List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : filteredPatterns.length === 0 ? (
          <div className="p-12 text-center">
            <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No Shared Patterns Found
            </h3>
            <p className="text-text-secondary">
              {searchQuery || filterRegulator || filterDocType
                ? 'Try adjusting your filters'
                : 'Patterns will appear here once they meet sharing criteria'}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Pattern
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Regulator
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Document Type
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Uses
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPatterns.map((pattern) => (
                <tr
                  key={pattern.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="max-w-xs">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {pattern.patternTemplate}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        Created: {new Date(pattern.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                      {pattern.regulator}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-text-secondary">{pattern.documentType}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3 text-warning" />
                      <span className="text-sm font-semibold text-text-primary">
                        {pattern.crossCustomerUsageCount.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded text-xs font-semibold',
                        pattern.successRate >= 0.9
                          ? 'bg-success/10 text-success'
                          : pattern.successRate >= 0.7
                          ? 'bg-warning/10 text-warning'
                          : 'bg-danger/10 text-danger'
                      )}
                    >
                      {(pattern.successRate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {pattern.isGlobal ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded text-xs font-semibold">
                        <CheckCircle className="h-3 w-3" />
                        Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-text-secondary rounded text-xs font-medium">
                        Local
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {!pattern.isGlobal && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => promoteMutation.mutate(pattern.id)}
                        disabled={promoteMutation.isPending}
                      >
                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                        Promote
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
