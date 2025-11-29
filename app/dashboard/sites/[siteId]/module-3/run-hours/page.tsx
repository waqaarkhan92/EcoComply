'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

interface RunHourRecord {
  id: string;
  generator_id: string;
  recording_date: string;
  hours_recorded: number;
  running_total_year: number;
  running_total_month: number;
  percentage_of_annual_limit: number;
  percentage_of_monthly_limit: number | null;
  entry_method: string;
  notes: string | null;
  generators: {
    id: string;
    generator_identifier: string;
    generator_type: string;
  };
}

interface RunHoursResponse {
  data: RunHourRecord[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function RunHoursPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: runHoursData, isLoading, error } = useQuery<RunHoursResponse>({
    queryKey: ['module-3-run-hours', siteId, cursor],
    queryFn: async () => {
      const params = new URLSearchParams();
      // Note: We'll need to filter by generators that belong to this site
      // For now, we'll fetch all and filter client-side or use a different approach
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-recording_date');

      return apiClient.get<RunHoursResponse>(`/module-3/run-hours?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const runHours = runHoursData?.data || [];
  const hasMore = runHoursData?.pagination?.has_more || false;
  const nextCursor = runHoursData?.pagination?.cursor;

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
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
          <p className="text-red-800">Error loading run hours: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Run Hours</h1>
          <p className="text-text-secondary mt-2">
            Track generator operating hours and monitor compliance
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/run-hours/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Log Run Hours
          </Button>
        </Link>
      </div>

      {runHours.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Run Hour Records</h3>
          <p className="text-text-secondary mb-4">
            Start tracking generator run hours by logging your first entry.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/run-hours/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Log Run Hours
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Generator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Hours Recorded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Running Total (Year)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  % of Annual Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border">
              {runHours.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-text-tertiary mr-2" />
                      <span className="text-sm text-text-primary">
                        {new Date(record.recording_date).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/dashboard/sites/${siteId}/module-3/generators/${record.generator_id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {record.generators?.generator_identifier || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {record.hours_recorded.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {record.running_total_year.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(record.percentage_of_annual_limit)}`}>
                      {record.percentage_of_annual_limit.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {record.entry_method.replace(/_/g, ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

