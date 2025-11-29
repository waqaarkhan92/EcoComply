'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Upload } from 'lucide-react';
import Link from 'next/link';

interface MCPDRegistration {
  id: string;
  site_id: string;
  document_type: string;
  title: string;
  reference_number: string | null;
  status: string;
  extraction_status: string;
  generators: Array<{
    id: string;
    generator_identifier: string;
    generator_type: string;
  }>;
  created_at: string;
}

interface RegistrationsResponse {
  data: MCPDRegistration[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function MCPDRegistrationsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: registrationsData, isLoading, error } = useQuery<RegistrationsResponse>({
    queryKey: ['module-3-registrations', siteId, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<RegistrationsResponse>(`/module-3/mcpd-registrations?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const registrations = registrationsData?.data || [];
  const hasMore = registrationsData?.pagination?.has_more || false;
  const nextCursor = registrationsData?.pagination?.cursor;

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
          <p className="text-red-800">Error loading registrations: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">MCPD Registrations</h1>
          <p className="text-text-secondary mt-2">
            Manage your MCPD registration documents and generators
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/registrations/upload`}>
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Registration
          </Button>
        </Link>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No MCPD Registrations</h3>
          <p className="text-text-secondary mb-4">
            Upload an MCPD registration document to start tracking generators.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/registrations/upload`}>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Registration
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {registrations.map((registration) => (
            <Link
              key={registration.id}
              href={`/dashboard/sites/${siteId}/module-3/registrations/${registration.id}`}
              className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-text-primary">
                      {registration.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      registration.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      registration.status === 'UPLOADED' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {registration.status}
                    </span>
                  </div>
                  {registration.reference_number && (
                    <p className="text-sm text-text-secondary mb-2">
                      Reference: {registration.reference_number}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <div>
                      <p className="text-sm text-text-tertiary">Generators</p>
                      <p className="text-sm font-medium text-text-primary">
                        {registration.generators?.length || 0} generator(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-text-tertiary">Uploaded</p>
                      <p className="text-sm font-medium text-text-primary">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {registration.generators && registration.generators.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-text-tertiary mb-2">Generators:</p>
                      <div className="flex flex-wrap gap-2">
                        {registration.generators.map((gen) => (
                          <span
                            key={gen.id}
                            className="px-2 py-1 bg-gray-100 rounded text-xs text-text-secondary"
                          >
                            {gen.generator_identifier}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
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

