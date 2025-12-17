'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { PackGenerationWizard } from '@/components/regulatory';
import {
  Package,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import type { RegulatoryPack, PackType, PackStatus } from '@/lib/types/regulatory';

interface RegulatoryPackWithDetails extends RegulatoryPack {
  sites?: { id: string; name: string }[];
}

const PACK_TYPE_LABELS: Record<PackType, { label: string; icon: string }> = {
  REGULATOR_PACK: { label: 'Regulator Pack', icon: '🏛️' },
  INTERNAL_AUDIT_PACK: { label: 'Internal Audit Pack', icon: '📋' },
  BOARD_PACK: { label: 'Board Pack', icon: '📊' },
  TENDER_PACK: { label: 'Tender Pack', icon: '📁' },
};

const STATUS_CONFIG: Record<PackStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: 'Draft', color: 'text-text-secondary bg-background-tertiary', icon: FileText },
  GENERATING: { label: 'Generating', color: 'text-warning bg-warning/10', icon: Clock },
  READY: { label: 'Ready', color: 'text-success bg-success/10', icon: CheckCircle },
  FAILED: { label: 'Failed', color: 'text-danger bg-danger/10', icon: AlertCircle },
  EXPIRED: { label: 'Expired', color: 'text-text-tertiary bg-background-tertiary', icon: AlertTriangle },
};

export default function RegulatoryPacksPage() {
  const { company } = useAuthStore();
  const [showWizard, setShowWizard] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PackStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<PackType | 'ALL'>('ALL');

  const { data: packsData, isLoading, refetch } = useQuery({
    queryKey: ['regulatory-packs', company?.id, filterStatus, filterType],
    queryFn: async () => {
      let url = `/regulatory/packs?companyId=${company?.id}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;
      if (filterType !== 'ALL') url += `&packType=${filterType}`;
      const response = await apiClient.get<RegulatoryPackWithDetails[]>(url);
      return response as { data: RegulatoryPackWithDetails[] };
    },
    enabled: !!company?.id,
    refetchInterval: (query) => {
      // Poll if any pack is generating
      const packs = query.state.data?.data || [];
      const hasGenerating = packs.some((p: RegulatoryPackWithDetails) => p.status === 'GENERATING');
      return hasGenerating ? 5000 : false;
    },
  });

  const packs: any[] = packsData?.data || [];

  const handlePackGenerated = (packId: string) => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-text-primary">Regulatory Packs</h1>
          </div>
          <p className="text-text-secondary mt-2">
            Generate EA-compliant packs with readiness checks and safeguards
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Package className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => setShowWizard(true)}
        >
          Generate Pack
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-base p-4 flex items-center gap-4">
        <Filter className="h-5 w-5 text-text-tertiary" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as PackType | 'ALL')}
          className="rounded-lg border border-input-border px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Types</option>
          {Object.entries(PACK_TYPE_LABELS).map(([type, { label }]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as PackStatus | 'ALL')}
          className="rounded-lg border border-input-border px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([status, { label }]) => (
            <option key={status} value={status}>{label}</option>
          ))}
        </select>
      </div>

      {/* Packs List */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <p className="text-text-secondary">Loading packs...</p>
        </div>
      ) : packs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-base p-12 text-center">
          <Package className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
          <p className="text-text-secondary mb-4">No regulatory packs generated yet</p>
          <Button variant="primary" size="md" onClick={() => setShowWizard(true)}>
            Generate Your First Pack
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {packs.map(pack => {
            const typeInfo = PACK_TYPE_LABELS[pack.pack_type as PackType];
            const statusConfig = STATUS_CONFIG[pack.status as PackStatus];
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={pack.id}
                className="bg-white rounded-lg shadow-base overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Pack Info */}
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{typeInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-text-primary">{typeInfo.label}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(pack.generation_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {pack.site_ids.length} site{pack.site_ids.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Sites List */}
                        {pack.sites && pack.sites.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {pack.sites.slice(0, 3).map((site: { id: string; name: string }) => (
                              <span
                                key={site.id}
                                className="text-xs bg-background-tertiary text-text-secondary px-2 py-1 rounded"
                              >
                                {site.name}
                              </span>
                            ))}
                            {pack.sites.length > 3 && (
                              <span className="text-xs text-text-tertiary">
                                +{pack.sites.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusConfig.label}
                      </span>

                      <div className="flex items-center gap-2">
                        {pack.status === 'READY' && (
                          <>
                            <Link href={`/dashboard/packs/regulatory/${pack.id}`}>
                              <Button variant="ghost" size="sm" title="View">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <a href={`/api/v1/regulatory/packs/${pack.id}/download`} download>
                              <Button variant="ghost" size="sm" title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          </>
                        )}
                        {pack.status === 'GENERATING' && (
                          <div className="flex items-center gap-2 text-warning">
                            <Clock className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rule Results Summary */}
                  {(pack.blocking_failures.length > 0 || pack.warnings.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-input-border flex items-center gap-6">
                      {pack.blocking_failures.length > 0 && (
                        <div className="flex items-center gap-2 text-danger">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {pack.blocking_failures.length} blocking failure{pack.blocking_failures.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {pack.warnings.length > 0 && (
                        <div className="flex items-center gap-2 text-warning">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">
                            {pack.warnings.length} warning{pack.warnings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {pack.passed_rules.length > 0 && (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">
                            {pack.passed_rules.length} passed
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generation Wizard Modal */}
      {showWizard && company && (
        <PackGenerationWizard
          companyId={company.id}
          onClose={() => setShowWizard(false)}
          onSuccess={handlePackGenerated}
        />
      )}
    </div>
  );
}
