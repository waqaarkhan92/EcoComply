'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Gauge,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import type { ElvCondition, ElvMonitoringResult } from '@/lib/types/regulatory';

interface ElvComplianceCardProps {
  siteId: string;
  companyId: string;
}

interface ElvSummary {
  totalConditions: number;
  compliantConditions: number;
  nonCompliantConditions: number;
  upcomingMonitoring: number;
  overdueMonitoring: number;
  recentExceedances: {
    condition: ElvCondition;
    result: ElvMonitoringResult;
  }[];
}

export function ElvComplianceCard({ siteId, companyId }: ElvComplianceCardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['elv-summary', siteId, companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/regulatory/elv/summary?siteId=${siteId}&companyId=${companyId}`);
      return response.data as ElvSummary;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center gap-2 text-text-secondary">
          <Gauge className="h-5 w-5" />
          <span>ELV data unavailable</span>
        </div>
      </div>
    );
  }

  const complianceRate = data.totalConditions > 0
    ? Math.round((data.compliantConditions / data.totalConditions) * 100)
    : 100;

  return (
    <div className="bg-white rounded-lg shadow-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-input-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-text-primary">Emission Limit Values</h3>
        </div>
        <Link
          href={`/dashboard/sites/${siteId}/compliance/elv`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-6">
        {data.totalConditions === 0 ? (
          <div className="text-center py-4">
            <p className="text-text-secondary">No ELV conditions tracked</p>
            <Link
              href={`/dashboard/sites/${siteId}/compliance/elv/new`}
              className="text-primary hover:underline text-sm"
            >
              Add ELV Condition
            </Link>
          </div>
        ) : (
          <>
            {/* Compliance Rate */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold text-text-primary">{complianceRate}%</div>
                <div className="text-sm text-text-secondary">Compliance Rate</div>
              </div>
              <div className={`p-3 rounded-full ${
                complianceRate >= 95 ? 'bg-success/10' :
                complianceRate >= 80 ? 'bg-warning/10' :
                'bg-danger/10'
              }`}>
                {complianceRate >= 95 ? (
                  <CheckCircle className={`h-8 w-8 text-success`} />
                ) : complianceRate >= 80 ? (
                  <AlertTriangle className="h-8 w-8 text-warning" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-danger" />
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-success">{data.compliantConditions}</div>
                <div className="text-xs text-text-secondary">Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-danger">{data.nonCompliantConditions}</div>
                <div className="text-xs text-text-secondary">Non-Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-text-primary">{data.totalConditions}</div>
                <div className="text-xs text-text-secondary">Total</div>
              </div>
            </div>

            {/* Monitoring Status */}
            <div className="pt-4 border-t border-input-border">
              <h4 className="text-sm font-medium text-text-primary mb-3">Monitoring Status</h4>
              <div className="flex items-center gap-4">
                {data.overdueMonitoring > 0 && (
                  <div className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {data.overdueMonitoring} overdue
                    </span>
                  </div>
                )}
                {data.upcomingMonitoring > 0 && (
                  <div className="flex items-center gap-2 text-warning">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">
                      {data.upcomingMonitoring} due soon
                    </span>
                  </div>
                )}
                {data.overdueMonitoring === 0 && data.upcomingMonitoring === 0 && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">All monitoring up to date</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Exceedances */}
            {data.recentExceedances.length > 0 && (
              <div className="mt-4 pt-4 border-t border-input-border">
                <h4 className="text-sm font-medium text-danger mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Exceedances
                </h4>
                <div className="space-y-2">
                  {data.recentExceedances.slice(0, 3).map((exc, idx) => (
                    <div
                      key={idx}
                      className="bg-danger/5 rounded-lg p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">
                          {exc.condition.elv_parameter}
                        </span>
                        <span className="text-danger font-bold">
                          +{exc.result.exceedance_percentage?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        Measured: {exc.result.measured_value} {exc.result.measured_unit} |
                        Limit: {exc.condition.elv_value} {exc.condition.elv_unit}
                      </div>
                      <div className="text-xs text-text-tertiary mt-1">
                        {new Date(exc.result.test_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
