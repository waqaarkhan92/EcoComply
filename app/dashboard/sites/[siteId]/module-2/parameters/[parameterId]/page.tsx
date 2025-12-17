'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Parameter {
  id: string;
  document_id: string;
  site_id: string;
  parameter_type: string;
  limit_value: number;
  unit: string;
  limit_type: string;
  range_min: number | null;
  range_max: number | null;
  sampling_frequency: string;
  warning_threshold_percent: number;
  confidence_score: number;
  is_active: boolean;
  current_value: number | null;
  current_sample_date: string | null;
  percentage_of_limit: number | null;
  exceeded: boolean;
}

interface ParameterResponse {
  data: Parameter;
}

export default function ParameterDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const parameterId = params.parameterId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-2-parameter', parameterId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<ParameterResponse>(`/module-2/parameters/${parameterId}`);
    },
    enabled: !!parameterId,
  });

  const parameter = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/parameters`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !parameter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/parameters`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Parameter Not Found</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-800">Error loading parameter details. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/parameters`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{parameter.parameter_type}</h1>
          <p className="text-text-secondary mt-2">Parameter Details</p>
        </div>
      </div>

      {/* Status Alert */}
      {parameter.exceeded && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-900 font-semibold">Limit Exceeded</p>
          </div>
          <p className="text-red-800 mt-1">
            Current value ({parameter.current_value} {parameter.unit}) exceeds the limit ({parameter.limit_value} {parameter.unit})
          </p>
        </div>
      )}

      {/* Parameter Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Parameter Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Parameter Type</p>
            <p className="text-lg font-semibold text-text-primary">{parameter.parameter_type}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Limit Value</p>
            <p className="text-lg font-semibold text-text-primary">
              {parameter.limit_value} {parameter.unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Limit Type</p>
            <p className="text-sm font-medium text-text-primary">{parameter.limit_type}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Sampling Frequency</p>
            <p className="text-sm font-medium text-text-primary">{parameter.sampling_frequency}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Warning Threshold</p>
            <p className="text-sm font-medium text-text-primary">{parameter.warning_threshold_percent}%</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Confidence Score</p>
            <p className="text-sm font-medium text-text-primary">
              {(parameter.confidence_score * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {parameter.range_min !== null && parameter.range_max !== null && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-text-tertiary mb-1">Range</p>
            <p className="text-sm font-medium text-text-primary">
              {parameter.range_min} - {parameter.range_max} {parameter.unit}
            </p>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Current Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Current Value</p>
            <p className={`text-2xl font-bold ${
              parameter.exceeded ? 'text-red-600' :
              parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent
                ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {parameter.current_value !== null 
                ? `${parameter.current_value} ${parameter.unit}`
                : 'No data'
              }
            </p>
            {parameter.current_sample_date && (
              <p className="text-xs text-text-tertiary mt-1">
                Last sample: {new Date(parameter.current_sample_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">% of Limit</p>
            <p className={`text-2xl font-bold ${
              parameter.exceeded ? 'text-red-600' :
              parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent
                ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {parameter.percentage_of_limit !== null 
                ? `${parameter.percentage_of_limit.toFixed(1)}%`
                : 'N/A'
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
              parameter.exceeded 
                ? 'bg-red-100 text-red-800' 
                : parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
            }`}>
              {parameter.exceeded ? 'Exceeded' :
               parameter.percentage_of_limit && parameter.percentage_of_limit >= parameter.warning_threshold_percent
                 ? 'Warning' : 'Normal'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {parameter.percentage_of_limit !== null && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
              <span>Limit Progress</span>
              <span>{parameter.percentage_of_limit.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/new?parameter_id=${parameter.id}`}>
          <Button variant="primary">
            <TrendingUp className="mr-2 h-4 w-4" />
            Add Lab Result
          </Button>
        </Link>
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results?filter[parameter_id]=${parameter.id}`}>
          <Button variant="secondary">
            View All Results
          </Button>
        </Link>
      </div>
    </div>
  );
}

