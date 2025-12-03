'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Plus, FlaskConical, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface StackTest {
  id: string;
  generator_id: string;
  test_date: string;
  test_company: string | null;
  test_reference: string | null;
  nox_result: number | null;
  so2_result: number | null;
  co_result: number | null;
  particulates_result: number | null;
  compliance_status: string;
  exceedances_found: boolean;
  exceedance_details: string | null;
  next_test_due: string | null;
  notes: string | null;
  generators: {
    id: string;
    generator_identifier: string;
    generator_type: string;
  };
  created_at: string;
}

interface StackTestsResponse {
  data: StackTest[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function StackTestsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: stackTestsData, isLoading, error } = useQuery<StackTestsResponse>({
    queryKey: ['module-3-stack-tests', siteId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');
      params.append('sort', '-test_date');

      return apiClient.get<StackTestsResponse>(`/module-3/stack-tests?${params.toString()}`);
    },
    enabled: !!siteId,
  });

  const stackTests = stackTestsData?.data || [];
  const hasMore = stackTestsData?.pagination?.has_more || false;
  const nextCursor = stackTestsData?.pagination?.cursor;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'FAIL':
      case 'NON_COMPLIANT':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PENDING':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800';
      case 'FAIL':
      case 'NON_COMPLIANT':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
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
          <p className="text-red-800">Error loading stack tests: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Stack Tests</h1>
          <p className="text-text-secondary mt-2">
            Track stack emission test results and compliance status
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/module-3/stack-tests/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Stack Test
          </Button>
        </Link>
      </div>

      {stackTests.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-12 text-center">
          <FlaskConical className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Stack Tests</h3>
          <p className="text-text-secondary mb-4">
            Start tracking stack emission tests by adding your first test result.
          </p>
          <Link href={`/dashboard/sites/${siteId}/module-3/stack-tests/new`}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Stack Test
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {stackTests.map((test) => (
            <Link
              key={test.id}
              href={`/dashboard/sites/${siteId}/module-3/stack-tests/${test.id}`}
              className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-text-primary">
                      {test.generators?.generator_identifier || 'Unknown Generator'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(test.compliance_status)}`}>
                      {test.compliance_status}
                    </span>
                    {getStatusIcon(test.compliance_status)}
                  </div>
                  <p className="text-sm text-text-secondary mb-4">
                    Test Date: {new Date(test.test_date).toLocaleDateString()}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {test.nox_result !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">NOx</p>
                        <p className="text-sm font-medium text-text-primary">{test.nox_result.toFixed(2)}</p>
                      </div>
                    )}
                    {test.so2_result !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">SO₂</p>
                        <p className="text-sm font-medium text-text-primary">{test.so2_result.toFixed(2)}</p>
                      </div>
                    )}
                    {test.co_result !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">CO</p>
                        <p className="text-sm font-medium text-text-primary">{test.co_result.toFixed(2)}</p>
                      </div>
                    )}
                    {test.particulates_result !== null && (
                      <div>
                        <p className="text-sm text-text-tertiary">Particulates</p>
                        <p className="text-sm font-medium text-text-primary">{test.particulates_result.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  {test.exceedances_found && (
                    <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                      <AlertCircle className="w-5 h-5" />
                      <p className="text-sm">Exceedances found: {test.exceedance_details || 'See details'}</p>
                    </div>
                  )}
                  {test.next_test_due && (
                    <div className="mt-4">
                      <p className="text-sm text-text-tertiary">
                        Next test due: {new Date(test.next_test_due).toLocaleDateString()}
                      </p>
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

