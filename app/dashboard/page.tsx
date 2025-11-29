'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

interface DashboardStats {
  total_obligations: number;
  overdue_count: number;
  evidence_gaps: number;
  upcoming_deadlines: number;
}

interface Deadline {
  id: string;
  obligation_title: string;
  due_date: string;
  days_remaining: number;
  status: string;
}

export default function DashboardPage() {
  const { company } = useAuthStore();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // TODO: Create dedicated dashboard stats endpoint
      // For now, return mock data
      return {
        total_obligations: 0,
        overdue_count: 0,
        evidence_gaps: 0,
        upcoming_deadlines: 0,
      };
    },
  });

  // Fetch upcoming deadlines
  const { data: deadlines, isLoading: deadlinesLoading } = useQuery<Deadline[]>({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      // TODO: Create dedicated deadlines endpoint
      // For now, return empty array
      return [];
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
          value={stats?.total_obligations || 0}
          loading={statsLoading}
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue_count || 0}
          loading={statsLoading}
          variant="danger"
        />
        <StatCard
          title="Evidence Gaps"
          value={stats?.evidence_gaps || 0}
          loading={statsLoading}
          variant="warning"
        />
        <StatCard
          title="Upcoming Deadlines"
          value={stats?.upcoming_deadlines || 0}
          loading={statsLoading}
        />
      </div>

      {/* Upcoming Deadlines Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Upcoming Deadlines (Next 7 Days)
        </h2>
        {deadlinesLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : deadlines && deadlines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Obligation
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Due Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Days Remaining
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((deadline) => (
                  <tr key={deadline.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-text-primary">
                      {deadline.obligation_title}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {new Date(deadline.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {deadline.days_remaining} days
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={deadline.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            No upcoming deadlines in the next 7 days
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <p className="text-sm font-medium text-text-secondary mb-2">{title}</p>
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

