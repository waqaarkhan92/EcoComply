'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Calendar } from 'lucide-react';
import Link from 'next/link';

interface MaintenanceRecord {
  id: string;
  generator_id: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string | null;
  run_hours_at_service: number | null;
  service_provider: string | null;
  service_reference: string | null;
  next_service_due: string | null;
  notes: string | null;
  generators: {
    id: string;
    generator_identifier: string;
    generator_type: string;
  };
  created_at: string;
}

interface MaintenanceRecordsResponse {
  data: MaintenanceRecord[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function MaintenanceRecordsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: recordsData, isLoading, error } = useQuery<MaintenanceRecordsResponse>({
    queryKey: ['module-3-maintenance-records', siteId, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-maintenance_date');

      return apiClient.get<MaintenanceRecordsResponse>(`/module-3/maintenance-records?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const records = recordsData?.data || [];
  const hasMore = recordsData?.pagination?.has_more || false;
  const nextCursor = recordsData?.pagination?.cursor;

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
          <p className="text-red-800">Error loading maintenance records: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Maintenance Records</h1>
          <p className="text-text-secondary mt-2">
            Track generator maintenance and service history
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/maintenance-records/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Maintenance Record
          </Button>
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <Wrench className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Maintenance Records</h3>
          <p className="text-text-secondary mb-4">
            Start tracking generator maintenance by adding your first record.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/maintenance-records/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Maintenance Record
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <Link
              key={record.id}
              href={`/dashboard/sites/${siteId}/module-3/maintenance-records/${record.id}`}
              className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-text-primary">
                      {record.generators?.generator_identifier || 'Unknown Generator'}
                    </h3>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {record.maintenance_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary mb-4">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(record.maintenance_date).toLocaleDateString()}
                    </span>
                  </div>
                  {record.description && (
                    <p className="text-sm text-text-primary mb-4">{record.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {record.service_provider && (
                      <div>
                        <p className="text-sm text-text-tertiary">Service Provider</p>
                        <p className="text-sm font-medium text-text-primary">{record.service_provider}</p>
                      </div>
                    )}
                    {record.service_reference && (
                      <div>
                        <p className="text-sm text-text-tertiary">Reference</p>
                        <p className="text-sm font-medium text-text-primary">{record.service_reference}</p>
                      </div>
                    )}
                    {record.run_hours_at_service !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">Run Hours at Service</p>
                        <p className="text-sm font-medium text-text-primary">
                          {record.run_hours_at_service.toFixed(1)}
                        </p>
                      </div>
                    )}
                    {record.next_service_due && (
                      <div>
                        <p className="text-sm text-text-tertiary">Next Service Due</p>
                        <p className="text-sm font-medium text-text-primary">
                          {new Date(record.next_service_due).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
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

