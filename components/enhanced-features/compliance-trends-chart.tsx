'use client';

/**
 * Compliance Trends Chart
 * Visualize compliance score and metrics over time
 */

import { useComplianceTrends, useRiskScoreTrends } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface ComplianceTrendsChartProps {
  siteId?: string;
  defaultPeriod?: string;
  showRiskScore?: boolean;
  height?: number;
}

const periodOptions = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '12m', label: '12 Months' },
];

const chartColors = {
  complianceScore: '#104B3A',
  riskScore: '#C44536',
  obligationsCompliant: '#2E7D32',
  obligationsTotal: '#94B49F',
};

export function ComplianceTrendsChart({
  siteId,
  defaultPeriod = '30d',
  showRiskScore = true,
  height = 300,
}: ComplianceTrendsChartProps) {
  const [period, setPeriod] = useState(defaultPeriod);
  const { data: complianceData, isLoading: complianceLoading } = useComplianceTrends({ siteId, period });
  const { data: riskData, isLoading: riskLoading } = useRiskScoreTrends(siteId, period);

  const isLoading = complianceLoading || (showRiskScore && riskLoading);

  if (isLoading) {
    return <TrendsChartSkeleton height={height} />;
  }

  const trends = complianceData?.trends || [];

  if (trends.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Trends</h3>
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No trend data available</p>
          <p className="text-sm text-gray-400 mt-1">Data will appear as compliance activities are tracked</p>
        </div>
      </div>
    );
  }

  // Merge risk scores with compliance data
  const chartData = trends.map((item, index) => ({
    date: formatDateForChart(item.date, period),
    complianceScore: item.score,
    obligationsCompliant: item.obligations_compliant,
    obligationsTotal: item.obligations_total,
    riskScore: riskData?.trends?.[index]?.score || null,
  }));

  // Calculate trend direction
  const firstScore = trends[0]?.score || 0;
  const lastScore = trends[trends.length - 1]?.score || 0;
  const scoreDiff = lastScore - firstScore;
  const trendDirection = scoreDiff > 2 ? 'up' : scoreDiff < -2 ? 'down' : 'stable';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Compliance Trends</h3>
          <div className="flex items-center gap-2 mt-1">
            <TrendIndicator direction={trendDirection} value={Math.abs(scoreDiff)} />
          </div>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
        >
          {periodOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.complianceScore} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColors.complianceScore} stopOpacity={0} />
              </linearGradient>
              {showRiskScore && (
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.riskScore} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.riskScore} stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            <Area
              type="monotone"
              dataKey="complianceScore"
              name="Compliance Score"
              stroke={chartColors.complianceScore}
              fill="url(#complianceGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />

            {showRiskScore && (
              <Area
                type="monotone"
                dataKey="riskScore"
                name="Risk Score"
                stroke={chartColors.riskScore}
                fill="url(#riskGradient)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
        <Stat label="Current Score" value={`${lastScore}%`} />
        <Stat label="Period Average" value={`${calculateAverage(trends.map(t => t.score))}%`} />
        <Stat label="Peak Score" value={`${Math.max(...trends.map(t => t.score))}%`} />
      </div>
    </div>
  );
}

function TrendIndicator({ direction, value }: { direction: 'up' | 'down' | 'stable'; value: number }) {
  if (direction === 'stable') {
    return (
      <span className="text-sm text-gray-500 flex items-center gap-1">
        <Minus className="w-4 h-4" /> Stable
      </span>
    );
  }

  const isPositive = direction === 'up';
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <span className={`text-sm flex items-center gap-1 ${color}`}>
      <Icon className="w-4 h-4" />
      {isPositive ? '+' : '-'}{value.toFixed(1)} pts over period
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-3">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
}

function formatDateForChart(dateStr: string, period: string): string {
  const date = new Date(dateStr);
  if (period === '7d' || period === '30d') {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function TrendsChartSkeleton({ height }: { height: number }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="w-full" style={{ height }} />
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ComplianceTrendsChart;
