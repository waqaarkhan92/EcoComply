'use client';

/**
 * Resource Forecast Component
 * Workload and capacity planning visualization
 */

import {
  useWorkloadForecast,
  useCapacityAnalysis,
  WorkloadForecast,
  CapacityAnalysis,
} from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useState } from 'react';

interface ResourceForecastProps {
  siteId?: string;
  weeksAhead?: number;
}

const capacityStatusConfig = {
  UNDER_CAPACITY: { color: 'text-blue-600', bg: 'bg-blue-100', icon: Info, label: 'Under Capacity' },
  OPTIMAL: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Optimal' },
  AT_RISK: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, label: 'At Risk' },
  OVER_CAPACITY: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Over Capacity' },
};

export function ResourceForecast({ siteId, weeksAhead = 4 }: ResourceForecastProps) {
  const [weeks, setWeeks] = useState(weeksAhead);
  const { data: workload, isLoading: workloadLoading } = useWorkloadForecast({ siteId, weeksAhead: weeks });
  const { data: capacity, isLoading: capacityLoading } = useCapacityAnalysis({ weeksAhead: weeks });

  const isLoading = workloadLoading || capacityLoading;

  if (isLoading) {
    return <ResourceForecastSkeleton />;
  }

  if (!workload || !capacity) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Forecast</h3>
        <p className="text-gray-500">Unable to load forecast data</p>
      </div>
    );
  }

  const statusConfig = capacityStatusConfig[capacity.analysis.capacity_status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Capacity Analysis</h3>
          <select
            value={weeks}
            onChange={(e) => setWeeks(parseInt(e.target.value))}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
          >
            <option value={2}>2 Weeks</option>
            <option value={4}>4 Weeks</option>
            <option value={8}>8 Weeks</option>
            <option value={12}>12 Weeks</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Team Size"
            value={capacity.capacity.team_members}
            subtext="active members"
          />
          <StatCard
            icon={Clock}
            label="Total Hours"
            value={capacity.capacity.total_capacity_hours}
            subtext={`${capacity.capacity.hours_per_week}h/week`}
          />
          <StatCard
            icon={Calendar}
            label="Deadlines"
            value={capacity.workload.deadline_count}
            subtext="upcoming"
          />
          <StatCard
            icon={TrendingUp}
            label="Est. Work"
            value={`${capacity.workload.estimated_hours}h`}
            subtext="forecasted"
          />
        </div>

        {/* Utilization gauge */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Utilization Rate</span>
            <span className="text-sm font-bold">{capacity.analysis.utilization_rate}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(capacity.analysis.utilization_rate)}`}
              style={{ width: `${Math.min(capacity.analysis.utilization_rate, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-3 p-4 rounded-lg ${statusConfig.bg}`}>
          <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
          <div>
            <p className={`font-medium ${statusConfig.color}`}>{statusConfig.label}</p>
            <p className="text-sm text-gray-600">
              {capacity.analysis.surplus_hours > 0
                ? `${capacity.analysis.surplus_hours} hours surplus capacity`
                : `${capacity.analysis.deficit_hours} hours over capacity`}
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Workload Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Workload</h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={workload.forecast} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week_start"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatWeekLabel(value)}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<WorkloadTooltip />} />
              <Bar dataKey="estimated_hours" radius={[4, 4, 0, 0]}>
                {workload.forecast.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.estimated_hours, capacity.capacity.hours_per_week)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600">Under capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600">Near capacity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600">Over capacity</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {capacity.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          <ul className="space-y-3">
            {capacity.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="p-1 bg-primary/10 rounded">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: typeof Users;
  label: string;
  value: number | string;
  subtext: string;
}

function StatCard({ icon: Icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  );
}

function WorkloadTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3">
      <p className="text-sm font-medium text-gray-900 mb-2">
        Week of {formatWeekLabel(label)}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Deadlines:</span>
          <span className="font-medium">{data.deadline_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-600">Est. Hours:</span>
          <span className="font-medium">{data.estimated_hours}h</span>
        </div>
      </div>
    </div>
  );
}

function formatWeekLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getUtilizationColor(rate: number): string {
  if (rate < 50) return 'bg-blue-500';
  if (rate < 80) return 'bg-green-500';
  if (rate < 100) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getBarColor(hours: number, weeklyCapacity: number): string {
  const ratio = hours / weeklyCapacity;
  if (ratio < 0.7) return '#22c55e'; // green-500
  if (ratio < 1) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function ResourceForecastSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <Skeleton className="h-6 w-36 mb-6" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default ResourceForecast;
