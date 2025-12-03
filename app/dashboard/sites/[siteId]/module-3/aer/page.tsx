'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Download, Calendar } from 'lucide-react';
import Link from 'next/link';

interface AERDocument {
  id: string;
  document_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  submission_deadline: string;
  status: string;
  total_run_hours: number | null;
  is_validated: boolean;
  generated_file_path: string | null;
  generated_at: string | null;
  submitted_at: string | null;
  documents: {
    id: string;
    site_id: string;
    title: string;
    reference_number: string | null;
  };
  created_at: string;
}

interface AERResponse {
  data: AERDocument[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function AERPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: aerData, isLoading, error } = useQuery<AERResponse>({
    queryKey: ['module-3-aer', siteId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-created_at');

      return apiClient.get<AERResponse>(`/module-3/aer?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const aerDocuments = aerData?.data || [];
  const hasMore = aerData?.pagination?.has_more || false;
  const nextCursor = aerData?.pagination?.cursor;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-green-100 text-green-800';
      case 'READY':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading AER documents: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Annual Emissions Reports (AER)</h1>
          <p className="text-text-secondary mt-2">
            Generate and manage Annual Emissions Reports for MCPD registrations
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/aer/generate`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Generate AER
          </Button>
        </Link>
      </div>

      {aerDocuments.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No AER Documents</h3>
          <p className="text-text-secondary mb-4">
            Generate your first Annual Emissions Report to get started.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/aer/generate`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate AER
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {aerDocuments.map((aer) => (
            <div
              key={aer.id}
              className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-text-primary">
                      {aer.documents?.title || 'AER Document'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(aer.status)}`}>
                      {aer.status}
                    </span>
                    {aer.is_validated && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Validated
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <div>
                        <p className="text-sm text-text-tertiary">Reporting Period</p>
                        <p className="text-sm font-medium text-text-primary">
                          {new Date(aer.reporting_period_start).toLocaleDateString()} - {new Date(aer.reporting_period_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Submission Deadline</p>
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(aer.submission_deadline).toLocaleDateString()}
                      </p>
                    </div>
                    {aer.total_run_hours !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">Total Run Hours</p>
                        <p className="text-sm font-medium text-text-primary">
                          {aer.total_run_hours.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                  {aer.generated_at && (
                    <p className="text-sm text-text-tertiary mt-2">
                      Generated: {new Date(aer.generated_at).toLocaleDateString()}
                    </p>
                  )}
                  {aer.submitted_at && (
                    <p className="text-sm text-text-tertiary mt-2">
                      Submitted: {new Date(aer.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  {aer.generated_file_path && (
                    <Link href={`/dashboard/sites/${siteId}/module-3/aer/${aer.id}`}>
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setCursor(nextCursor)}
            disabled={!nextCursor}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

