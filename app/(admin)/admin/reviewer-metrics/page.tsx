'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Clock,
  CheckCircle2,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewerMetricsData {
  summary: {
    totalItemsReviewed: number;
    avgReviewTimeMinutes: number;
    activeReviewers: number;
    aiAgreementRate: number;
  };
  leaderboard: Array<{
    rank: number;
    reviewerName: string;
    itemsReviewed: number;
    avgTimeMinutes: number;
    confirmRate: number;
    editRate: number;
    aiAgreementRate: number;
    score: number;
  }>;
  trends: Array<{
    period: string;
    itemsReviewed: number;
    avgTimeMinutes: number;
    confirmPercent: number;
    editPercent: number;
    rejectPercent: number;
  }>;
  bottlenecks: Array<{
    userId: string;
    reviewerName: string;
    email: string;
    pendingItems: number;
    avgReviewTimeMinutes: number;
    estimatedBacklogHours: number;
  }>;
}

export default function ReviewerMetricsPage() {
  // Fetch reviewer metrics data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reviewer-metrics'],
    queryFn: async (): Promise<ReviewerMetricsData> => {
      const response = await apiClient.get<ReviewerMetricsData>('/admin/reviewer-metrics');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const summary = data?.summary || {
    totalItemsReviewed: 0,
    avgReviewTimeMinutes: 0,
    activeReviewers: 0,
    aiAgreementRate: 0,
  };

  const leaderboard = data?.leaderboard || [];
  const trends = data?.trends || [];
  const bottlenecks = data?.bottlenecks || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reviewer Metrics"
          description="Monitor reviewer performance and document processing efficiency"
        />

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <Skeleton className="h-4 w-[120px] mb-4" />
              <Skeleton className="h-10 w-[80px] mb-2" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          ))}
        </div>

        {/* Leaderboard Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Skeleton className="h-6 w-[200px] mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>

        {/* Other Sections Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <Skeleton className="h-[200px] w-full" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-6 w-[180px] mb-6" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reviewer Metrics"
          description="Monitor reviewer performance and document processing efficiency"
        />

        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Unable to Load Metrics</h2>
          <p className="text-text-secondary mb-4">
            There was an error loading reviewer metrics. This could be due to insufficient permissions or a temporary
            server issue.
          </p>
          <p className="text-sm text-text-tertiary">
            Please try refreshing the page or contact support if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reviewer Metrics"
        description="Monitor reviewer performance and document processing efficiency"
      />

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items Reviewed */}
        <MetricCard
          label="Total Items Reviewed"
          value={summary.totalItemsReviewed.toLocaleString()}
          subtitle="This period"
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBgColor="bg-success/10"
          iconColor="text-success"
        />

        {/* Average Review Time */}
        <MetricCard
          label="Average Review Time"
          value={`${summary.avgReviewTimeMinutes.toFixed(1)} min`}
          icon={<Clock className="h-5 w-5" />}
          iconBgColor="bg-info/10"
          iconColor="text-info"
        />

        {/* Active Reviewers */}
        <MetricCard
          label="Active Reviewers"
          value={summary.activeReviewers.toString()}
          icon={<Users className="h-5 w-5" />}
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />

        {/* AI Agreement Rate */}
        <MetricCard
          label="AI Agreement Rate"
          value={`${summary.aiAgreementRate.toFixed(1)}%`}
          subtitle="Overall"
          icon={<Target className="h-5 w-5" />}
          iconBgColor="bg-warning/10"
          iconColor="text-warning"
        />
      </div>

      {/* Reviewer Leaderboard Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">Reviewer Leaderboard</h2>
          </div>
          <p className="text-sm text-text-secondary mt-1">Top 10 reviewers by performance score</p>
        </div>
        <div className="p-6">
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-text-secondary pb-3 px-4">Rank</th>
                    <th className="text-left text-xs font-medium text-text-secondary pb-3 px-4">Reviewer Name</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">Items</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">Avg Time</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">Confirm</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">Edit</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">AI Agreement</th>
                    <th className="text-right text-xs font-medium text-text-secondary pb-3 px-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {entry.rank <= 3 ? (
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                                entry.rank === 1 && 'bg-yellow-100 text-yellow-700',
                                entry.rank === 2 && 'bg-gray-200 text-gray-700',
                                entry.rank === 3 && 'bg-orange-100 text-orange-700'
                              )}
                            >
                              {entry.rank}
                            </div>
                          ) : (
                            <span className="w-8 text-center text-sm font-medium text-text-secondary">
                              {entry.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-text-primary">{entry.reviewerName}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-semibold text-text-primary">{entry.itemsReviewed}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-text-secondary">{entry.avgTimeMinutes.toFixed(1)} min</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <PerformanceIndicator value={entry.confirmRate} type="confirm" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <PerformanceIndicator value={entry.editRate} type="edit" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <PerformanceIndicator value={entry.aiAgreementRate} type="agreement" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary">{entry.score.toFixed(1)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No reviewer data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout: Trends + Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Trends Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-text-primary">Review Trends</h2>
            <p className="text-sm text-text-secondary mt-1">Daily/weekly review activity</p>
          </div>
          <div className="p-6">
            {trends.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-text-secondary pb-3">Period</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Items</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Avg Time</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Confirm%</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Edit%</th>
                      <th className="text-right text-xs font-medium text-text-secondary pb-3">Reject%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.slice(-10).map((trend, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-xs text-text-primary font-medium">
                          {new Date(trend.period).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-xs text-text-primary text-right font-semibold">
                          {trend.itemsReviewed}
                        </td>
                        <td className="py-3 text-xs text-text-secondary text-right">
                          {trend.avgTimeMinutes.toFixed(1)}m
                        </td>
                        <td className="py-3 text-xs text-right">
                          <span className="text-success font-medium">{trend.confirmPercent.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 text-xs text-right">
                          <span className="text-warning font-medium">{trend.editPercent.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 text-xs text-right">
                          <span className="text-danger font-medium">{trend.rejectPercent.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <p className="text-sm">No trend data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottleneck Alerts Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold text-text-primary">Bottleneck Alerts</h2>
            </div>
            <p className="text-sm text-text-secondary mt-1">Reviewers with high estimated backlogs</p>
          </div>
          <div className="p-6">
            {bottlenecks.length > 0 ? (
              <div className="space-y-3">
                {bottlenecks.slice(0, 5).map((bottleneck) => {
                  const isHighBacklog = bottleneck.estimatedBacklogHours > 8;
                  const isMediumBacklog =
                    bottleneck.estimatedBacklogHours > 4 && bottleneck.estimatedBacklogHours <= 8;

                  return (
                    <div
                      key={bottleneck.userId}
                      className={cn(
                        'p-4 rounded-lg border-l-4',
                        isHighBacklog && 'bg-danger/5 border-danger',
                        isMediumBacklog && 'bg-warning/5 border-warning',
                        !isHighBacklog && !isMediumBacklog && 'bg-gray-50 border-gray-300'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{bottleneck.reviewerName}</p>
                          <p className="text-xs text-text-secondary mt-1">{bottleneck.email}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-text-tertiary">
                              {bottleneck.pendingItems} pending items
                            </span>
                            <span className="text-xs text-text-tertiary">
                              {bottleneck.avgReviewTimeMinutes.toFixed(1)}m avg time
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4 text-right">
                          <p
                            className={cn(
                              'text-lg font-bold',
                              isHighBacklog && 'text-danger',
                              isMediumBacklog && 'text-warning',
                              !isHighBacklog && !isMediumBacklog && 'text-text-secondary'
                            )}
                          >
                            {bottleneck.estimatedBacklogHours.toFixed(1)}h
                          </p>
                          <p className="text-xs text-text-tertiary">est. backlog</p>
                        </div>
                      </div>
                      {isHighBacklog && (
                        <div className="flex items-center gap-1 mt-2">
                          <AlertTriangle className="h-3 w-3 text-danger" />
                          <span className="text-xs font-medium text-danger">High priority - consider reallocation</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success opacity-50" />
                <p className="text-sm">No bottlenecks detected</p>
                <p className="text-xs text-text-tertiary mt-1">All reviewers have manageable workloads</p>
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
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function MetricCard({ label, value, subtitle, icon, iconBgColor, iconColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <div className={cn('p-2 rounded-lg', iconBgColor)}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold text-text-primary tracking-tight">{value}</span>
      </div>
      {subtitle && <p className="text-xs text-text-tertiary">{subtitle}</p>}
    </div>
  );
}

interface PerformanceIndicatorProps {
  value: number;
  type: 'confirm' | 'edit' | 'agreement';
}

function PerformanceIndicator({ value, type }: PerformanceIndicatorProps) {
  let colorClass = 'bg-gray-100 text-gray-700';
  let icon = null;

  if (type === 'confirm' || type === 'agreement') {
    // Higher is better for confirm and agreement rates
    if (value >= 80) {
      colorClass = 'bg-success/10 text-success';
      icon = <TrendingUp className="h-3 w-3" />;
    } else if (value >= 60) {
      colorClass = 'bg-warning/10 text-warning';
    } else {
      colorClass = 'bg-danger/10 text-danger';
      icon = <TrendingDown className="h-3 w-3" />;
    }
  } else if (type === 'edit') {
    // Lower edit rate is generally better (more accurate AI extractions)
    if (value <= 20) {
      colorClass = 'bg-success/10 text-success';
      icon = <TrendingUp className="h-3 w-3" />;
    } else if (value <= 40) {
      colorClass = 'bg-warning/10 text-warning';
    } else {
      colorClass = 'bg-danger/10 text-danger';
      icon = <TrendingDown className="h-3 w-3" />;
    }
  }

  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold', colorClass)}>
      {icon}
      <span>{value.toFixed(1)}%</span>
    </div>
  );
}
