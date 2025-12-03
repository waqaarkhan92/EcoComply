'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, GitBranch, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface PermitVersion {
  id: string;
  version_number: number;
  created_at: string;
  change_type: 'VARIATION' | 'RENEWAL' | 'SURRENDER' | 'INITIAL';
  change_summary: string;
  created_by: string;
}

interface PermitVersionsResponse {
  data: PermitVersion[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function PermitVersionsPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const { data: versionsData, isLoading, error } = useQuery<PermitVersionsResponse>({
    queryKey: ['permit-versions', documentId, cursor],
    queryFn: async (): Promise<any> => {
      const params = new URLSearchParams();
      params.append('filter[document_id]', documentId);
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '50');

      return apiClient.get<PermitVersionsResponse>(`/module-1/permit-versions?${params.toString()}`);
    },
    enabled: !!documentId,
  });

  const versions = versionsData?.data || [];
  const hasMore = versionsData?.pagination?.has_more || false;
  const nextCursor = versionsData?.pagination?.cursor;

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'VARIATION':
        return 'text-blue-600 bg-blue-50';
      case 'RENEWAL':
        return 'text-green-600 bg-green-50';
      case 'SURRENDER':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading versions</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/sites/${siteId}/documents/${documentId}`}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
          >
            ← Back to Document
          </Link>
          <h1 className="text-2xl font-bold">Permit Versions</h1>
          <p className="text-gray-600 mt-1">View and compare permit document versions</p>
        </div>
      </div>

      {/* Versions List */}
      <div className="bg-white rounded-lg shadow">
        {versions.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
            <p className="text-gray-500">Version history will appear here as the permit changes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-semibold">Version {version.version_number}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getChangeTypeColor(version.change_type)}`}>
                          {version.change_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{version.change_summary || 'No summary available'}</p>
                      <p className="text-xs text-gray-500">
                        Created: {new Date(version.created_at).toLocaleString()} by {version.created_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/versions/${version.id}/impact`}>
                      <Button variant="outline" size="sm">
                        View Impact
                      </Button>
                    </Link>
                    {index < versions.length - 1 && (
                      <Link
                        href={`/dashboard/sites/${siteId}/documents/${documentId}/versions?compare=${version.id}&with=${versions[index + 1].id}`}
                      >
                        <Button variant="outline" size="sm">
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Compare
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
          <div className="px-6 py-4 border-t border-gray-200">
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
    </div>
  );
}

