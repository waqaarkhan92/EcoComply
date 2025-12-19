'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeadroomResult {
  parameterId: string;
  parameterName: string;
  actualValue: number;
  permitLimit: number;
  headroom: number;
  headroomPercent: number;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  statusColor: 'green' | 'yellow' | 'red';
  unit: string;
  lastTestedAt: string;
  generatorId?: string;
  generatorName?: string;
}

interface Exceedance {
  id: string;
  parameterId: string;
  parameterName: string;
  permitLimit: number;
  actualValue: number;
  exceedanceAmount: number;
  exceedancePercentage: number;
  occurredAt: string;
  unit: string;
}

interface ELVSummary {
  siteId: string;
  parameters: HeadroomResult[];
  totalParameters: number;
  parametersWithinLimits: number;
  parametersExceeded: number;
  worstParameter?: HeadroomResult;
  recentExceedances: Exceedance[];
  lastUpdated: string;
}

interface ELVHeadroomWidgetProps {
  siteId: string;
  className?: string;
  compact?: boolean;
}

export function ELVHeadroomWidget({
  siteId,
  className,
  compact = false,
}: ELVHeadroomWidgetProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['elv-headroom', siteId],
    queryFn: async (): Promise<ELVSummary> => {
      const response = await apiClient.get<ELVSummary>(
        `/analytics/elv-headroom?siteId=${siteId}`
      );
      return response.data;
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">ELV Headroom</h3>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>
        <div className="text-center py-4">
          <Activity className="h-8 w-8 text-warning mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Unable to load ELV data</p>
        </div>
      </div>
    );
  }

  const parameters = data?.parameters || [];
  const worstParameter = data?.worstParameter;
  const recentExceedances = data?.recentExceedances || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXCEEDED':
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-danger" />;
      case 'WARNING':
        return <TrendingDown className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCEEDED':
        return 'bg-danger text-white';
      case 'CRITICAL':
        return 'bg-danger/10 text-danger';
      case 'WARNING':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-success/10 text-success';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'EXCEEDED':
      case 'CRITICAL':
        return 'bg-danger';
      case 'WARNING':
        return 'bg-warning';
      default:
        return 'bg-success';
    }
  };

  if (parameters.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">ELV Headroom</h3>
        </div>
        <div className="text-center py-8">
          <Gauge className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No ELV parameters configured</p>
          <p className="text-xs text-text-tertiary mt-1">
            Add emission limit values in your permit conditions
          </p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">ELV Status</p>
              <p className="text-xl font-bold text-text-primary">
                {data?.parametersWithinLimits || 0}/{data?.totalParameters || 0} OK
              </p>
            </div>
          </div>
          {worstParameter && (
            <div className={cn('px-3 py-1 rounded-full text-xs font-semibold', getStatusColor(worstParameter.status))}>
              {worstParameter.status}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">ELV Headroom Dashboard</h3>
          <p className="text-sm text-text-secondary">
            Emission Limit Values vs Actual Readings
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-text-tertiary" />
        </button>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-success/5 rounded-lg border border-success/20">
            <p className="text-2xl font-bold text-success">{data?.parametersWithinLimits || 0}</p>
            <p className="text-xs text-text-secondary">Within Limits</p>
          </div>
          <div className="text-center p-3 bg-warning/5 rounded-lg border border-warning/20">
            <p className="text-2xl font-bold text-warning">
              {parameters.filter(p => p.status === 'WARNING' || p.status === 'CRITICAL').length}
            </p>
            <p className="text-xs text-text-secondary">Warning/Critical</p>
          </div>
          <div className="text-center p-3 bg-danger/5 rounded-lg border border-danger/20">
            <p className="text-2xl font-bold text-danger">{data?.parametersExceeded || 0}</p>
            <p className="text-xs text-text-secondary">Exceeded</p>
          </div>
        </div>

        {/* Parameter List */}
        <div className="space-y-3">
          {parameters.slice(0, 6).map((param) => {
            const usagePercent = Math.min(100, ((param.permitLimit - param.headroom) / param.permitLimit) * 100);

            return (
              <div
                key={param.parameterId}
                className="p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(param.status)}
                    <span className="font-medium text-text-primary">
                      {param.parameterName}
                    </span>
                    {param.generatorName && (
                      <span className="text-xs text-text-tertiary">
                        ({param.generatorName})
                      </span>
                    )}
                  </div>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(param.status))}>
                    {param.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={cn('h-full rounded-full transition-all', getProgressColor(param.status))}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Actual: {param.actualValue} {param.unit}
                  </span>
                  <span className="text-text-secondary">
                    Limit: {param.permitLimit} {param.unit}
                  </span>
                  <span className={cn(
                    'font-medium',
                    param.headroomPercent < 10 ? 'text-danger' :
                    param.headroomPercent < 20 ? 'text-warning' :
                    'text-success'
                  )}>
                    {param.headroomPercent.toFixed(1)}% headroom
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Exceedances */}
        {recentExceedances.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Recent Exceedances
            </h4>
            <div className="space-y-2">
              {recentExceedances.slice(0, 3).map((exc) => (
                <div
                  key={exc.id}
                  className="flex items-center justify-between p-2 bg-danger/5 rounded-lg border border-danger/20"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{exc.parameterName}</p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(exc.occurredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-danger">
                      +{exc.exceedancePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {exc.actualValue} vs {exc.permitLimit} {exc.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {data?.lastUpdated && (
          <p className="text-xs text-text-tertiary mt-4 text-right">
            Updated: {new Date(data.lastUpdated).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
