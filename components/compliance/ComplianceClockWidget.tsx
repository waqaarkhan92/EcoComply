'use client';

/**
 * Compliance Clock Widget Component
 * Displays countdown to compliance deadlines with color coding
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ComplianceClock {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  days_remaining: number;
  is_overdue: boolean;
  is_critical: boolean;
  is_warning: boolean;
  sites?: { site_name: string };
  modules?: { module_name: string };
}

interface ComplianceClockWidgetProps {
  siteId?: string;
  moduleId?: string;
  limit?: number;
  showAll?: boolean;
}

export function ComplianceClockWidget({
  siteId,
  moduleId,
  limit = 5,
  showAll = false
}: ComplianceClockWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-clocks', siteId, moduleId, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.append('site_id', siteId);
      if (moduleId) params.append('module_id', moduleId);
      params.append('limit', limit.toString());
      const queryString = params.toString();
      const response = await apiClient.get('/compliance-clocks?' + queryString);
      return response as {
        data: ComplianceClock[];
        summary: {
          total: number;
          overdue: number;
          critical: number;
          warning: number;
          completed: number;
        };
      };
    },
    refetchInterval: 60000,
  });

  const clocks: any[] = data?.data || [];
  const summary = data?.summary;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading compliance clocks...</div>
      </div>
    );
  }

  if (clocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Clocks</h2>
        </div>
        <div className="text-center py-8">
          <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No active compliance clocks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Compliance Clocks</h2>
        {showAll && (
          <Link href="/dashboard/compliance-clocks" className="text-sm text-primary hover:text-primary-dark flex items-center">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-2xl font-bold text-red-700">{summary.overdue}</div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{summary.critical}</div>
            <div className="text-xs text-orange-600">Critical</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{summary.warning}</div>
            <div className="text-xs text-yellow-600">Warning</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-2xl font-bold text-green-700">{summary.completed}</div>
            <div className="text-xs text-green-600">Completed</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clocks.map((clock) => (
          <ComplianceClockItem key={clock.id} clock={clock} />
        ))}
      </div>
    </div>
  );
}

function ComplianceClockItem({ clock }: { clock: ComplianceClock }) {
  const getColor = () => {
    if (clock.is_overdue) return 'border-red-500 bg-red-50';
    if (clock.is_critical) return 'border-orange-500 bg-orange-50';
    if (clock.is_warning) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  const getTextColor = () => {
    if (clock.is_overdue) return 'text-red-700';
    if (clock.is_critical) return 'text-orange-700';
    if (clock.is_warning) return 'text-yellow-700';
    return 'text-green-700';
  };

  const getIcon = () => {
    if (clock.is_overdue) return <XCircle className="h-5 w-5 text-red-600" />;
    if (clock.is_critical) return <AlertCircle className="h-5 w-5 text-orange-600" />;
    if (clock.is_warning) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  const getDaysText = () => {
    const days = Math.abs(clock.days_remaining);
    if (clock.is_overdue) {
      return days + ' day' + (days !== 1 ? 's' : '') + ' overdue';
    }
    if (days === 0) {
      return 'Due today';
    }
    return days + ' day' + (days !== 1 ? 's' : '') + ' left';
  };

  return (
    <div className={'border-l-4 ' + getColor() + ' rounded-r-lg p-4 transition-all hover:shadow-md'}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-1">
              {clock.title}
            </div>
            {clock.description && (
              <div className="text-sm text-gray-600 mb-2">
                {clock.description}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {clock.sites?.site_name && (
                <span>Site: {clock.sites.site_name}</span>
              )}
              {clock.modules?.module_name && (
                <span>Module: {clock.modules.module_name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right ml-4">
          <div className={'text-2xl font-bold ' + getTextColor()}>
            {Math.abs(clock.days_remaining)}
          </div>
          <div className={'text-xs font-medium ' + getTextColor()}>
            {getDaysText()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(clock.target_date).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
