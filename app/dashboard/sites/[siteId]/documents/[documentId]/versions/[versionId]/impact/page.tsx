'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Plus, Minus, Edit } from 'lucide-react';
import Link from 'next/link';

interface VersionImpact {
  version_id: string;
  version_number: number;
  new_obligations: any[];
  removed_obligations: any[];
  modified_obligations: any[];
  total_obligations: number;
  changed_obligations: number;
  impact_score: number;
}

export default function VersionImpactPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const versionId = params.versionId as string;

  const { data: impactData, isLoading, error } = useQuery({
    queryKey: ['version-impact', versionId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: VersionImpact }>(`/module-1/permit-versions/${versionId}/impact`);
    },
    enabled: !!versionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading impact analysis...</div>
      </div>
    );
  }

  if (error || !impactData?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading impact analysis</p>
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/versions`}>
            <Button variant="outline">Back to Versions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const impact = impactData.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/documents/${documentId}/versions`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            <ArrowLeft className="inline h-4 w-4 mr-1" />
            Back to Versions
          </Link>
          <h1 className="text-2xl font-bold">Version Impact Analysis</h1>
          <p className="text-gray-600 mt-1">Version {impact.version_number} - Impact on Obligations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            Export Report
          </Button>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Total Obligations</h3>
          <p className="text-3xl font-bold text-gray-900">{impact.total_obligations}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Changed Obligations</h3>
          <p className="text-3xl font-bold text-yellow-600">{impact.changed_obligations}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Impact Score</h3>
          <p className="text-3xl font-bold text-blue-600">{impact.impact_score}/100</p>
        </div>
      </div>

      {/* New Obligations */}
      {impact.new_obligations && impact.new_obligations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">New Obligations ({impact.new_obligations.length})</h2>
          </div>
          <div className="space-y-3">
            {impact.new_obligations.map((obligation: any) => (
              <div key={obligation.id} className="border-l-4 border-green-500 pl-4 py-2">
                <p className="font-medium">{obligation.title}</p>
                <p className="text-sm text-gray-600">{obligation.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Obligations */}
      {impact.removed_obligations && impact.removed_obligations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Minus className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold">Removed Obligations ({impact.removed_obligations.length})</h2>
          </div>
          <div className="space-y-3">
            {impact.removed_obligations.map((obligation: any) => (
              <div key={obligation.id} className="border-l-4 border-red-500 pl-4 py-2">
                <p className="font-medium">{obligation.title}</p>
                <p className="text-sm text-gray-600">{obligation.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modified Obligations */}
      {impact.modified_obligations && impact.modified_obligations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Edit className="h-5 w-5 text-yellow-600" />
            <h2 className="text-xl font-semibold">Modified Obligations ({impact.modified_obligations.length})</h2>
          </div>
          <div className="space-y-3">
            {impact.modified_obligations.map((obligation: any) => (
              <div key={obligation.id} className="border-l-4 border-yellow-500 pl-4 py-2">
                <p className="font-medium">{obligation.title}</p>
                <p className="text-sm text-gray-600">{obligation.category}</p>
                {obligation.changes && (
                  <div className="mt-2 text-xs text-gray-500">
                    Changes: {obligation.changes.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!impact.new_obligations || impact.new_obligations.length === 0) &&
        (!impact.removed_obligations || impact.removed_obligations.length === 0) &&
        (!impact.modified_obligations || impact.modified_obligations.length === 0) && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Impact Detected</h3>
            <p className="text-gray-500">This version did not result in any obligation changes</p>
          </div>
        )}
    </div>
  );
}

