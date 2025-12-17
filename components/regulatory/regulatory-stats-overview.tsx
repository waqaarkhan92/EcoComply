'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Package,
  Building2,
  Activity,
} from 'lucide-react';
import type { RegulatoryDashboardStats, ComplianceBand } from '@/lib/types/regulatory';

interface RegulatoryStatsOverviewProps {
  companyId: string;
}

const BAND_COLORS: Record<ComplianceBand, string> = {
  A: 'bg-emerald-500',
  B: 'bg-green-500',
  C: 'bg-lime-500',
  D: 'bg-yellow-500',
  E: 'bg-orange-500',
  F: 'bg-red-500',
};

export function RegulatoryStatsOverview({ companyId }: RegulatoryStatsOverviewProps) {
  const { data, isLoading } = useQuery<RegulatoryDashboardStats>({
    queryKey: ['regulatory-stats', companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/regulatory/dashboard/stats?companyId=${companyId}`);
      return response.data as RegulatoryDashboardStats;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-base p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* First-Year Mode Banner */}
      {data.firstYearModeActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-700">First-Year Adoption Mode Active</p>
            <p className="text-sm text-blue-600 mt-1">
              Relaxed historical evidence requirements apply until{' '}
              {data.firstYearModeExpiry
                ? new Date(data.firstYearModeExpiry).toLocaleDateString()
                : 'your onboarding period ends'}
              .
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sites with CCS */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">CCS Coverage</span>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {data.sitesWithCcsAssessment}/{data.totalSites}
          </div>
          <p className="text-xs text-text-tertiary mt-1">sites assessed</p>
        </div>

        {/* Open CAPAs */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Open CAPAs</span>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {data.openCapas}
          </div>
          {data.overdueCapas > 0 && (
            <p className="text-xs text-danger mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.overdueCapas} overdue
            </p>
          )}
        </div>

        {/* Active Incidents */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Active Incidents</span>
          </div>
          <div className={`text-3xl font-bold ${data.activeIncidents > 0 ? 'text-danger' : 'text-success'}`}>
            {data.activeIncidents}
          </div>
          <p className="text-xs text-text-tertiary mt-1">
            {data.activeIncidents === 0 ? 'No active incidents' : 'require attention'}
          </p>
        </div>

        {/* Upcoming Monitoring */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Monitoring Due</span>
          </div>
          <div className="text-3xl font-bold text-text-primary">
            {data.upcomingMonitoring}
          </div>
          <p className="text-xs text-text-tertiary mt-1">in next 30 days</p>
        </div>
      </div>

      {/* Compliance Band Distribution */}
      {data.complianceBandDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow-base p-6">
          <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Compliance Band Distribution
          </h3>

          {/* Horizontal Bar Chart */}
          <div className="flex items-center gap-1 h-8 rounded-lg overflow-hidden mb-4">
            {data.complianceBandDistribution.map(item => (
              <div
                key={item.band}
                className={`${BAND_COLORS[item.band]} h-full flex items-center justify-center text-white text-xs font-bold`}
                style={{ width: `${item.percentage}%`, minWidth: item.count > 0 ? '24px' : '0' }}
                title={`Band ${item.band}: ${item.count} sites (${item.percentage.toFixed(1)}%)`}
              >
                {item.count > 0 && item.band}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {data.complianceBandDistribution.map(item => (
              <div key={item.band} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${BAND_COLORS[item.band]}`}></div>
                <span className="text-sm text-text-secondary">
                  Band {item.band}: {item.count} ({item.percentage.toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <a
          href="/dashboard/packs/regulatory"
          className="bg-white rounded-lg shadow-base p-4 flex items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary">Generate Pack</p>
            <p className="text-xs text-text-secondary">
              {data.packsPendingGeneration} pending
            </p>
          </div>
        </a>

        <a
          href="/dashboard/compliance/ccs"
          className="bg-white rounded-lg shadow-base p-4 flex items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="p-2 bg-success/10 rounded-lg">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-medium text-text-primary">CCS Assessments</p>
            <p className="text-xs text-text-secondary">View & manage</p>
          </div>
        </a>

        <a
          href="/dashboard/compliance/capa"
          className="bg-white rounded-lg shadow-base p-4 flex items-center gap-3 hover:shadow-lg transition-shadow"
        >
          <div className="p-2 bg-warning/10 rounded-lg">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium text-text-primary">CAPA Tracker</p>
            <p className="text-xs text-text-secondary">
              {data.openCapas} open actions
            </p>
          </div>
        </a>
      </div>
    </div>
  );
}
