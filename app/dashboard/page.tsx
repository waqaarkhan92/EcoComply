'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

interface DashboardStats {
  totals: {
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

export default function DashboardPage() {
  const { company } = useAuthStore();

  // Fetch dashboard stats (real data from API)
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<any> => {
      const response = await fetch('/api/v1/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();
      return result.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-2">
          Welcome back, {company?.name || 'User'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Obligations"
          value={stats?.totals.obligations || 0}
          loading={statsLoading}
        />
        <StatCard
          title="Overdue"
          value={stats?.totals.overdue || 0}
          loading={statsLoading}
          variant="danger"
        />
        <StatCard
          title="Due Soon (7 days)"
          value={stats?.totals.due_soon || 0}
          loading={statsLoading}
          variant="warning"
        />
        <StatCard
          title="Completed This Month"
          value={stats?.totals.completed_this_month || 0}
          loading={statsLoading}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Documents"
          value={stats?.totals.documents || 0}
          loading={statsLoading}
        />
        <StatCard
          title="Evidence Items"
          value={stats?.totals.evidence || 0}
          loading={statsLoading}
        />
        <StatCard
          title="Audit Packs"
          value={stats?.totals.packs || 0}
          loading={statsLoading}
        />
      </div>

      {/* Upcoming Deadlines Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Upcoming Deadlines (Next 10)
        </h2>
        {statsLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : stats?.upcoming_deadlines && stats.upcoming_deadlines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Obligation
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Site
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Due Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.upcoming_deadlines.map((deadline: any) => (
                  <tr key={deadline.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {deadline.obligations?.title || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {deadline.sites?.site_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {new Date(deadline.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800">
                        {deadline.obligations?.category || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            No upcoming deadlines
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Quick Actions
        </h2>
        <div className="flex gap-4">
          <a
            href="/dashboard/documents/upload"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Upload Document
          </a>
          <a
            href="/dashboard/evidence/upload"
            className="px-4 py-2 bg-background-secondary text-text-primary border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Add Evidence
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
  variant = 'default',
}: {
  title: string;
  value: number;
  loading: boolean;
  variant?: 'default' | 'danger' | 'warning';
}) {
  const variantColors = {
    default: 'text-text-primary',
    danger: 'text-danger',
    warning: 'text-warning',
  };

  return (
    <div className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-all duration-200 p-8">
      <p className="text-sm font-medium text-text-secondary mb-3">{title}</p>
      {loading ? (
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className={`text-3xl font-bold ${variantColors[variant]}`}>
          {value.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    DUE_SOON: { label: 'Due Soon', className: 'bg-warning/20 text-warning' },
    OVERDUE: { label: 'Overdue', className: 'bg-danger/20 text-danger' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${config.className}`}>
      {config.label}
    </span>
  );
}

