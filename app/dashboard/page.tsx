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
  FileText,
  Package,
  Upload,
  ArrowRight,
  Calendar,
  Zap,
  Target,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<any> => {
      try {
        const response = await fetch('/api/v1/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const result = await response.json();
        return result.data;
      } catch (error) {
        return {
          totals: {
            sites: 0,
            obligations: 0,
            overdue: 0,
            due_soon: 0,
            completed_this_month: 0,
            documents: 0,
            evidence: 0,
            packs: 0,
          },
          recent_activity: [],
          upcoming_deadlines: [],
        };
      }
    },
  });

  // Fetch sites
  const { data: sitesData } = useQuery<{ data: Site[] }>({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites = sitesData?.data || [];
  const totals = stats?.totals || {};

  const getStatusColor = (status?: string, score?: number) => {
    if (!status && !score) return '#6B7280';
    if (status === 'COMPLIANT' || (score && score >= 85)) return '#2E7D32';
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return '#D4A017';
    return '#C44536';
  };

  const getStatusText = (status?: string, score?: number) => {
    if (!status && !score) return 'Unknown';
    if (status === 'COMPLIANT' || (score && score >= 85)) return 'Compliant';
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return 'At Risk';
    return 'Non-Compliant';
  };

  const overallCompliance = sites.length > 0
    ? Math.round(sites.reduce((acc, site) => acc + (site.compliance_score || 0), 0) / sites.length)
    : 0;

  const complianceStatus = overallCompliance >= 85 ? 'COMPLIANT' : overallCompliance >= 70 ? 'AT_RISK' : 'NON_COMPLIANT';

  return (
    <div className="min-h-screen bg-[#F9FAFB] space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4" style={{ borderLeftColor: getStatusColor(complianceStatus, overallCompliance) }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#101314] mb-2">
              Welcome back, {company?.name || 'User'}
            </h1>
            <p className="text-gray-600 text-lg">
              Here's your compliance overview at a glance
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2 justify-end">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: getStatusColor(complianceStatus, overallCompliance) }} />
              <span className="text-sm font-medium text-gray-600">{getStatusText(complianceStatus, overallCompliance)}</span>
            </div>
            <div className="text-5xl font-bold" style={{ color: getStatusColor(complianceStatus, overallCompliance) }}>
              {overallCompliance}%
            </div>
            <p className="text-sm text-gray-500 mt-1">Overall Compliance</p>
          </div>
        </div>
      </div>

      {/* COMPLIANCE CLOCK - The Killer Feature! */}
      <div className="bg-gradient-to-br from-[#104B3A] to-[#0B372A] rounded-lg shadow-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-8 w-8" />
          <h2 className="text-3xl font-bold">Compliance Clock</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-[#C44536]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-[#C44536]" />
                <h3 className="text-lg font-semibold text-[#C44536]">URGENT</h3>
              </div>
              <div className="text-4xl font-bold text-[#C44536]">{totals.overdue || 0}</div>
            </div>
            <p className="text-sm text-white/80">Overdue or due within 24 hours</p>
            <Link href="/dashboard/compliance-clocks?filter=urgent">
              <Button className="mt-4 w-full bg-[#C44536] hover:bg-[#A03A2E]">
                View Urgent Items →
              </Button>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-[#D4A017]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-[#D4A017]" />
                <h3 className="text-lg font-semibold text-[#D4A017]">DUE SOON</h3>
              </div>
              <div className="text-4xl font-bold text-[#D4A017]">{totals.due_soon || 0}</div>
            </div>
            <p className="text-sm text-white/80">Due within 7 days</p>
            <Link href="/dashboard/compliance-clocks?filter=due_soon">
              <Button className="mt-4 w-full bg-[#D4A017] hover:bg-[#B88B14]">
                View Due Soon →
              </Button>
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 border-2 border-[#2E7D32]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-[#2E7D32]" />
                <h3 className="text-lg font-semibold text-[#2E7D32]">ON TRACK</h3>
              </div>
              <div className="text-4xl font-bold text-[#2E7D32]">
                {(totals.obligations || 0) - (totals.overdue || 0) - (totals.due_soon || 0)}
              </div>
            </div>
            <p className="text-sm text-white/80">More than 7 days out</p>
            <Link href="/dashboard/compliance-clocks">
              <Button className="mt-4 w-full bg-[#2E7D32] hover:bg-[#1B5E20]">
                View All Items →
              </Button>
            </Link>
          </div>
        </div>

        {stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 && (
          <div className="bg-white/20 backdrop-blur rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Next Critical Deadline
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold mb-1">
                  {stats.upcoming_deadlines[0].obligations?.title || 'N/A'}
                </p>
                <p className="text-sm text-white/80">
                  {stats.upcoming_deadlines[0].sites?.name || 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {Math.max(0, Math.ceil((new Date(stats.upcoming_deadlines[0].due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                </p>
                <p className="text-sm text-white/80">
                  {new Date(stats.upcoming_deadlines[0].due_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          icon={<Building2 className="h-8 w-8" />}
          title="Sites"
          value={sites.length}
          color="#104B3A"
          link="/dashboard/sites"
          loading={statsLoading}
        />
        <StatCard
          icon={<FileText className="h-8 w-8" />}
          title="Documents"
          value={totals.documents || 0}
          color="#0056A6"
          link="/dashboard/evidence"
          loading={statsLoading}
        />
        <StatCard
          icon={<Package className="h-8 w-8" />}
          title="Audit Packs"
          value={totals.packs || 0}
          color="#104B3A"
          link="/dashboard/packs"
          loading={statsLoading}
        />
        <StatCard
          icon={<Activity className="h-8 w-8" />}
          title="Evidence Items"
          value={totals.evidence || 0}
          color="#0056A6"
          link="/dashboard/evidence"
          loading={statsLoading}
        />
      </div>

      {/* Sites Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#101314] flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Your Sites
          </h2>
          <Link href="/dashboard/sites">
            <Button style={{ backgroundColor: '#104B3A' }}>
              View All Sites <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {sites.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No sites yet</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first site</p>
            <Link href="/dashboard/sites/new">
              <Button style={{ backgroundColor: '#104B3A' }}>
                Add Your First Site
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.slice(0, 6).map((site) => {
              const statusColor = getStatusColor(site.compliance_status, site.compliance_score);
              return (
                <div
                  key={site.id}
                  className="border-2 rounded-lg p-5 hover:shadow-lg transition-all cursor-pointer"
                  style={{ borderColor: statusColor }}
                  onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-lg text-[#101314] flex-1">{site.name}</h3>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColor }} />
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl font-bold" style={{ color: statusColor }}>
                      {site.compliance_score || 0}
                    </span>
                    <span className="text-lg text-gray-500">%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">Overdue</p>
                      <p className="font-bold text-[#C44536]">{site.overdue_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Upcoming</p>
                      <p className="font-bold text-[#D4A017]">{site.upcoming_count || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sites.length > 6 && (
          <div className="text-center mt-6">
            <Link href="/dashboard/sites">
              <Button variant="outline">
                View All {sites.length} Sites
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#101314] mb-4 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Upcoming Deadlines
          </h2>
          {statsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 ? (
            <div className="space-y-3">
              {stats.upcoming_deadlines.slice(0, 5).map((deadline: any) => {
                const daysRemaining = Math.max(0, Math.ceil((new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                const isUrgent = daysRemaining <= 1;
                const isDueSoon = daysRemaining > 1 && daysRemaining <= 7;

                return (
                  <div
                    key={deadline.id}
                    className={`p-4 rounded-lg border-l-4 hover:shadow-md transition-all cursor-pointer ${
                      isUrgent ? 'bg-red-50 border-[#C44536]' :
                      isDueSoon ? 'bg-yellow-50 border-[#D4A017]' :
                      'bg-green-50 border-[#2E7D32]'
                    }`}
                    onClick={() => router.push(`/dashboard/sites/${deadline.site_id}/obligations/${deadline.obligation_id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-[#101314]">
                          {deadline.obligations?.title || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {deadline.sites?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          isUrgent ? 'text-[#C44536]' :
                          isDueSoon ? 'text-[#D4A017]' :
                          'text-[#2E7D32]'
                        }`}>
                          {daysRemaining}d
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(deadline.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Link href="/dashboard/compliance-clocks">
                <Button variant="outline" className="w-full mt-4">
                  View All Deadlines
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-gray-500">No upcoming deadlines</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#101314] mb-4 flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link href="/dashboard/evidence/upload">
              <button className="w-full p-4 rounded-lg bg-[#104B3A] text-white hover:bg-[#0B372A] transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Upload Evidence</p>
                    <p className="text-sm text-white/80">Add compliance documentation</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/dashboard/packs">
              <button className="w-full p-4 rounded-lg bg-[#0056A6] text-white hover:bg-[#004D95] transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-semibold">Generate Audit Pack</p>
                    <p className="text-sm text-white/80">Create regulator-ready packs</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/dashboard/sites">
              <button className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-[#104B3A] hover:bg-gray-50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-[#104B3A]" />
                  <div className="text-left">
                    <p className="font-semibold text-[#101314]">Manage Sites</p>
                    <p className="text-sm text-gray-600">View and edit your sites</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-[#104B3A] group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            <Link href="/dashboard/recurring-tasks">
              <button className="w-full p-4 rounded-lg border-2 border-gray-200 hover:border-[#104B3A] hover:bg-gray-50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#104B3A]" />
                  <div className="text-left">
                    <p className="font-semibold text-[#101314]">Tasks & Actions</p>
                    <p className="text-sm text-gray-600">View all compliance tasks</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-[#104B3A] group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>

          {/* Performance Indicator */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">This Month's Performance</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#2E7D32]">
                {totals.completed_this_month || 0}
              </span>
              <span className="text-sm text-gray-600">obligations completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  color,
  link,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
  link: string;
  loading: boolean;
}) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer"
      onClick={() => router.push(link)}
    >
      <div className="flex items-center justify-between mb-4">
        <div style={{ color }}>{icon}</div>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-4xl font-bold text-[#101314] mb-2">{value.toLocaleString()}</p>
      )}
      <p className="text-sm font-medium text-gray-600">{title}</p>
    </div>
  );
}
