'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { FileText, Calendar, User, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PermitVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  uploaded_by: { full_name: string };
  change_summary?: string;
  is_current: boolean;
}

interface PermitVersionComparisonProps {
  documentId: string;
}

export function PermitVersionComparison({ documentId }: PermitVersionComparisonProps) {
  const [selectedVersions, setSelectedVersions] = useState<[string | null, string | null]>([null, null]);

  const { data: versionsData, isLoading } = useQuery<{ data: PermitVersion[] }>({
    queryKey: ['permit-versions', documentId],
    queryFn: async () => {
      return apiClient.get('/documents/' + documentId + '/versions');
    },
  });

  const versions = versionsData?.data || [];
  const [versionA, versionB] = selectedVersions;

  if (versions.length >= 2 && !versionA && !versionB) {
    setSelectedVersions([versions[0].id, versions[1].id]);
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading versions...</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No version history available</p>
        </div>
      </div>
    );
  }

  const versionAData = versions.find(v => v.id === versionA);
  const versionBData = versions.find(v => v.id === versionB);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version History</h2>
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={'border rounded-lg p-4 cursor-pointer ' + (selectedVersions.includes(version.id) ? 'border-primary bg-primary/5' : 'hover:bg-gray-50')}
              onClick={() => {
                if (!selectedVersions[0]) {
                  setSelectedVersions([version.id, null]);
                } else if (!selectedVersions[1]) {
                  setSelectedVersions([selectedVersions[0], version.id]);
                } else {
                  setSelectedVersions([selectedVersions[0], version.id]);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">v{version.version_number}</span>
                {version.is_current && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Current</span>
                )}
              </div>
              <div className="text-sm font-medium mb-1">{version.file_name}</div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(version.uploaded_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.uploaded_by.full_name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {versionA && versionB && versionAData && versionBData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Version Comparison</h2>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Redline
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-3 pb-3 border-b">
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  Version {versionAData.version_number}
                </span>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(versionAData.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe src={versionAData.file_url} className="w-full h-96" title={'Version ' + versionAData.version_number} />
              </div>
            </div>
            <div>
              <div className="mb-3 pb-3 border-b">
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                  Version {versionBData.version_number}
                </span>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(versionBData.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe src={versionBData.file_url} className="w-full h-96" title={'Version ' + versionBData.version_number} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
