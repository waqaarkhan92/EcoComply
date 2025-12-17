'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Building2,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Upload,
  Package,
  TrendingUp,
  ArrowRight,
  Beaker,
  Zap,
  Trash2,
  Settings,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComplianceStatusBadge } from '@/components/ui';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PageHeader } from '@/components/ui/page-header';
import { TabBar, TabItem } from '@/components/ui/tab-bar';
import { getComplianceStatus, complianceStatusConfig } from '@/lib/utils/status';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';

interface SiteDashboardProps {
  params: Promise<{ siteId: string }>;
}

interface Site {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  postcode: string;
  regulator: string;
  water_company: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

interface DashboardStats {
  obligations: {
    total: number;
    overdue: number;
    due_soon: number;
    compliant: number;
  };
  documents: {
    total: number;
    pending_review: number;
    approved: number;
  };
  upcoming_deadlines: Array<{
    id: string;
    obligation_id: string;
    obligation_title: string;
    due_date: string;
    status: string;
  }>;
}

export default function SiteDashboardPage({ params }: SiteDashboardProps) {
  const { siteId } = use(params);
  const router = useRouter();

  // Module activation hooks
  const { data: isModule2Active } = useModuleActivation('MODULE_2');
  const { data: isModule3Active } = useModuleActivation('MODULE_3');
  const { data: isModule4Active } = useModuleActivation('MODULE_4');

  const { data: siteData, isLoading: isSiteLoading } = useQuery({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}`);
      return response.data as Site;
    },
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['site-dashboard-stats', siteId],
    queryFn: async () => {
      const response = await apiClient.get(`/sites/${siteId}/dashboard`);
      return response.data as DashboardStats;
    },
  });

  const site = siteData;
  const stats = statsData;

  const score = site?.compliance_score || 0;
  const status = getComplianceStatus(score);
  const config = complianceStatusConfig[status];

  // Build module tabs based on what's active
  const moduleTabs: TabItem[] = [
    {
      id: 'permits',
      label: 'Permits',
      href: `/dashboard/sites/${siteId}/permits/documents`,
      icon: FileText,
    },
  ];

  if (isModule2Active) {
    moduleTabs.push({
      id: 'trade-effluent',
      label: 'Trade Effluent',
      href: `/dashboard/sites/${siteId}/module-2/parameters`,
      icon: Beaker,
    });
  }

  if (isModule3Active) {
    moduleTabs.push({
      id: 'generators',
      label: 'Generators',
      href: `/dashboard/sites/${siteId}/module-3/run-hours`,
      icon: Zap,
    });
  }

  if (isModule4Active) {
    moduleTabs.push({
      id: 'hazardous-waste',
      label: 'Hazardous Waste',
      href: `/dashboard/sites/${siteId}/hazardous-waste/waste-streams`,
      icon: Trash2,
    });
  }

  if (isSiteLoading || isStatsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse w-64" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sites', href: '/dashboard/sites' },
    { label: site?.name || 'Site' },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Page Header with Site Name */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{site?.name}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {site?.address_line_1}, {site?.city}, {site?.postcode}
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/settings`}>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Site Settings
          </Button>
        </Link>
      </div>

      {/* Module Tabs */}
      <TabBar tabs={moduleTabs} variant="pills" />

      {/* Summary Row: Compliance Score + Deadline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm font-medium text-text-secondary mb-2">Compliance Score</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-5xl font-bold tracking-tight ${config.textColor}`}>
              {score}
            </span>
            <span className="text-2xl text-text-tertiary">%</span>
          </div>
          <ComplianceStatusBadge status={status} showIcon size="sm" />
          <p className="text-xs text-text-tertiary mt-3">
            Based on {stats?.obligations?.total || 0} obligations
          </p>
        </div>

        {/* Deadline Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-secondary">Deadline Status</p>
            <Link href={`/dashboard/sites/${siteId}/deadlines`}>
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Link href={`/dashboard/sites/${siteId}/permits/obligations?status=OVERDUE`} className="group">
              <div className="p-4 rounded-lg border-2 border-danger/30 bg-danger/5 hover:border-danger transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <span className="text-xs font-semibold text-danger uppercase">Overdue</span>
                </div>
                <p className="text-3xl font-bold text-danger">{stats?.obligations?.overdue || 0}</p>
              </div>
            </Link>

            <Link href={`/dashboard/sites/${siteId}/permits/obligations?status=DUE_SOON`} className="group">
              <div className="p-4 rounded-lg border-2 border-warning/30 bg-warning/5 hover:border-warning transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase">Due Soon</span>
                </div>
                <p className="text-3xl font-bold text-warning">{stats?.obligations?.due_soon || 0}</p>
              </div>
            </Link>

            <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-semibold text-success uppercase">On Track</span>
              </div>
              <p className="text-3xl font-bold text-success">{stats?.obligations?.compliant || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href={`/dashboard/sites/${siteId}/permits/evidence`}>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
              <Upload className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium text-sm text-text-primary group-hover:text-primary">View Evidence</p>
              <p className="text-xs text-text-tertiary">Manage evidence</p>
            </div>
          </Link>

          <Link href={`/dashboard/sites/${siteId}/packs`}>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
              <Package className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium text-sm text-text-primary group-hover:text-primary">Generate Pack</p>
              <p className="text-xs text-text-tertiary">Create audit pack</p>
            </div>
          </Link>

          {isModule3Active && (
            <Link href={`/dashboard/sites/${siteId}/module-3/run-hours/new`}>
              <div className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
                <Zap className="h-5 w-5 text-primary mb-2" />
                <p className="font-medium text-sm text-text-primary group-hover:text-primary">Log Run Hours</p>
                <p className="text-xs text-text-tertiary">Generator runtime</p>
              </div>
            </Link>
          )}

          <Link href={`/dashboard/sites/${siteId}/deadlines`}>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group">
              <TrendingUp className="h-5 w-5 text-primary mb-2" />
              <p className="font-medium text-sm text-text-primary group-hover:text-primary">View Deadlines</p>
              <p className="text-xs text-text-tertiary">Upcoming tasks</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Module Status Cards - Only Active Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Permits - Always shown */}
        <div
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push(`/dashboard/sites/${siteId}/permits/documents`)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-text-primary">Environmental Permits</h3>
            </div>
            <ArrowRight className="h-5 w-5 text-text-tertiary" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.obligations?.total || 0}</p>
              <p className="text-xs text-text-tertiary">Obligations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.documents?.total || 0}</p>
              <p className="text-xs text-text-tertiary">Documents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-danger">{stats?.obligations?.overdue || 0}</p>
              <p className="text-xs text-text-tertiary">Overdue</p>
            </div>
          </div>
        </div>

        {/* Trade Effluent - If Active */}
        {isModule2Active && (
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/sites/${siteId}/module-2/parameters`)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Beaker className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-text-primary">Trade Effluent</h3>
              </div>
              <ArrowRight className="h-5 w-5 text-text-tertiary" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Parameters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Lab Results</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">-</p>
                <p className="text-xs text-text-tertiary">Exceedances</p>
              </div>
            </div>
          </div>
        )}

        {/* Generators - If Active */}
        {isModule3Active && (
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/sites/${siteId}/module-3/run-hours`)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Zap className="h-5 w-5 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-text-primary">Generators</h3>
              </div>
              <ArrowRight className="h-5 w-5 text-text-tertiary" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Generators</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Run Hours MTD</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Stack Tests</p>
              </div>
            </div>
          </div>
        )}

        {/* Hazardous Waste - If Active */}
        {isModule4Active && (
          <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/sites/${siteId}/hazardous-waste/waste-streams`)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-text-primary">Hazardous Waste</h3>
              </div>
              <ArrowRight className="h-5 w-5 text-text-tertiary" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Waste Streams</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">-</p>
                <p className="text-xs text-text-tertiary">Consignments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">-</p>
                <p className="text-xs text-text-tertiary">Chain Breaks</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-text-tertiary" />
              <h2 className="text-lg font-semibold text-text-primary">Upcoming Deadlines</h2>
            </div>
            <Link href={`/dashboard/sites/${siteId}/deadlines`}>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {stats.upcoming_deadlines.slice(0, 5).map((deadline) => {
              const daysRemaining = Math.max(0, Math.ceil((new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              const isUrgent = daysRemaining <= 1;
              const isDueSoon = daysRemaining > 1 && daysRemaining <= 7;

              return (
                <div
                  key={deadline.id}
                  className="px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => router.push(`/dashboard/obligations/${deadline.obligation_id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isUrgent ? 'bg-danger' : isDueSoon ? 'bg-warning' : 'bg-success'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {deadline.obligation_title || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`text-lg font-bold ${
                      isUrgent ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-success'
                    }`}>
                      {daysRemaining}d
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(deadline.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
