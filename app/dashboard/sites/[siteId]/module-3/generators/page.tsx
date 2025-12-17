'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Plus, Activity } from 'lucide-react';
import Link from 'next/link';

interface Generator {
  id: string;
  document_id: string;
  generator_identifier: string;
  generator_type: string;
  capacity_mw: number;
  fuel_type: string;
  annual_run_hour_limit: number;
  monthly_run_hour_limit: number | null;
  current_year_hours: number;
  current_month_hours: number;
  percentage_of_annual_limit: number;
  percentage_of_monthly_limit: number | null;
  next_stack_test_due: string | null;
  next_service_due: string | null;
  is_active: boolean;
}

interface GeneratorsResponse {
  data: Generator[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function GeneratorsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: generatorsData, isLoading, error } = useQuery({
    queryKey: ['module-3-generators', siteId, cursor],
    queryFn: async (): Promise<any> => {
      // Get site's document IDs first to filter generators
      const params = new URLSearchParams();
      params.append('filter[site_id]', siteId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<GeneratorsResponse>(`/module-3/generators?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const generators: any[] = generatorsData?.data || [];
  const hasMore = generatorsData?.pagination?.has_more || false;
  const nextCursor = generatorsData?.pagination?.cursor;

  const getStatusColor = (generator: Generator): string => {
    if (generator.percentage_of_annual_limit >= 100) return 'text-red-600';
    if (generator.percentage_of_annual_limit >= 90) return 'text-orange-600';
    if (generator.percentage_of_annual_limit >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (generator: Generator): { text: string; color: string } => {
    if (generator.percentage_of_annual_limit >= 100) {
      return { text: 'Limit Exceeded', color: 'bg-red-100 text-red-800' };
    }
    if (generator.percentage_of_annual_limit >= 90) {
      return { text: 'Critical', color: 'bg-orange-100 text-orange-800' };
    }
    if (generator.percentage_of_annual_limit >= 80) {
      return { text: 'Warning', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { text: 'Normal', color: 'bg-green-100 text-green-800' };
  };

  const formatGeneratorType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
          <p className="text-red-800">Error loading generators: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Generators</h1>
          <p className="text-text-secondary mt-2">
            Monitor generator run-hours and compliance status
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/dashboard/sites/${siteId}/module-3/registrations/upload`}>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Upload Registration
            </Button>
          </Link>
        </div>
      </div>

      {generators.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Generators Found</h3>
          <p className="text-text-secondary mb-4">
            Upload an MCPD registration document to get started with generator tracking.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/registrations/upload`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Registration
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {generators.map((generator) => {
            const status = getStatusBadge(generator);
            return (
              <Link
                key={generator.id}
                href={`/dashboard/sites/${siteId}/module-3/generators/${generator.id}`}
                className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-text-primary">
                        {generator.generator_identifier}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-text-tertiary">Type</p>
                        <p className="text-sm font-medium text-text-primary">
                          {formatGeneratorType(generator.generator_type)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Capacity</p>
                        <p className="text-sm font-medium text-text-primary">
                          {generator.capacity_mw} MW
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Annual Hours</p>
                        <p className={`text-sm font-medium ${getStatusColor(generator)}`}>
                          {generator.current_year_hours.toFixed(1)} / {generator.annual_run_hour_limit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Usage</p>
                        <p className={`text-sm font-medium ${getStatusColor(generator)}`}>
                          {generator.percentage_of_annual_limit.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {generator.percentage_of_annual_limit >= 80 && (
                      <div className="mt-4 flex items-center gap-2 text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        <p className="text-sm">
                          {generator.percentage_of_annual_limit >= 100
                            ? 'Annual limit exceeded'
                            : generator.percentage_of_annual_limit >= 90
                            ? 'Approaching annual limit'
                            : 'Warning: 80% of annual limit reached'}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="w-24 h-24 relative">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - generator.percentage_of_annual_limit / 100)}`}
                          className={getStatusColor(generator)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-bold ${getStatusColor(generator)}`}>
                          {generator.percentage_of_annual_limit.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
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

