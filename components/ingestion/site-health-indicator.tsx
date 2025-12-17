'use client';

import { cn } from '@/lib/utils';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// =============================================================================
// TYPES
// =============================================================================

export type HealthStatus = 'HEALTHY' | 'ATTENTION' | 'AT_RISK' | 'CRITICAL';

export interface SiteHealthData {
  siteId: string;
  siteName: string;
  compliancePercentage: number;
  overdueCount: number;
  dueSoonCount: number;
  pendingReviewCount: number;
  totalObligations: number;
  trend?: 'UP' | 'DOWN' | 'STABLE';
  trendValue?: number;
  lastUpdated?: string;
}

interface SiteHealthIndicatorProps {
  site: SiteHealthData;
  onClick?: () => void;
  showActions?: boolean;
  className?: string;
}

// =============================================================================
// HEALTH STATUS CONFIG
// =============================================================================

const HEALTH_CONFIG: Record<HealthStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle;
  description: string;
}> = {
  HEALTHY: {
    label: 'Healthy',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
    icon: CheckCircle,
    description: '>90% compliance, 0 overdue',
  },
  ATTENTION: {
    label: 'Attention',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    icon: AlertCircle,
    description: '80-90% compliance, 1-2 overdue',
  },
  AT_RISK: {
    label: 'At Risk',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: AlertTriangle,
    description: '70-80% compliance, 3-5 overdue',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/30',
    icon: XCircle,
    description: '<70% compliance, >5 overdue',
  },
};

// =============================================================================
// HEALTH CALCULATION
// =============================================================================

export function calculateHealthStatus(site: SiteHealthData): HealthStatus {
  const { compliancePercentage, overdueCount } = site;

  if (compliancePercentage >= 90 && overdueCount === 0) {
    return 'HEALTHY';
  }
  if (compliancePercentage >= 80 && overdueCount <= 2) {
    return 'ATTENTION';
  }
  if (compliancePercentage >= 70 && overdueCount <= 5) {
    return 'AT_RISK';
  }
  return 'CRITICAL';
}

// =============================================================================
// SITE HEALTH CARD
// =============================================================================

export function SiteHealthCard({
  site,
  onClick,
  showActions = true,
  className,
}: SiteHealthIndicatorProps) {
  const status = calculateHealthStatus(site);
  const config = HEALTH_CONFIG[status];
  const Icon = config.icon;
  const TrendIcon = site.trend === 'UP' ? TrendingUp : site.trend === 'DOWN' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        config.borderColor,
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-text-tertiary" />
          <h4 className="font-medium text-text-primary">{site.siteName}</h4>
        </div>
        <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
          <Icon className="h-3 w-3" />
          {config.label}
        </div>
      </div>

      {/* Compliance Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-text-secondary">Compliance</span>
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-bold', config.color)}>
              {site.compliancePercentage}%
            </span>
            {site.trend && (
              <span className={cn(
                'flex items-center text-xs',
                site.trend === 'UP' ? 'text-success' : site.trend === 'DOWN' ? 'text-danger' : 'text-text-tertiary'
              )}>
                <TrendIcon className="h-3 w-3" />
                {site.trendValue && `${site.trend === 'UP' ? '+' : ''}${site.trendValue}%`}
              </span>
            )}
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', config.color.replace('text-', 'bg-'))}
            style={{ width: `${site.compliancePercentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className={cn('p-2 rounded', site.overdueCount > 0 ? 'bg-danger/10' : 'bg-gray-50')}>
          <p className={cn('text-lg font-bold', site.overdueCount > 0 ? 'text-danger' : 'text-text-primary')}>
            {site.overdueCount}
          </p>
          <p className="text-xs text-text-secondary">Overdue</p>
        </div>
        <div className={cn('p-2 rounded', site.dueSoonCount > 0 ? 'bg-warning/10' : 'bg-gray-50')}>
          <p className={cn('text-lg font-bold', site.dueSoonCount > 0 ? 'text-warning' : 'text-text-primary')}>
            {site.dueSoonCount}
          </p>
          <p className="text-xs text-text-secondary">Due Soon</p>
        </div>
        <div className={cn('p-2 rounded', site.pendingReviewCount > 0 ? 'bg-primary/10' : 'bg-gray-50')}>
          <p className={cn('text-lg font-bold', site.pendingReviewCount > 0 ? 'text-primary' : 'text-text-primary')}>
            {site.pendingReviewCount}
          </p>
          <p className="text-xs text-text-secondary">Review</p>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-4 pt-3 border-t">
          <Link href={`/dashboard/sites/${site.siteId}`}>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              View Site Dashboard
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SITE HEALTH OVERVIEW (Multi-site)
// =============================================================================

interface SiteHealthOverviewProps {
  sites: SiteHealthData[];
  onSiteClick?: (siteId: string) => void;
  className?: string;
}

export function SiteHealthOverview({
  sites,
  onSiteClick,
  className,
}: SiteHealthOverviewProps) {
  // Sort by health status (worst first)
  const sortedSites = [...sites].sort((a, b) => {
    const statusOrder: Record<HealthStatus, number> = {
      CRITICAL: 0,
      AT_RISK: 1,
      ATTENTION: 2,
      HEALTHY: 3,
    };
    return statusOrder[calculateHealthStatus(a)] - statusOrder[calculateHealthStatus(b)];
  });

  const healthCounts = sites.reduce((acc, site) => {
    const status = calculateHealthStatus(site);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<HealthStatus, number>);

  return (
    <div className={cn('rounded-lg border bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-medium text-text-primary">Site Health Overview</h3>
        <p className="text-sm text-text-secondary">
          {sites.length} site{sites.length !== 1 ? 's' : ''} monitored
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 border-b">
        {(['HEALTHY', 'ATTENTION', 'AT_RISK', 'CRITICAL'] as HealthStatus[]).map((status) => {
          const config = HEALTH_CONFIG[status];
          const Icon = config.icon;
          const count = healthCounts[status] || 0;

          return (
            <div key={status} className={cn('p-3 text-center', config.bgColor)}>
              <div className="flex items-center justify-center gap-1">
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className={cn('text-xl font-bold', config.color)}>{count}</span>
              </div>
              <p className="text-xs text-text-secondary">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Sites Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Site</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">Compliance</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">Overdue</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedSites.map((site) => {
              const status = calculateHealthStatus(site);
              const config = HEALTH_CONFIG[status];
              const Icon = config.icon;

              return (
                <tr
                  key={site.siteId}
                  className={cn(
                    'border-b hover:bg-gray-50 transition-colors',
                    onSiteClick && 'cursor-pointer'
                  )}
                  onClick={() => onSiteClick?.(site.siteId)}
                >
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-text-primary">{site.siteName}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn('font-medium', config.color)}>
                      {site.compliancePercentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      'font-medium',
                      site.overdueCount > 0 ? 'text-danger' : 'text-text-secondary'
                    )}>
                      {site.overdueCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      config.bgColor,
                      config.color
                    )}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs font-medium text-text-secondary mb-2">LEGEND</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {(['HEALTHY', 'ATTENTION', 'AT_RISK', 'CRITICAL'] as HealthStatus[]).map((status) => {
            const config = HEALTH_CONFIG[status];
            const Icon = config.icon;

            return (
              <div key={status} className="flex items-center gap-1.5">
                <Icon className={cn('h-3 w-3', config.color)} />
                <span className="text-text-secondary">
                  {config.label}: {config.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPLIANCE SUMMARY CARD
// =============================================================================

interface ComplianceSummaryCardProps {
  siteName: string;
  compliancePercentage: number;
  stats: {
    complete: number;
    dueSoon: number;
    active: number;
    overdue: number;
    na: number;
  };
  trend?: {
    direction: 'UP' | 'DOWN' | 'STABLE';
    value: number;
    period: string;
  };
  className?: string;
}

export function ComplianceSummaryCard({
  siteName,
  compliancePercentage,
  stats,
  trend,
  className,
}: ComplianceSummaryCardProps) {
  const TrendIcon = trend?.direction === 'UP' ? TrendingUp : trend?.direction === 'DOWN' ? TrendingDown : Minus;
  const trendColor = trend?.direction === 'UP' ? 'text-success' : trend?.direction === 'DOWN' ? 'text-danger' : 'text-text-tertiary';

  return (
    <div className={cn('rounded-lg border bg-white p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-text-primary">Compliance Status</h3>
        <span className="text-sm text-text-secondary">{siteName}</span>
      </div>

      {/* Main Score */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold text-primary mb-1">{compliancePercentage}%</div>
        <div className="text-sm text-text-secondary">COMPLIANT</div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${compliancePercentage}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <div className="text-center p-2 bg-success/10 rounded">
          <CheckCircle className="h-4 w-4 text-success mx-auto mb-1" />
          <div className="text-lg font-bold text-success">{stats.complete}</div>
          <div className="text-xs text-text-secondary">Complete</div>
        </div>
        <div className="text-center p-2 bg-warning/10 rounded">
          <AlertCircle className="h-4 w-4 text-warning mx-auto mb-1" />
          <div className="text-lg font-bold text-warning">{stats.dueSoon}</div>
          <div className="text-xs text-text-secondary">Due Soon</div>
        </div>
        <div className="text-center p-2 bg-primary/10 rounded">
          <div className="h-4 w-4 rounded-full bg-primary mx-auto mb-1" />
          <div className="text-lg font-bold text-primary">{stats.active}</div>
          <div className="text-xs text-text-secondary">Active</div>
        </div>
        <div className="text-center p-2 bg-danger/10 rounded">
          <XCircle className="h-4 w-4 text-danger mx-auto mb-1" />
          <div className="text-lg font-bold text-danger">{stats.overdue}</div>
          <div className="text-xs text-text-secondary">Overdue</div>
        </div>
        <div className="text-center p-2 bg-gray-100 rounded">
          <Minus className="h-4 w-4 text-text-tertiary mx-auto mb-1" />
          <div className="text-lg font-bold text-text-secondary">{stats.na}</div>
          <div className="text-xs text-text-secondary">N/A</div>
        </div>
      </div>

      {/* Trend */}
      {trend && (
        <div className="text-center text-sm">
          <span className={cn('inline-flex items-center gap-1', trendColor)}>
            <TrendIcon className="h-4 w-4" />
            {trend.direction === 'UP' && '+'}
            {trend.value}% from {trend.period}
          </span>
        </div>
      )}
    </div>
  );
}

export { HEALTH_CONFIG };
