'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';

interface AERDocument {
  id: string;
  document_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  submission_deadline: string;
  status: string;
  generator_data: Array<{
    generator_id: string;
    generator_identifier: string;
    generator_type: string;
    run_hours: number;
  }>;
  fuel_consumption_data: any[];
  emissions_data: any[];
  incidents_data: any[];
  total_run_hours: number | null;
  is_validated: boolean;
  validation_errors: any[];
  generated_file_path: string | null;
  download_url: string | null;
  generated_at: string | null;
  submitted_at: string | null;
  submission_reference: string | null;
  notes: string | null;
  documents: {
    id: string;
    site_id: string;
    title: string;
    reference_number: string | null;
  };
  created_at: string;
}

export default function AERDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const aerId = params.aerId as string;

  const { data: aerData, isLoading, error } = useQuery<{ data: AERDocument }>({
    queryKey: ['module-3-aer', aerId],
    queryFn: async () => {
      return apiClient.get<{ data: AERDocument }>(`/module-3/aer/${aerId}`);
    },
    enabled: !!aerId,
  });

  const aer = aerData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !aer) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error instanceof Error ? error.message : 'AER document not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/aer`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary">
            {aer.documents?.title || 'Annual Emissions Report'}
          </h1>
          {aer.documents?.reference_number && (
            <p className="text-text-secondary mt-1">Reference: {aer.documents.reference_number}</p>
          )}
        </div>
        {aer.download_url && (
          <a href={aer.download_url} target="_blank" rel="noopener noreferrer">
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Download AER
            </Button>
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Report Details */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Report Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-tertiary">Status</p>
              <p className="text-lg font-medium text-text-primary">{aer.status}</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Reporting Period</p>
              <p className="text-lg font-medium text-text-primary">
                {new Date(aer.reporting_period_start).toLocaleDateString()} - {new Date(aer.reporting_period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Submission Deadline</p>
              <p className="text-lg font-medium text-text-primary">
                {new Date(aer.submission_deadline).toLocaleDateString()}
              </p>
            </div>
            {aer.total_run_hours !== null && (
              <div>
                <p className="text-sm text-text-tertiary">Total Run Hours</p>
                <p className="text-lg font-medium text-text-primary">
                  {aer.total_run_hours.toFixed(1)} hours
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-text-tertiary">Validation Status</p>
              <p className="text-lg font-medium text-text-primary">
                {aer.is_validated ? (
                  <span className="text-green-600">Validated</span>
                ) : (
                  <span className="text-yellow-600">Not Validated</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Timeline</h2>
          <div className="space-y-4">
            {aer.generated_at && (
              <div>
                <p className="text-sm text-text-tertiary">Generated</p>
                <p className="text-lg font-medium text-text-primary">
                  {new Date(aer.generated_at).toLocaleString()}
                </p>
              </div>
            )}
            {aer.submitted_at && (
              <div>
                <p className="text-sm text-text-tertiary">Submitted</p>
                <p className="text-lg font-medium text-text-primary">
                  {new Date(aer.submitted_at).toLocaleString()}
                </p>
              </div>
            )}
            {aer.submission_reference && (
              <div>
                <p className="text-sm text-text-tertiary">Submission Reference</p>
                <p className="text-lg font-medium text-text-primary">{aer.submission_reference}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generator Data */}
      {aer.generator_data && aer.generator_data.length > 0 && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Generator Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                    Generator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase">
                    Run Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aer.generator_data.map((gen, index) => (
                  <tr key={gen.generator_id || index}>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {gen.generator_identifier}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {gen.generator_type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {gen.run_hours?.toFixed(1) || '0.0'} hours
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {aer.validation_errors && aer.validation_errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">Validation Errors</h2>
          <ul className="list-disc list-inside space-y-2">
            {aer.validation_errors.map((error: any, index: number) => (
              <li key={index} className="text-sm text-red-800">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {aer.notes && (
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Notes</h2>
          <p className="text-sm text-text-primary whitespace-pre-wrap">{aer.notes}</p>
        </div>
      )}
    </div>
  );
}

