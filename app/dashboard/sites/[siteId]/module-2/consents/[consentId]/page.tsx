'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Parameter {
  parameter_name: string;
  limit_value: number;
  unit: string;
  limit_type: string;
  sampling_frequency: string;
  current_value: number | null;
  current_sample_date: string | null;
  percentage_of_limit: number | null;
  exceeded: boolean;
}

interface Consent {
  id: string;
  site_id: string;
  title: string;
  reference_number: string | null;
  regulator: string | null;
  water_company: string | null;
  status: string;
  extraction_status: string;
  created_at: string;
  parameters: Parameter[];
}

interface ConsentResponse {
  data: Consent;
}

export default function ConsentDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const consentId = params.consentId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-2-consent', consentId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<ConsentResponse>(`/module-2/consents/${consentId}`);
    },
    enabled: !!consentId,
  });

  const consent = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/consents`}>
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

  if (error || !consent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/consents`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Consent Not Found</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-800">Error loading consent details. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/consents`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{consent.title}</h1>
            <p className="text-text-secondary mt-2">Trade Effluent Consent Document</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/new?consent_id=${consent.id}`}>
            <Button variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              Add Lab Result
            </Button>
          </Link>
        </div>
      </div>

      {/* Consent Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Consent Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Title</p>
            <p className="text-lg font-semibold text-text-primary">{consent.title}</p>
          </div>
          {consent.reference_number && (
            <div>
              <p className="text-sm text-text-tertiary mb-1">Reference Number</p>
              <p className="text-lg font-semibold text-text-primary">{consent.reference_number}</p>
            </div>
          )}
          {consent.water_company && (
            <div>
              <p className="text-sm text-text-tertiary mb-1">Water Company</p>
              <p className="text-sm font-medium text-text-primary">{consent.water_company}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-text-tertiary mb-1">Status</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              consent.status === 'ACTIVE' 
                ? 'bg-green-100 text-green-800' 
                : consent.status === 'EXPIRED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {consent.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Extraction Status</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
              consent.extraction_status === 'COMPLETED' 
                ? 'bg-blue-100 text-blue-800' 
                : consent.extraction_status === 'PROCESSING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {consent.extraction_status}
            </span>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Uploaded</p>
            <p className="text-sm font-medium text-text-primary">
              {new Date(consent.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Parameters */}
      {consent.parameters && consent.parameters.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">
              Parameters ({consent.parameters.length})
            </h2>
            <Link href={`/dashboard/sites/${siteId}/module-2/parameters`}>
              <Button variant="ghost" size="sm">
                View All Parameters
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {consent.parameters.map((param: Parameter, index: number) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-text-primary">{param.parameter_name}</h3>
                  {param.exceeded && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Exceeded
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">Current Value</p>
                    <p className={`text-sm font-semibold ${
                      param.exceeded ? 'text-red-600' :
                      param.percentage_of_limit && param.percentage_of_limit >= 80
                        ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {param.current_value !== null 
                        ? `${param.current_value} ${param.unit}`
                        : 'No data'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">Limit</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {param.limit_value} {param.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">% of Limit</p>
                    <p className={`text-sm font-semibold ${
                      param.exceeded ? 'text-red-600' :
                      param.percentage_of_limit && param.percentage_of_limit >= 80
                        ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {param.percentage_of_limit !== null 
                        ? `${param.percentage_of_limit.toFixed(1)}%`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary mb-1">Frequency</p>
                    <p className="text-xs font-medium text-text-primary">{param.sampling_frequency}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {param.percentage_of_limit !== null && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          param.exceeded 
                            ? 'bg-red-600' 
                            : param.percentage_of_limit >= 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(param.percentage_of_limit, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {param.current_sample_date && (
                  <p className="text-xs text-text-tertiary mt-2">
                    Last sample: {new Date(param.current_sample_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results?filter[consent_id]=${consent.id}`}>
          <Button variant="secondary">
            <TrendingUp className="mr-2 h-4 w-4" />
            View Lab Results
          </Button>
        </Link>
        <Link href={`/dashboard/sites/${siteId}/module-2/discharge-volumes?filter[document_id]=${consent.id}`}>
          <Button variant="secondary">
            View Discharge Volumes
          </Button>
        </Link>
      </div>
    </div>
  );
}

