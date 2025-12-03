'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, TrendingDown, Plus, Upload } from 'lucide-react';
import Link from 'next/link';

interface Parameter {
  id: string;
  document_id: string;
  site_id: string;
  parameter_type: string;
  limit_value: number;
  unit: string;
  limit_type: string;
  sampling_frequency: string;
  warning_threshold_percent: number;
  current_value: number | null;
  percentage_of_limit: number | null;
  exceeded: boolean;
  is_active: boolean;
}

interface ParametersResponse {
  data: Parameter[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

interface Exceedance {
  id: string;
  parameter_id: string;
  site_id: string;
  recorded_value: number;
  limit_value: number;
  percentage_of_limit: number;
  recorded_date: string;
  status: string;
  parameter_type: string;
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

export default function ParametersPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [exceedanceCursor, setExceedanceCursor] = useState<string | undefined>(undefined);

  const { data: parametersData, isLoading: parametersLoading, error: parametersError } = useQuery<ParametersResponse>({
    queryKey: ['module-2-parameters', siteId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<ParametersResponse>(`/module-2/parameters?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const { data: exceedancesData, isLoading: exceedancesLoading } = useQuery<ExceedancesResponse>({
    queryKey: ['module-2-exceedances', siteId, exceedanceCursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (exceedanceCursor) params.append('cursor', exceedanceCursor);
      params.append('limit', '10');
      params.append('sort', '-recorded_date');

      return apiClient.get<ExceedancesResponse>(`/module-2/exceedances?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const parameters = parametersData?.data || [];
  const exceedances = exceedancesData?.data || [];
  const hasMore = parametersData?.pagination?.has_more || false;
  const nextCursor = parametersData?.pagination?.cursor;

  const getStatusColor = (parameter: Parameter): string => {
    if (parameter.exceeded) return 'text-red-600';
    if (parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent) {
      return 'text-yellow-600';
    }
    return 'text-green-600';
  };

  const getStatusBadge = (parameter: Parameter): string => {
    if (parameter.exceeded) return 'Exceeded';
    if (parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent) {
      return 'Warning';
    }
    return 'Normal';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Parameter Tracking</h1>
          <p className="text-text-secondary mt-2">
            Monitor trade effluent parameters and exceedance alerts
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lab Result
            </Link>
          </Button>
          <Button variant="primary" asChild>
            <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/import`}>
              <Upload className="mr-2 h-4 w-4" />
              Import Results
            </Link>
          </Button>
        </div>
      </div>

      {/* Exceedance Alerts */}
      {exceedances.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-red-900">
              {exceedances.length} Active Exceedance{exceedances.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {exceedances.slice(0, 5).map((exceedance) => (
              <div key={exceedance.id} className="bg-white rounded p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-red-900">{exceedance.parameter_type}</span>
                    <span className="text-sm text-red-700 ml-2">
                      {exceedance.recorded_value} {exceedance.parameter_type === 'PH' ? '' : 'mg/l'} 
                      {' '}(Limit: {exceedance.limit_value} {exceedance.parameter_type === 'PH' ? '' : 'mg/l'})
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    exceedance.alert_level === 'CRITICAL' ? 'bg-red-600 text-white' :
                    exceedance.alert_level === 'HIGH' ? 'bg-red-400 text-white' :
                    'bg-yellow-400 text-yellow-900'
                  }`}>
                    {exceedance.alert_level}
                  </span>
                </div>
                <div className="text-sm text-red-700 mt-1">
                  {exceedance.percentage_of_limit.toFixed(1)}% of limit • {new Date(exceedance.recorded_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          {exceedances.length > 5 && (
            <Link 
              href={`/dashboard/sites/${siteId}/module-2/exceedances`}
              className="text-sm text-red-700 hover:text-red-900 font-medium mt-3 inline-block"
            >
              View all {exceedances.length} exceedances →
            </Link>
          )}
        </div>
      )}

      {/* Parameters List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-text-primary">Parameters</h2>
        </div>

        {parametersLoading ? (
          <div className="p-6 text-center text-text-secondary">Loading parameters...</div>
        ) : parametersError ? (
          <div className="p-6 text-center text-red-600">
            Error loading parameters. Please try again.
          </div>
        ) : parameters.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            No parameters found. Upload a consent document to extract parameters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {parameters.map((parameter) => (
              <div key={parameter.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {parameter.parameter_type}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        parameter.exceeded ? 'bg-red-100 text-red-800' :
                        parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent
                          ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                      }`}>
                        {getStatusBadge(parameter)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-text-tertiary">Current Value</p>
                        <p className={`text-lg font-semibold ${getStatusColor(parameter)}`}>
                          {parameter.current_value !== null 
                            ? `${parameter.current_value} ${parameter.unit}`
                            : 'No data'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Limit</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {parameter.limit_value} {parameter.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">% of Limit</p>
                        <p className={`text-lg font-semibold ${getStatusColor(parameter)}`}>
                          {parameter.percentage_of_limit !== null 
                            ? `${parameter.percentage_of_limit.toFixed(1)}%`
                            : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Frequency</p>
                        <p className="text-sm font-medium text-text-primary">
                          {parameter.sampling_frequency}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {parameter.percentage_of_limit !== null && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
                          <span>Limit Progress</span>
                          <span>{parameter.percentage_of_limit.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              parameter.exceeded 
                                ? 'bg-red-600' 
                                : parameter.percentage_of_limit >= parameter.warning_threshold_percent
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(parameter.percentage_of_limit, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Link href={`/dashboard/sites/${siteId}/module-2/parameters/${parameter.id}`}>
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

