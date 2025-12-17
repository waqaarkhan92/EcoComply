'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface LabResult {
  id: string;
  consent_id: string;
  sample_date: string;
  parameters: Array<{
    parameter_name: string;
    value: number;
    limit: number;
  }>;
  created_at: string;
}

interface LabResultResponse {
  data: LabResult;
}

export default function LabResultDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const resultId = params.resultId as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['module-2-lab-result', resultId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<LabResultResponse>(`/module-2/lab-results/${resultId}`);
    },
    enabled: !!resultId,
  });

  const labResult = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
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

  if (error || !labResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Lab Result Not Found</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-800">Error loading lab result details. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Lab Result Details</h1>
          <p className="text-text-secondary mt-2">
            Sample Date: {new Date(labResult.sample_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Lab Result Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Result Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Sample Date</p>
            <p className="text-lg font-semibold text-text-primary">
              {new Date(labResult.sample_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Recorded</p>
            <p className="text-sm font-medium text-text-primary">
              {new Date(labResult.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Parameters */}
        {labResult.parameters && labResult.parameters.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Parameters</h3>
            <div className="space-y-4">
              {labResult.parameters.map((param: { parameter_name: string; value: number; limit: number }, index: number) => {
                const exceeded = param.value > param.limit;
                const percentage = (param.value / param.limit) * 100;
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-text-primary">{param.parameter_name}</h4>
                      {exceeded && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          Exceeded
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">Value</p>
                        <p className={`text-sm font-semibold ${exceeded ? 'text-red-600' : 'text-text-primary'}`}>
                          {param.value}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">Limit</p>
                        <p className="text-sm font-semibold text-text-primary">{param.limit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">% of Limit</p>
                        <p className={`text-sm font-semibold ${exceeded ? 'text-red-600' : 'text-text-primary'}`}>
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {exceeded && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Value exceeds limit by {((percentage - 100) * param.limit / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {labResult.consent_id && (
          <Link href={`/dashboard/sites/${siteId}/module-2/consents/${labResult.consent_id}`}>
            <Button variant="secondary">
              <FileText className="mr-2 h-4 w-4" />
              View Consent
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

