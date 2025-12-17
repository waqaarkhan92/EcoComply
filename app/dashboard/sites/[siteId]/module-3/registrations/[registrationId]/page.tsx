'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Activity, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Generator {
  id: string;
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
  anniversary_date: string;
  next_stack_test_due: string | null;
  next_service_due: string | null;
}

interface MCPDRegistration {
  id: string;
  site_id: string;
  document_type: string;
  title: string;
  reference_number: string | null;
  status: string;
  extraction_status: string;
  file_url: string | null;
  generators: Generator[];
  created_at: string;
}

export default function MCPDRegistrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const registrationId = params.registrationId as string;

  const { data: registrationData, isLoading, error } = useQuery({
    queryKey: ['module-3-registration', registrationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: MCPDRegistration }>(`/module-3/mcpd-registrations/${registrationId}`);
    },
    enabled: !!registrationId,
  });

  const registration = registrationData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            {error instanceof Error ? error.message : 'Registration not found'}
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
        <Link href={`/dashboard/sites/${siteId}/module-3/registrations`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-text-primary">{registration.title}</h1>
          {registration.reference_number && (
            <p className="text-text-secondary mt-1">Reference: {registration.reference_number}</p>
          )}
        </div>
        {registration.file_url && (
          <a href={registration.file_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              View Document
            </Button>
          </a>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Registration Info */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Registration Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-tertiary">Status</p>
              <p className="text-lg font-medium text-text-primary">{registration.status}</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Extraction Status</p>
              <p className="text-lg font-medium text-text-primary">{registration.extraction_status}</p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary">Uploaded</p>
              <p className="text-lg font-medium text-text-primary">
                {new Date(registration.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Generators Summary */}
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Generators</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-tertiary">Total Generators</p>
              <p className="text-2xl font-bold text-text-primary">
                {registration.generators?.length || 0}
              </p>
            </div>
            {registration.generators && registration.generators.length > 0 && (
              <div>
                <p className="text-sm text-text-tertiary">Active Generators</p>
                <p className="text-lg font-medium text-text-primary">
                  {registration.generators.filter((g: Generator) => g.percentage_of_annual_limit < 100).length} / {registration.generators.length}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generators List */}
      {registration.generators && registration.generators.length > 0 ? (
        <div className="bg-white rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Generator Details</h2>
          <div className="space-y-4">
            {registration.generators.map((generator: Generator) => (
              <Link
                key={generator.id}
                href={`/dashboard/sites/${siteId}/module-3/generators/${generator.id}`}
                className="block border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-text-primary">
                        {generator.generator_identifier}
                      </h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {formatGeneratorType(generator.generator_type)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-text-tertiary">Capacity</p>
                        <p className="text-sm font-medium text-text-primary">
                          {generator.capacity_mw} MW
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Fuel Type</p>
                        <p className="text-sm font-medium text-text-primary">
                          {generator.fuel_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Annual Hours</p>
                        <p className={`text-sm font-medium ${getStatusColor(generator.percentage_of_annual_limit)}`}>
                          {generator.current_year_hours.toFixed(1)} / {generator.annual_run_hour_limit}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-tertiary">Usage</p>
                        <p className={`text-sm font-medium ${getStatusColor(generator.percentage_of_annual_limit)}`}>
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
                    <div className="w-20 h-20 relative">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - generator.percentage_of_annual_limit / 100)}`}
                          className={getStatusColor(generator.percentage_of_annual_limit)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${getStatusColor(generator.percentage_of_annual_limit)}`}>
                          {generator.percentage_of_annual_limit.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Generators Found</h3>
          <p className="text-text-secondary mb-4">
            Generators will appear here once the document extraction is complete.
          </p>
        </div>
      )}
    </div>
  );
}

