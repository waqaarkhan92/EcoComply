'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, AlertCircle, CheckCircle2, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ConsultantDashboardPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['consultant-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/consultant/dashboard');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Loading dashboard...</div>
      </div>
    );
  }

  const data = dashboardData || {
    total_clients: 0,
    active_clients: 0,
    total_sites: 0,
    compliance_overview: {
      total_obligations: 0,
      overdue_count: 0,
      approaching_deadline_count: 0,
      avg_compliance_score: 0,
    },
    recent_activity: [],
    upcoming_deadlines: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Consultant Dashboard</h1>
        <p className="text-text-secondary mt-2">
          Overview of all your assigned clients and their compliance status
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Clients</p>
              <p className="text-3xl font-bold text-text-primary mt-2">
                {data.total_clients}
              </p>
            </div>
            <Building2 className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Total Sites</p>
              <p className="text-3xl font-bold text-text-primary mt-2">
                {data.total_sites}
              </p>
            </div>
            <Building2 className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Overdue Obligations</p>
              <p className="text-3xl font-bold text-danger mt-2">
                {data.compliance_overview.overdue_count}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-danger" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Avg Compliance Score</p>
              <p className="text-3xl font-bold text-success mt-2">
                {Math.round(data.compliance_overview.avg_compliance_score * 100)}%
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-success" />
          </div>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Compliance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-text-secondary">Total Obligations</p>
            <p className="text-2xl font-bold text-text-primary mt-2">
              {data.compliance_overview.total_obligations}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Approaching Deadlines</p>
            <p className="text-2xl font-bold text-warning mt-2">
              {data.compliance_overview.approaching_deadline_count}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Average Score</p>
            <p className="text-2xl font-bold text-success mt-2">
              {Math.round(data.compliance_overview.avg_compliance_score * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Recent Activity</h2>
          <Link
            href="/consultant/clients"
            className="text-sm text-primary hover:text-primary-dark"
          >
            View all clients →
          </Link>
        </div>
        {data.recent_activity.length === 0 ? (
          <p className="text-text-secondary">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {data.recent_activity.slice(0, 5).map((activity: any, index: number) => (
              <div key={index} className="flex items-center gap-3 pb-3 border-b border-input-border last:border-0">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {activity.client_name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {activity.activity_description}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Upcoming Deadlines</h2>
        {data.upcoming_deadlines.length === 0 ? (
          <p className="text-text-secondary">No upcoming deadlines</p>
        ) : (
          <div className="space-y-3">
            {data.upcoming_deadlines.slice(0, 10).map((deadline: any, index: number) => (
              <div key={index} className="flex items-center gap-3 pb-3 border-b border-input-border last:border-0">
                <Calendar className="h-5 w-5 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {deadline.obligation_title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {deadline.client_name}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary">
                  {new Date(deadline.deadline_date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-base p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/consultant/clients"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            View All Clients
          </Link>
          <Link
            href="/consultant/packs"
            className="px-4 py-2 bg-background-tertiary text-text-primary rounded-lg hover:bg-background-tertiary/80 transition-colors"
          >
            View All Packs
          </Link>
        </div>
      </div>
    </div>
  );
}

