'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  DollarSign,
  Shield,
  TrendingUp,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FineBreakdownItem {
  obligationId: string;
  obligationTitle: string;
  regulatoryBody: string;
  maxFine: number;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedFine: number;
  regulationReference: string;
}

interface FinancialImpactData {
  fineExposure: {
    total: number;
    breakdown: FineBreakdownItem[];
  };
  remediationCost: {
    total: number;
    byCategory: Record<string, number>;
  };
  insuranceRisk: {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    premiumImpact: number;
  };
  assessedAt: string;
}

interface FinancialImpactWidgetProps {
  siteId?: string;
  className?: string;
  compact?: boolean;
}

export function FinancialImpactWidget({
  siteId,
  className,
  compact = false,
}: FinancialImpactWidgetProps) {
  const { company } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['financial-impact', company?.id, siteId],
    queryFn: async (): Promise<FinancialImpactData> => {
      const params = new URLSearchParams();
      if (company?.id) params.set('companyId', company.id);
      if (siteId) params.set('siteId', siteId);
      const response = await apiClient.get<FinancialImpactData>(
        `/analytics/financial-impact?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!company?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Financial Impact</h3>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>
        <div className="text-center py-4">
          <FileWarning className="h-8 w-8 text-warning mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Unable to load financial data</p>
        </div>
      </div>
    );
  }

  const fineExposure = data?.fineExposure?.total || 0;
  const remediationCost = data?.remediationCost?.total || 0;
  const insuranceRisk = data?.insuranceRisk || { riskLevel: 'LOW', premiumImpact: 0 };
  const totalExposure = fineExposure + remediationCost;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'text-danger bg-danger/10';
      case 'MEDIUM':
        return 'text-warning bg-warning/10';
      default:
        return 'text-success bg-success/10';
    }
  };

  if (compact) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">Total Exposure</p>
              <p className="text-xl font-bold text-text-primary">
                £{totalExposure.toLocaleString()}
              </p>
            </div>
          </div>
          <div className={cn('px-3 py-1 rounded-full text-xs font-semibold', getRiskColor(insuranceRisk.riskLevel))}>
            {insuranceRisk.riskLevel} Risk
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm', className)}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Financial Impact Assessment</h3>
          <p className="text-sm text-text-secondary">Potential compliance costs and risks</p>
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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Fine Exposure */}
          <div className="bg-danger/5 rounded-lg p-4 border border-danger/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-danger" />
              <span className="text-sm font-medium text-danger">Fine Exposure</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              £{fineExposure.toLocaleString()}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {data?.fineExposure?.breakdown?.length || 0} obligations at risk
            </p>
          </div>

          {/* Remediation Cost */}
          <div className="bg-warning/5 rounded-lg p-4 border border-warning/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-warning">Remediation Cost</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              £{remediationCost.toLocaleString()}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Estimated to resolve issues
            </p>
          </div>

          {/* Insurance Risk */}
          <div className={cn('rounded-lg p-4 border', getRiskColor(insuranceRisk.riskLevel).replace('text-', 'border-').replace('/10', '/20'), getRiskColor(insuranceRisk.riskLevel).replace('text-', 'bg-').replace('/10', '/5'))}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Insurance Impact</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {insuranceRisk.riskLevel}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              +£{insuranceRisk.premiumImpact.toLocaleString()} premium impact
            </p>
          </div>
        </div>

        {/* Fine Breakdown */}
        {data?.fineExposure?.breakdown && data.fineExposure.breakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Top Risk Areas</h4>
            <div className="space-y-2">
              {data.fineExposure.breakdown.slice(0, 5).map((item, index) => (
                <div
                  key={item.obligationId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.obligationTitle}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {item.regulatoryBody} • {item.regulationReference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      item.likelihood === 'HIGH' ? 'bg-danger/10 text-danger' :
                      item.likelihood === 'MEDIUM' ? 'bg-warning/10 text-warning' :
                      'bg-success/10 text-success'
                    )}>
                      {item.likelihood}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      £{item.estimatedFine.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment Time */}
        {data?.assessedAt && (
          <p className="text-xs text-text-tertiary mt-4 text-right">
            Assessed: {new Date(data.assessedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
