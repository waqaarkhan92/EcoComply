'use client';

/**
 * User Activity Report Component
 * Displays user activity metrics and audit trails
 */

import { useUserActivityReport, UserActivityReport as UserActivityReportData } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  User,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useState } from 'react';

interface UserActivityReportProps {
  userId?: string;
  siteId?: string;
  defaultPeriod?: '7d' | '30d' | '90d' | '12m';
  showExport?: boolean;
}

const periodOptions = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12m', label: 'Last 12 Months' },
];

const activityTypeConfig: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  OBLIGATION_COMPLETED: { icon: CheckCircle, color: 'text-green-600', label: 'Obligations Completed' },
  EVIDENCE_UPLOADED: { icon: Upload, color: 'text-blue-600', label: 'Evidence Uploaded' },
  DOCUMENT_CREATED: { icon: FileText, color: 'text-purple-600', label: 'Documents Created' },
  LOGIN: { icon: User, color: 'text-gray-600', label: 'Logins' },
  SETTING_CHANGED: { icon: Activity, color: 'text-orange-600', label: 'Settings Changed' },
};

export function UserActivityReportView({
  userId,
  siteId,
  defaultPeriod = '30d',
  showExport = true,
}: UserActivityReportProps) {
  const [period, setPeriod] = useState(defaultPeriod);
  const { data, isLoading, error } = useUserActivityReport({ userId, siteId, period });

  const handleExport = () => {
    if (!data) return;

    const csvContent = generateCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <UserActivityReportSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">User Activity Report</h3>
        </div>
        <p className="text-gray-500">Unable to load activity report</p>
      </div>
    );
  }

  const activityChartData = Object.entries(data.by_activity_type).map(([type, count]) => ({
    type: activityTypeConfig[type]?.label || type,
    count,
    fill: getActivityColor(type),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">User Activity Report</h3>
              <p className="text-sm text-gray-500">
                {data.user_name} &bull; {data.user_email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="text-sm border border-gray-200 rounded-md px-3 py-2"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {showExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Period Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Calendar className="w-4 h-4" />
          <span>
            {new Date(data.period.start).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            {' - '}
            {new Date(data.period.end).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="Total Actions"
            value={data.totals.total_actions}
            color="text-primary"
          />
          <StatCard
            icon={CheckCircle}
            label="Obligations Completed"
            value={data.totals.obligations_completed}
            color="text-green-600"
          />
          <StatCard
            icon={Upload}
            label="Evidence Uploaded"
            value={data.totals.evidence_uploaded}
            color="text-blue-600"
          />
          <StatCard
            icon={Clock}
            label="Audit Log Entries"
            value={data.totals.audit_log_entries}
            color="text-purple-600"
          />
        </div>
      </div>

      {/* Activity by Type Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h4 className="font-semibold text-gray-900">Activity by Type</h4>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activityChartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey="type"
                type="category"
                tick={{ fontSize: 12 }}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-900">{payload[0].payload.type}</p>
                      <p className="text-sm text-gray-600">
                        {payload[0].value} actions
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          <h4 className="font-semibold text-gray-900">Daily Activity</h4>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.by_day}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || !label) return null;
                  return (
                    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-900">
                        {new Date(label as string).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {payload[0].value} actions
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Type Breakdown */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Activity Breakdown</h4>
        <div className="space-y-3">
          {Object.entries(data.by_activity_type).map(([type, count]) => {
            const config = activityTypeConfig[type];
            const Icon = config?.icon || Activity;
            const percentage = Math.round((count / data.totals.total_actions) * 100);

            return (
              <div key={type} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gray-50`}>
                  <Icon className={`w-4 h-4 ${config?.color || 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {config?.label || type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof Activity;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
    </div>
  );
}

function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    OBLIGATION_COMPLETED: '#22c55e',
    EVIDENCE_UPLOADED: '#3b82f6',
    DOCUMENT_CREATED: '#a855f7',
    LOGIN: '#6b7280',
    SETTING_CHANGED: '#f97316',
  };
  return colors[type] || '#6366f1';
}

function generateCSV(data: UserActivityReportData): string {
  const lines: string[] = [];

  // Header info
  lines.push(`User Activity Report`);
  lines.push(`User,${data.user_name}`);
  lines.push(`Email,${data.user_email}`);
  lines.push(`Period,${data.period.start} to ${data.period.end}`);
  lines.push('');

  // Summary
  lines.push('Summary');
  lines.push(`Total Actions,${data.totals.total_actions}`);
  lines.push(`Obligations Completed,${data.totals.obligations_completed}`);
  lines.push(`Evidence Uploaded,${data.totals.evidence_uploaded}`);
  lines.push(`Audit Log Entries,${data.totals.audit_log_entries}`);
  lines.push('');

  // By Activity Type
  lines.push('Activity Type,Count');
  for (const [type, count] of Object.entries(data.by_activity_type)) {
    lines.push(`${type},${count}`);
  }
  lines.push('');

  // By Day
  lines.push('Date,Actions');
  for (const day of data.by_day) {
    lines.push(`${day.date},${day.count}`);
  }

  return lines.join('\n');
}

function UserActivityReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-40 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton className="h-6 w-36 mb-6" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export { UserActivityReportView as UserActivityReport };
export default UserActivityReportView;
