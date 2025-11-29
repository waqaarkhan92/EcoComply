'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, Calendar, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Generator {
  id: string;
  document_id: string;
  generator_identifier: string;
  generator_type: string;
  capacity_mw: number;
  fuel_type: string;
  location_description: string | null;
  annual_run_hour_limit: number;
  monthly_run_hour_limit: number | null;
  anniversary_date: string;
  current_year_hours: number;
  current_month_hours: number;
  percentage_of_annual_limit: number;
  percentage_of_monthly_limit: number | null;
  next_stack_test_due: string | null;
  next_service_due: string | null;
  recent_run_hour_records: Array<{
    id: string;
    recording_date: string;
    hours_recorded: number;
    running_total_year: number;
    percentage_of_annual_limit: number;
  }>;
}

export default function GeneratorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const generatorId = params.generatorId as string;

  const { data: generatorData, isLoading, error } = useQuery<{ data: Generator }>({
    queryKey: ['module-3-generator', generatorId],
    queryFn: async () => {
      return apiClient.get<{ data: Generator }>(`/module-3/generators/${generatorId}`);
    },
    enabled: !!generatorId,
  });

  const generator = generatorData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !generator) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error instanceof Error ? error.message : 'Generator not found'}
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (percentage: number): string => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 90) return 'text-orange-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatGeneratorType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-3/generators`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary">{generator.generator_identifier}</h1>
          <p className="text-text-secondary mt-1">{formatGeneratorType(generator.generator_type)}</p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/run-hours/new?generator_id=${generator.id}`}>
          <Button>
            <Activity className="w-4 h-4 mr-2" />
            Log Run Hours
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Overview Card */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Overview</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-tertiary">Capacity</p>
              <p className="text-lg font-medium text-text-primary">{generator.capacity_mw} MW</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Fuel Type</p>
              <p className="text-lg font-medium text-text-primary">{generator.fuel_type}</p>
            </div>
            {generator.location_description && (
              <div>
                <p className="text-sm text-text-tertiary">Location</p>
                <p className="text-lg font-medium text-text-primary">{generator.location_description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-text-tertiary">Anniversary Date</p>
              <p className="text-lg font-medium text-text-primary">
                {new Date(generator.anniversary_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Run Hours Card */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Run Hours</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-text-tertiary">Annual Limit</p>
                <p className={`text-lg font-bold ${getStatusColor(generator.percentage_of_annual_limit)}`}>
                  {generator.percentage_of_annual_limit.toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    generator.percentage_of_annual_limit >= 100
                      ? 'bg-red-600'
                      : generator.percentage_of_annual_limit >= 90
                      ? 'bg-orange-600'
                      : generator.percentage_of_annual_limit >= 80
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(generator.percentage_of_annual_limit, 100)}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {generator.current_year_hours.toFixed(1)} / {generator.annual_run_hour_limit} hours
              </p>
            </div>
            {generator.monthly_run_hour_limit && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-text-tertiary">Monthly Limit</p>
                  {generator.percentage_of_monthly_limit && (
                    <p className={`text-lg font-bold ${getStatusColor(generator.percentage_of_monthly_limit)}`}>
                      {generator.percentage_of_monthly_limit.toFixed(1)}%
                    </p>
                  )}
                </div>
                {generator.percentage_of_monthly_limit && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          generator.percentage_of_monthly_limit >= 100
                            ? 'bg-red-600'
                            : generator.percentage_of_monthly_limit >= 90
                            ? 'bg-orange-600'
                            : generator.percentage_of_monthly_limit >= 80
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${Math.min(generator.percentage_of_monthly_limit, 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {generator.current_month_hours.toFixed(1)} / {generator.monthly_run_hour_limit} hours
                    </p>
                  </>
                )}
              </div>
            )}
            {generator.percentage_of_annual_limit >= 80 && (
              <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm">
                  {generator.percentage_of_annual_limit >= 100
                    ? 'Annual limit exceeded - immediate action required'
                    : generator.percentage_of_annual_limit >= 90
                    ? 'Approaching annual limit - monitor closely'
                    : 'Warning: 80% of annual limit reached'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Upcoming Tasks</h2>
          <div className="space-y-3">
            {generator.next_stack_test_due && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-text-tertiary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Stack Test Due</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(generator.next_stack_test_due).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {generator.next_service_due && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-text-tertiary" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Service Due</p>
                  <p className="text-sm text-text-secondary">
                    {new Date(generator.next_service_due).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {!generator.next_stack_test_due && !generator.next_service_due && (
              <p className="text-sm text-text-tertiary">No upcoming tasks</p>
            )}
          </div>
        </div>

        {/* Recent Run Hours */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Run Hours</h2>
          {generator.recent_run_hour_records && generator.recent_run_hour_records.length > 0 ? (
            <div className="space-y-3">
              {generator.recent_run_hour_records.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {new Date(record.recording_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {record.hours_recorded} hours recorded
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {record.running_total_year.toFixed(1)} total
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {record.percentage_of_annual_limit.toFixed(1)}% of limit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No run-hour records yet</p>
          )}
          <Link href={`/dashboard/sites/${siteId}/module-3/run-hours?filter[generator_id]=${generator.id}`}>
            <Button variant="outline" className="w-full mt-4">
              View All Run Hours
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

