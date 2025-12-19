'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Match the actual API response structure from /api/v1/admin/ai-insights
interface AIInsightsResponse {
  summary: {
    patternHitRate: number;
    totalCost: number;
    costChange: number;
    activePatterns: number;
    avgConfidence: number;
    totalExtractions: number;
  };
  patternHitRate: {
    hitRate: number;
    totalExtractions: number;
    ruleLibraryHits: number;
    llmExtractions: number;
  };
  costMetrics: {
    totalCost: number;
    avgPerDoc: number;
    byRegulator: Record<string, number>;
    trend: Array<{ date: string; cost: number }>;
  };
  patternHealth: {
    activePatterns: number;
    pendingPatterns: number;
    decliningPatterns: number;
    topPatterns: Array<{
      patternId: string;
      displayName: string;
      usageCount: number;
      successRate: number;
      category?: string;
      lastUsedAt?: string;
    }>;
  };
  extractionStats: {
    total: number;
    byDocType: Record<string, number>;
    successRate: number;
    avgConfidence: number;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function AIInsightsPage() {
  // Fetch AI insights data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async (): Promise<AIInsightsResponse> => {
      const response = await apiClient.get<AIInsightsResponse>('/admin/ai-insights');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const summary = data?.summary || {
    patternHitRate: 0,
    totalCost: 0,
    costChange: 0,
    activePatterns: 0,
    avgConfidence: 0,
    totalExtractions: 0,
  };

  const costTrend = data?.costMetrics?.trend || [];
  const topPatterns = data?.patternHealth?.topPatterns || [];
  const costByRegulator = data?.costMetrics?.byRegulator || {};
  const patternStats = data?.patternHitRate || {
    hitRate: 0,
    totalExtractions: 0,
    ruleLibraryHits: 0,
    llmExtractions: 0
  };
  const patternHealth = data?.patternHealth || {
    activePatterns: 0,
    pendingPatterns: 0,
    decliningPatterns: 0,
    topPatterns: [],
  };

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Learning Dashboard"
          description="Monitor AI extraction patterns, costs, and performance metrics"
        />

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Failed to Load AI Insights</h2>
          <p className="text-text-secondary mb-4">
            {(error as Error)?.message || 'An error occurred while fetching AI insights data.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="AI Learning Dashboard"
          description="Monitor AI extraction patterns, costs, and performance metrics"
        />

        {/* Metrics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-4 w-[120px] mb-4" />
              <Skeleton className="h-10 w-[80px] mb-2" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>

        {/* Chart Section Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-[200px] mb-6" />
          <Skeleton className="h-[300px] w-full" />
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Convert costByRegulator object to array for display
  const regulatorCosts = Object.entries(costByRegulator).map(([regulator, cost]) => ({
    regulator,
    totalCost: cost,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="AI Learning Dashboard"
        description="Monitor AI extraction patterns, costs, and performance metrics"
      />

      {/* Hero Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pattern Hit Rate */}
        <MetricCard
          label="Pattern Hit Rate"
          value={`${summary.patternHitRate.toFixed(1)}%`}
          subtitle={`${patternStats.ruleLibraryHits} of ${patternStats.totalExtractions} extractions`}
          icon={<Target className="h-5 w-5" />}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />

        {/* Total AI Cost */}
        <MetricCard
          label="Total AI Cost"
          value={`$${summary.totalCost.toFixed(2)}`}
          trend={summary.costChange}
          subtitle="This period"
          icon={<DollarSign className="h-5 w-5" />}
          iconBgColor="bg-warning/10"
          iconColor="text-warning"
        />

        {/* Active Patterns */}
        <MetricCard
          label="Active Patterns"
          value={summary.activePatterns.toString()}
          subtitle={`${patternHealth.pendingPatterns} pending, ${patternHealth.decliningPatterns} declining`}
          icon={<Brain className="h-5 w-5" />}
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />

        {/* Avg Confidence Score */}
        <MetricCard
          label="Avg Confidence"
          value={`${summary.avgConfidence.toFixed(1)}%`}
          subtitle={`${summary.totalExtractions} total extractions`}
          icon={<Activity className="h-5 w-5" />}
          iconBgColor="bg-info/10"
          iconColor="text-info"
        />
      </div>

      {/* Extraction Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Rule Library Hits</p>
              <p className="text-2xl font-bold text-text-primary">{patternStats.ruleLibraryHits}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${patternStats.totalExtractions > 0 ? (patternStats.ruleLibraryHits / patternStats.totalExtractions) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            {patternStats.totalExtractions > 0
              ? `${((patternStats.ruleLibraryHits / patternStats.totalExtractions) * 100).toFixed(1)}% of extractions`
              : 'No extractions yet'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-warning/10">
              <Brain className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">LLM Extractions</p>
              <p className="text-2xl font-bold text-text-primary">{patternStats.llmExtractions}</p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-warning rounded-full transition-all"
              style={{ width: `${patternStats.totalExtractions > 0 ? (patternStats.llmExtractions / patternStats.totalExtractions) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            {patternStats.totalExtractions > 0
              ? `${((patternStats.llmExtractions / patternStats.totalExtractions) * 100).toFixed(1)}% of extractions`
              : 'No extractions yet'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-success/10">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Avg Cost/Document</p>
              <p className="text-2xl font-bold text-text-primary">
                ${data?.costMetrics?.avgPerDoc?.toFixed(4) || '0.00'}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-tertiary">
            Based on {patternStats.totalExtractions} extractions
          </p>
        </div>
      </div>

      {/* Cost Trend Chart Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-text-primary">Cost Trend</h2>
          <p className="text-sm text-text-secondary">AI extraction costs over time</p>
        </div>
        <div className="p-6">
          {costTrend.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-sm font-medium text-text-secondary pb-3 px-4">Date</th>
                    <th className="text-right text-sm font-medium text-text-secondary pb-3 px-4">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costTrend.slice(-10).map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-text-primary">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary text-right font-medium">
                        ${item.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No cost data available yet</p>
              <p className="text-xs text-text-tertiary mt-1">Cost data will appear after document extractions</p>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Pattern Library + Cost by Regulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pattern Library Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Pattern Library Status</h2>
            <p className="text-sm text-text-secondary">Top patterns by usage</p>
          </div>
          <div className="p-6">
            {topPatterns.length > 0 ? (
              <div className="space-y-3">
                {topPatterns.slice(0, 10).map((pattern, index) => (
                  <div
                    key={pattern.patternId}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-tertiary w-6">#{index + 1}</span>
                        <p className="text-sm font-medium text-text-primary truncate">
                          {pattern.displayName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 ml-8">
                        <span className="text-xs text-text-secondary">
                          {pattern.usageCount} uses
                        </span>
                        {pattern.category && (
                          <span className="text-xs text-text-tertiary">
                            {pattern.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <div
                        className={cn(
                          'text-sm font-semibold px-2 py-1 rounded',
                          pattern.successRate >= 0.9
                            ? 'bg-success/10 text-success'
                            : pattern.successRate >= 0.7
                            ? 'bg-warning/10 text-warning'
                            : 'bg-danger/10 text-danger'
                        )}
                      >
                        {(pattern.successRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No patterns in library yet</p>
                <p className="text-xs text-text-tertiary mt-1">Patterns are created from confirmed extractions</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown by Regulator */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Cost by Regulator</h2>
            <p className="text-sm text-text-secondary">AI extraction costs per regulator</p>
          </div>
          <div className="p-6">
            {regulatorCosts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-text-secondary pb-3">Regulator</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulatorCosts
                      .sort((a, b) => b.totalCost - a.totalCost)
                      .map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 last:border-0">
                          <td className="py-3 text-sm text-text-primary font-medium">{item.regulator}</td>
                          <td className="py-3 text-sm text-text-primary text-right font-semibold">
                            ${item.totalCost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No regulator cost data yet</p>
                <p className="text-xs text-text-tertiary mt-1">Costs will be tracked by regulator type</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({
  label,
  value,
  trend,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
}: MetricCardProps) {
  const hasTrend = trend !== undefined && trend !== 0;
  const isPositiveTrend = trend && trend > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <div className={cn('p-2 rounded-lg', iconBgColor)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-text-primary tracking-tight">
          {value}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-text-tertiary">{subtitle}</p>
      )}
      {hasTrend && (
        <div className="flex items-center gap-1 mt-2">
          {isPositiveTrend ? (
            <TrendingUp className="h-4 w-4 text-danger" />
          ) : (
            <TrendingDown className="h-4 w-4 text-success" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              isPositiveTrend ? 'text-danger' : 'text-success'
            )}
          >
            {isPositiveTrend ? '+' : ''}{trend.toFixed(1)}% vs previous period
          </span>
        </div>
      )}
    </div>
  );
}
