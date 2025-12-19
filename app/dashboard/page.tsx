'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Calendar,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { ComplianceStatusBadge } from '@/components/ui';
import { getComplianceStatus, complianceStatusConfig } from '@/lib/utils/status';
import { SitesRequiringAttention } from '@/components/dashboard/sites-requiring-attention';
import { ActionableOverdueItems } from '@/components/dashboard/actionable-overdue-items';
import { QuickUploadZone } from '@/components/dashboard/quick-upload-zone';
import { WhatToDoNext } from '@/components/dashboard/what-to-do-next';
import { FinancialImpactWidget } from '@/components/dashboard/financial-impact-widget';
import { ActivityFeed } from '@/components/enhanced-features';
import { SiteHealthOverview, ComplianceSummaryCard, type SiteHealthData } from '@/components/ingestion';

interface DashboardStats {
  totals: {
    sites: number;
    obligations: number;
    overdue: number;
    due_soon: number;
    completed_this_month: number;
    documents: number;
    evidence: number;
    packs: number;
  };
  recent_activity: any[];
  upcoming_deadlines: any[];
}

interface Site {
  id: string;
  name: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  overdue_count?: number;
  upcoming_count?: number;
}

export default function DashboardPage() {
  const { company } = useAuthStore();
  const router = useRouter();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats');
      return response.data;
    },
  });

  // Fetch sites
  const { data: sitesData } = useQuery({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites: any[] = sitesData?.data || [];
  const totals = stats?.totals || {
    sites: 0,
    obligations: 0,
    overdue: 0,
    due_soon: 0,
    completed_this_month: 0,
    documents: 0,
    evidence: 0,
    packs: 0,
  };

  const overallCompliance = sites.length > 0
    ? Math.round(sites.reduce((acc, site) => acc + (site.compliance_score || 0), 0) / sites.length)
    : 0;

  const complianceStatus = getComplianceStatus(overallCompliance);
  const statusConfig = complianceStatusConfig[complianceStatus];

  // Show error state
  if (statsError) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-danger mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Failed to Load Dashboard</h2>
          <p className="text-text-secondary mb-6">
            We couldn't load your dashboard data. Please try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Show loading skeleton
  if (statsLoading) {
    return (
      <div className="min-h-screen bg-background space-y-6">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-10 w-[300px] mb-2" />
              <Skeleton className="h-6 w-[250px]" />
            </div>
            <div className="text-right">
              <Skeleton className="h-6 w-[100px] mb-2 ml-auto" />
              <Skeleton className="h-16 w-[100px] mb-2 ml-auto" />
              <Skeleton className="h-4 w-[120px] ml-auto" />
            </div>
          </div>
        </div>

        {/* Compliance Clock Skeleton */}
        <div className="bg-gradient-to-br from-primary to-primary-700 rounded-lg shadow-xl p-8">
          <Skeleton className="h-10 w-[250px] mb-6 bg-white/20" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-6">
                <Skeleton className="h-6 w-[100px] mb-4 bg-white/30" />
                <Skeleton className="h-10 w-[80px] mb-2 bg-white/30" />
                <Skeleton className="h-4 w-[150px] bg-white/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Summary Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <Skeleton className="h-4 w-[100px] mb-3" />
            <Skeleton className="h-14 w-[120px] mb-3" />
            <Skeleton className="h-6 w-[80px]" />
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between mb-4">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-8 w-[80px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border-2 border-gray-200">
                  <Skeleton className="h-4 w-[60px] mb-2" />
                  <Skeleton className="h-8 w-[40px]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sites Overview Skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Skeleton className="h-8 w-[200px] mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-2 rounded-lg p-5">
                <Skeleton className="h-6 w-[150px] mb-3" />
                <Skeleton className="h-12 w-[80px] mb-3" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-10 w-[60px]" />
                  <Skeleton className="h-10 w-[60px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Skeleton className="h-8 w-[200px] mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-[200px] mb-2" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                    <Skeleton className="h-10 w-[60px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <Skeleton className="h-8 w-[150px] mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Portfolio Overview"
        description={`${sites.length} sites · Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        actions={
          <Link href="/dashboard/sites/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Site
            </Button>
          </Link>
        }
      />

      {/* Summary Row: Compliance Score + Deadline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score Card - 1/3 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <p className="text-sm font-medium text-text-secondary mb-2">Compliance Score</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-5xl font-bold tracking-tight ${statusConfig.textColor}`}>
              {overallCompliance}
            </span>
            <span className="text-2xl text-text-tertiary">%</span>
          </div>
          <ComplianceStatusBadge status={complianceStatus} showIcon size="sm" />
          <p className="text-xs text-text-tertiary mt-3">
            Across {sites.length} {sites.length === 1 ? 'site' : 'sites'}
          </p>
        </div>

        {/* Deadline Status - 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-text-secondary">Deadline Status</p>
            <Link href="/dashboard/deadlines">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Link href="/dashboard/deadlines?filter=overdue" className="group">
              <div className="p-4 rounded-lg border-2 border-danger/30 bg-danger/5 hover:border-danger transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <span className="text-xs font-semibold text-danger uppercase">Overdue</span>
                </div>
                <p className="text-3xl font-bold text-danger">{totals.overdue || 0}</p>
              </div>
            </Link>

            <Link href="/dashboard/deadlines?filter=this-week" className="group">
              <div className="p-4 rounded-lg border-2 border-warning/30 bg-warning/5 hover:border-warning transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold text-warning uppercase">Due Soon</span>
                </div>
                <p className="text-3xl font-bold text-warning">{totals.due_soon || 0}</p>
              </div>
            </Link>

            <div className="p-4 rounded-lg border-2 border-success/30 bg-success/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-xs font-semibold text-success uppercase">On Track</span>
              </div>
              <p className="text-3xl font-bold text-success">
                {(totals.obligations || 0) - (totals.overdue || 0) - (totals.due_soon || 0)}
              </p>
            </div>
          </div>

          {/* Next Critical Deadline */}
          {stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-tertiary">Next Critical</p>
                <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">
                  {stats.upcoming_deadlines[0].obligations?.title || 'N/A'}
                </p>
                <p className="text-xs text-text-secondary">
                  {stats.upcoming_deadlines[0].sites?.name || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-text-primary">
                  {Math.max(0, Math.ceil((new Date(stats.upcoming_deadlines[0].due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                </p>
                <p className="text-xs text-text-tertiary">days</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* What to Do Next - Context-aware guidance */}
      <WhatToDoNext limit={3} />

      {/* Financial Impact Assessment */}
      <FinancialImpactWidget compact />

      {/* Actionable Overdue Items - Only show if there are overdue items */}
      {(totals.overdue || 0) > 0 && (
        <ActionableOverdueItems limit={5} showHeader={true} />
      )}

      {/* Sites Requiring Attention */}
      <SitesRequiringAttention sites={sites} threshold={85} limit={3} />

      {/* Site Health Overview - Enhanced with traffic light indicators */}
      {sites.length > 0 && (
        <SiteHealthOverview
          sites={sites.map((site): SiteHealthData => ({
            siteId: site.id,
            siteName: site.name,
            compliancePercentage: site.compliance_score || 0,
            overdueCount: site.overdue_count || 0,
            dueSoonCount: site.upcoming_count || 0,
            pendingReviewCount: 0,
            totalObligations: (site.overdue_count || 0) + (site.upcoming_count || 0) + 10, // Estimated
          }))}
          onSiteClick={(siteId) => router.push(`/dashboard/sites/${siteId}/dashboard`)}
        />
      )}

      {/* All Sites Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">All Sites</h2>
            <p className="text-sm text-text-secondary">{sites.length} {sites.length === 1 ? 'location' : 'locations'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/sites">
              <Button variant="outline" size="sm">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">No sites configured</h3>
            <p className="text-sm text-text-secondary mb-4">Add your first site to begin compliance tracking</p>
            <Link href="/dashboard/sites/new">
              <Button variant="primary" size="sm">Add Site</Button>
            </Link>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.slice(0, 6).map((site) => {
                const siteStatus = getComplianceStatus(site.compliance_score || 0);
                const siteConfig = complianceStatusConfig[siteStatus];

                return (
                  <div
                    key={site.id}
                    className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                    onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
                  >
                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${siteConfig.dotColor}`} />

                    <h3 className="font-medium text-sm text-text-primary mb-2 pr-6 truncate group-hover:text-primary transition-colors">
                      {site.name}
                    </h3>

                    <div className="flex items-baseline gap-1 mb-3">
                      <span className={`text-3xl font-bold tracking-tight ${siteConfig.textColor}`}>
                        {site.compliance_score || 0}
                      </span>
                      <span className="text-sm text-text-tertiary">%</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      {(site.overdue_count || 0) > 0 && (
                        <span className="text-danger">{site.overdue_count} overdue</span>
                      )}
                      {(site.upcoming_count || 0) > 0 && (
                        <span className="text-warning">{site.upcoming_count} due soon</span>
                      )}
                      {(site.overdue_count || 0) === 0 && (site.upcoming_count || 0) === 0 && (
                        <span className="text-success">All on track</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {sites.length > 6 && (
              <div className="mt-4 text-center">
                <Link href="/dashboard/sites">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All {sites.length} Sites
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Upload Zone - Drag & Drop */}
      <QuickUploadZone compact />

      {/* Two Column Layout: Deadlines + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-text-tertiary" />
              <h2 className="text-lg font-semibold text-text-primary">Upcoming Deadlines</h2>
            </div>
            <Link href="/dashboard/deadlines">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </Link>
          </div>

          {stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {stats.upcoming_deadlines.slice(0, 5).map((deadline: any) => {
                const daysRemaining = Math.max(0, Math.ceil((new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const isUrgent = daysRemaining <= 1;
                const isDueSoon = daysRemaining > 1 && daysRemaining <= 7;

                return (
                  <div
                    key={deadline.id}
                    className="px-6 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => router.push(`/dashboard/sites/${deadline.site_id}/permits/obligations/${deadline.obligation_id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isUrgent ? 'bg-danger' : isDueSoon ? 'bg-warning' : 'bg-success'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {deadline.obligations?.title || 'N/A'}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          {deadline.sites?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-lg font-bold ${
                        isUrgent ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-success'
                      }`}>
                        {daysRemaining}d
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-2" />
              <p className="text-sm text-text-secondary">No upcoming deadlines</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <ActivityFeed limit={5} />
      </div>
    </div>
  );
}
