'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Search, Filter, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

interface ChainBreakAlert {
  id: string;
  consignment_note_id: string | null;
  chain_of_custody_id: string | null;
  alert_type: 'MISSING_EVIDENCE' | 'CONTRACTOR_NON_COMPLIANT' | 'CHAIN_GAP' | 'VALIDATION_FAILURE' | 'EXPIRED_LICENCE';
  alert_severity: 'INFO' | 'WARNING' | 'CRITICAL';
  alert_message: string;
  gap_description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChainBreakAlertsResponse {
  data: ChainBreakAlert[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ChainBreakAlertsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site_id: '',
    alert_type: '',
    alert_severity: '',
    is_resolved: '',
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCursor(undefined);
  }, [searchQuery, filters]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-4-chain-break-alerts', filters, searchQuery, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.alert_type) params.append('alert_type', filters.alert_type);
      if (filters.alert_severity) params.append('alert_severity', filters.alert_severity);
      if (filters.is_resolved !== undefined) params.append('is_resolved', filters.is_resolved);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '20');

      return apiClient.get<ChainBreakAlertsResponse>(`/module-4/chain-break-alerts?${params.toString()}`);
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ alertId, resolutionNotes }: { alertId: string; resolutionNotes?: string }) => {
      return apiClient.post(`/module-4/chain-break-alerts/${alertId}/resolve`, {
        resolution_notes: resolutionNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-4-chain-break-alerts'] });
    },
  });

  const alerts: any[] = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const unresolvedAlerts = alerts.filter((a) => !a.is_resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.alert_severity === 'CRITICAL');
  const warningAlerts = unresolvedAlerts.filter((a) => a.alert_severity === 'WARNING');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Chain Break Alerts</h1>
        <p className="text-text-secondary mt-2">
          Monitor and resolve chain of custody breaks and compliance issues
        </p>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Critical Alerts</p>
              <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Warning Alerts</p>
              <p className="text-2xl font-bold text-amber-600">{warningAlerts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Info className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Unresolved</p>
              <p className="text-2xl font-bold text-gray-600">{unresolvedAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Alert Type</label>
            <select
              value={filters.alert_type}
              onChange={(e) => setFilters({ ...filters, alert_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="MISSING_EVIDENCE">Missing Evidence</option>
              <option value="CONTRACTOR_NON_COMPLIANT">Contractor Non-Compliant</option>
              <option value="CHAIN_GAP">Chain Gap</option>
              <option value="VALIDATION_FAILURE">Validation Failure</option>
              <option value="EXPIRED_LICENCE">Expired Licence</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Severity</label>
            <select
              value={filters.alert_severity}
              onChange={(e) => setFilters({ ...filters, alert_severity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={filters.is_resolved}
              onChange={(e) => setFilters({ ...filters, is_resolved: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Site</label>
            <select
              value={filters.site_id}
              onChange={(e) => setFilters({ ...filters, site_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sites</option>
              {/* TODO: Fetch sites from API */}
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading alerts...</div>
        ) : error ? (
          <div className="text-center py-12 text-danger">
            Error loading alerts. Please try again.
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">No chain break alerts found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Alert
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Severity
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Status
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                      Created
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {alerts.map((alert, index) => (
                    <tr
                      key={alert.id}
                      className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-sm text-gray-900">{alert.alert_message}</div>
                          {alert.gap_description && (
                            <div className="text-xs text-gray-500 mt-1">{alert.gap_description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {alert.alert_type.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <SeverityBadge severity={alert.alert_severity} />
                      </td>
                      <td className="py-4 px-6">
                        {alert.is_resolved ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            Unresolved
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-600">
                          {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {!alert.is_resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Mark this alert as resolved?')) {
                                resolveMutation.mutate({ alertId: alert.id });
                              }
                            }}
                            disabled={resolveMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                        {alert.consignment_note_id && (
                          <Link
                            href={`/dashboard/module-4/consignment-notes/${alert.consignment_note_id}`}
                            className="ml-2 text-sm text-primary hover:underline"
                          >
                            View Note
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => nextCursor && setCursor(nextCursor)}
                  disabled={!nextCursor}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    CRITICAL: {
      label: 'Critical',
      className: 'bg-red-50 text-red-700 border border-red-200',
      icon: AlertTriangle,
    },
    WARNING: {
      label: 'Warning',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
      icon: AlertCircle,
    },
    INFO: {
      label: 'Info',
      className: 'bg-blue-50 text-blue-700 border border-blue-200',
      icon: Info,
    },
  };

  const badgeConfig = config[severity as keyof typeof config] || {
    label: severity,
    className: 'bg-gray-50 text-gray-800 border border-gray-200',
    icon: Info,
  };

  const Icon = badgeConfig.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeConfig.className}`}>
      <Icon className="w-3.5 h-3.5 mr-1.5" />
      {badgeConfig.label}
    </span>
  );
}

