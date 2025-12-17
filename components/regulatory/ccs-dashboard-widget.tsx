'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import type { CcsDashboardData, ComplianceBand } from '@/lib/types/regulatory';

interface CcsDashboardWidgetProps {
  siteId: string;
  companyId: string;
}

const BAND_COLORS: Record<ComplianceBand, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500' },
  B: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  C: { bg: 'bg-lime-500/10', text: 'text-lime-500', border: 'border-lime-500' },
  D: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500' },
  E: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' },
  F: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500' },
};

const BAND_DESCRIPTIONS: Record<ComplianceBand, string> = {
  A: 'Excellent - No significant issues',
  B: 'Good - Minor issues only',
  C: 'Satisfactory - Some issues to address',
  D: 'Below Standard - Improvement required',
  E: 'Poor - Significant non-compliance',
  F: 'Very Poor - Severe non-compliance',
};

export function CcsDashboardWidget({ siteId, companyId }: CcsDashboardWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ccs-dashboard', siteId, companyId],
    queryFn: async () => {
      const response = await apiClient.get(`/regulatory/ccs/dashboard?siteId=${siteId}&companyId=${companyId}`);
      return response.data as CcsDashboardData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center gap-2 text-text-secondary">
          <Shield className="h-5 w-5" />
          <span>CCS data unavailable</span>
        </div>
      </div>
    );
  }

  const bandColors = data.currentBand ? BAND_COLORS[data.currentBand] : null;
  const trendIcon = data.trend === 'IMPROVING'
    ? <TrendingUp className="h-5 w-5 text-success" />
    : data.trend === 'DECLINING'
    ? <TrendingDown className="h-5 w-5 text-danger" />
    : <Minus className="h-5 w-5 text-text-secondary" />;

  return (
    <div className="bg-white rounded-lg shadow-base overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-input-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-text-primary">Compliance Classification</h3>
        </div>
        <Link
          href={`/dashboard/sites/${siteId}/compliance/ccs`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View Details <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Main Score */}
      <div className="p-6">
        {data.currentBand ? (
          <div className="flex items-center gap-6">
            {/* Band Display */}
            <div className={`w-24 h-24 rounded-xl ${bandColors?.bg} ${bandColors?.border} border-2 flex items-center justify-center`}>
              <span className={`text-5xl font-bold ${bandColors?.text}`}>
                {data.currentBand}
              </span>
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-bold text-text-primary">
                  {data.currentScore} points
                </span>
                {trendIcon}
              </div>
              <p className="text-sm text-text-secondary mb-2">
                {BAND_DESCRIPTIONS[data.currentBand]}
              </p>
              {data.previousYearBand && (
                <p className="text-xs text-text-tertiary">
                  Previous year: Band {data.previousYearBand} ({data.previousYearScore} points)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-secondary">No CCS assessment recorded</p>
            <Link
              href={`/dashboard/sites/${siteId}/compliance/ccs/new`}
              className="text-primary hover:underline text-sm"
            >
              Record Assessment
            </Link>
          </div>
        )}

        {/* Non-Compliance Summary */}
        {data.currentBand && (
          <div className="mt-6 pt-6 border-t border-input-border">
            <h4 className="text-sm font-medium text-text-primary mb-3">Non-Compliance by Risk Category</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="text-lg font-bold text-red-600">{data.nonCompliancesByCategory.category1}</div>
                <div className="text-xs text-text-secondary">Cat 1</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">{data.nonCompliancesByCategory.category2}</div>
                <div className="text-xs text-text-secondary">Cat 2</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">{data.nonCompliancesByCategory.category3}</div>
                <div className="text-xs text-text-secondary">Cat 3</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{data.nonCompliancesByCategory.category4}</div>
                <div className="text-xs text-text-secondary">Cat 4</div>
              </div>
            </div>
          </div>
        )}

        {/* CAPA Status */}
        {(data.openCapas > 0 || data.overdueCapas > 0) && (
          <div className="mt-4 flex items-center gap-4">
            {data.overdueCapas > 0 && (
              <div className="flex items-center gap-2 text-danger">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{data.overdueCapas} overdue CAPA{data.overdueCapas !== 1 ? 's' : ''}</span>
              </div>
            )}
            {data.openCapas > 0 && (
              <div className="flex items-center gap-2 text-warning">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{data.openCapas} open CAPA{data.openCapas !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
