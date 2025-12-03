'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Exceedance {
  id: string;
  parameter_id: string;
  lab_result_id: string;
  site_id: string;
  recorded_value: number;
  limit_value: number;
  percentage_of_limit: number;
  recorded_date: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolution_notes: string | null;
  resolved_at: string | null;
  corrective_action: string | null;
  notified_water_company: boolean;
  notification_date: string | null;
  parameter_type: string;
  parameter_unit: string;
  alert_level: 'WARNING' | 'HIGH' | 'CRITICAL';
}

interface ExceedancesResponse {
  data: Exceedance[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function ExceedancesPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState({
    parameter_id: '',
    status: '',
    threshold: '',
    date_from: '',
    date_to: '',
  });

  const { data, isLoading, error } = useQuery<ExceedancesResponse>({
    queryKey: ['module-2-exceedances', siteId, filters, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (filters.parameter_id) params.append('filter[parameter_id]', filters.parameter_id);
      if (filters.status) params.append('filter[status]', filters.status);
      if (filters.threshold) params.append('filter[threshold]', filters.threshold);
      if (filters.date_from) params.append('filter[recorded_date[gte]]', filters.date_from);
      if (filters.date_to) params.append('filter[recorded_date[lte]]', filters.date_to);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-recorded_date');

      return apiClient.get<ExceedancesResponse>(`/module-2/exceedances?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const exceedances = data?.data || [];
  const hasMore = data?.pagination?.has_more || false;
  const nextCursor = data?.pagination?.cursor;

  const getAlertLevelColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-red-400 text-white';
      case 'WARNING':
        return 'bg-yellow-400 text-yellow-900';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'CLOSED':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Exceedance Alerts</h1>
          <p className="text-text-secondary mt-2">
            Monitor and manage parameter limit exceedances
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-text-tertiary" />
          <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Parameter
            </label>
            <input
              type="text"
              placeholder="Filter by parameter..."
              value={filters.parameter_id}
              onChange={(e) => setFilters({ ...filters, parameter_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Threshold
            </label>
            <select
              value={filters.threshold}
              onChange={(e) => setFilters({ ...filters, threshold: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="80">≥80%</option>
              <option value="90">≥90%</option>
              <option value="100">≥100%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Exceedances List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">
            {exceedances.length} Exceedance{alterances.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-text-secondary">Loading exceedances...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-600">
            Error loading exceedances. Please try again.
          </div>
        ) : exceedances.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No exceedances found. All parameters are within limits.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exceedances.map((exceedance) => (
              <div 
                key={exceedance.id} 
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  exceedance.status === 'OPEN' ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertTriangle className={`h-6 w-6 ${
                        exceedance.alert_level === 'CRITICAL' ? 'text-red-600' :
                        exceedance.alert_level === 'HIGH' ? 'text-red-500' :
                        'text-yellow-600'
                      }`} />
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                          {exceedance.parameter_type} Exceedance
                        </h3>
                        <p className="text-sm text-text-tertiary">
                          {new Date(exceedance.recorded_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getAlertLevelColor(exceedance.alert_level)}`}>
                        {exceedance.alert_level}
                      </span>
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(exceedance.status)}`}>
                        {exceedance.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-text-tertiary">Recorded Value</p>
                        <p className="text-lg font-semibold text-red-600">
                          {exceedance.recorded_value} {exceedance.parameter_unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Limit</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {exceedance.limit_value} {exceedance.parameter_unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">% Over Limit</p>
                        <p className="text-lg font-semibold text-red-600">
                          {exceedance.percentage_of_limit.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Status</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(exceedance.status)}
                          <span className="text-sm font-medium text-text-primary">
                            {exceedance.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {exceedance.corrective_action && (
                      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Corrective Action:</p>
                        <p className="text-sm text-blue-800">{exceedance.corrective_action}</p>
                      </div>
                    )}

                    {exceedance.resolution_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm font-medium text-gray-900 mb-1">Resolution Notes:</p>
                        <p className="text-sm text-gray-700">{exceedance.resolution_notes}</p>
                        {exceedance.resolved_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Resolved: {new Date(exceedance.resolved_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}

                    {exceedance.notified_water_company && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-text-tertiary">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Water company notified</span>
                        {exceedance.notification_date && (
                          <span className="text-xs">
                            ({new Date(exceedance.notification_date).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Link href={`/dashboard/sites/${siteId}/module-2/exceedances/${exceedance.id}`}>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <Button
              variant="secondary"
              onClick={() => setCursor(nextCursor)}
              disabled={!nextCursor}
            >
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

