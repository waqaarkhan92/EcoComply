'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, FileText, Package, Clock, Eye } from 'lucide-react';
import Link from 'next/link';

interface Pack {
  id: string;
  pack_type: string;
  status: string;
  date_range_start: string;
  date_range_end: string;
  obligation_count: number;
  evidence_count: number;
  storage_path: string;
  file_url: string;
  generated_at: string;
  secure_link_id: string | null;
}

export default function PackDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const packId = params.packId as string;
  const [activeTab, setActiveTab] = useState<'preview' | 'contents' | 'access-logs' | 'metadata'>('preview');

  const { data: packData, isLoading } = useQuery<{ data: Pack }>({
    queryKey: ['pack', packId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Pack }>(`/packs/${packId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pack...</div>
      </div>
    );
  }

  if (!packData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Pack not found</div>
      </div>
    );
  }

  const pack = packData.data;
  const isCompleted = pack.status === 'COMPLETED';
  const hasSecureLink = !!pack.secure_link_id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/packs`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pack Details</h1>
            <p className="text-gray-600 mt-1">{pack.pack_type}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {isCompleted && (
            <>
              <Link href={`/dashboard/sites/${siteId}/packs/${packId}/distribute`}>
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Distribute
                </Button>
              </Link>
              {pack.file_url && (
                <a href={pack.file_url} download>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Preview
          </button>
          <button
            onClick={() => setActiveTab('contents')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'contents'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="inline mr-2 h-4 w-4" />
            Contents
          </button>
          {hasSecureLink && (
            <button
              onClick={() => setActiveTab('access-logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'access-logs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Eye className="inline mr-2 h-4 w-4" />
              Access Logs
            </button>
          )}
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'metadata'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline mr-2 h-4 w-4" />
            Metadata
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'preview' && (
        <div className="bg-white rounded-lg shadow p-6">
          {isCompleted && pack.file_url ? (
            <div className="space-y-4">
              <iframe
                src={pack.file_url}
                className="w-full h-[800px] border border-gray-200 rounded"
                title="Pack Preview"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {pack.status === 'GENERATING' || pack.status === 'PENDING'
                  ? 'Pack is being generated...'
                  : 'Pack preview not available'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contents' && (
        <PackContentsTab packId={packId} />
      )}

      {activeTab === 'access-logs' && hasSecureLink && (
        <PackAccessLogsTab packId={packId} />
      )}

      {activeTab === 'metadata' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  pack.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  pack.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pack.status}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Pack Type</label>
              <div className="mt-1 text-sm text-gray-900">{pack.pack_type}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Date Range</label>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(pack.date_range_start).toLocaleDateString()} - {new Date(pack.date_range_end).toLocaleDateString()}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Obligations</label>
              <div className="mt-1 text-sm text-gray-900">{pack.obligation_count || 0}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Evidence Items</label>
              <div className="mt-1 text-sm text-gray-900">{pack.evidence_count || 0}</div>
            </div>

            {pack.generated_at && (
              <div>
                <label className="text-sm font-medium text-gray-500">Generated At</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(pack.generated_at).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to generate CSV
function generateContentsCSV(contents: any): string {
  const headers = ['Type', 'ID', 'Name/Title', 'File Type/Category', 'Size/Status', 'Included At'];
  const rows: string[][] = [headers];

  contents.evidence_contents?.forEach((content: any) => {
    const snapshot = content.evidence_snapshot || {};
    rows.push([
      'Evidence',
      content.id,
      snapshot.file_name || 'Unknown',
      snapshot.file_type || 'N/A',
      snapshot.file_size ? `${(snapshot.file_size / 1024).toFixed(1)} KB` : 'N/A',
      new Date(content.included_at).toLocaleDateString(),
    ]);
  });

  contents.obligation_contents?.forEach((content: any) => {
    const snapshot = content.obligation_snapshot || {};
    rows.push([
      'Obligation',
      content.id,
      snapshot.title || 'Unknown',
      snapshot.category || 'N/A',
      snapshot.status || 'N/A',
      new Date(content.included_at).toLocaleDateString(),
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Pack Contents Tab Component
function PackContentsTab({ packId }: { packId: string }) {
  const { data: contentsData, isLoading } = useQuery<{
    data: {
      evidence_contents: any[];
      obligation_contents: any[];
      summary: {
        evidence_breakdown: any;
        obligation_breakdown: any;
      };
    };
  }>({
    queryKey: ['pack-contents', packId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/packs/${packId}/contents`);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">Loading contents...</div>
      </div>
    );
  }

  const contents = contentsData?.data;
  if (!contents) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">No contents available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Contents Summary</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export as CSV
                  const csv = generateContentsCSV(contents);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `pack-contents-${packId}.csv`;
                  a.click();
                }}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export as JSON
                  const json = JSON.stringify(contents, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `pack-contents-${packId}.json`;
                  a.click();
                }}
              >
                Export JSON
              </Button>
            </div>
          </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{contents.summary.evidence_breakdown.total}</div>
            <div className="text-sm text-gray-600">Evidence Items</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{contents.summary.obligation_breakdown.total}</div>
            <div className="text-sm text-gray-600">Obligations</div>
          </div>
        </div>
      </div>

      {/* Evidence Contents */}
      {contents.evidence_contents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Evidence Contents</h3>
          <div className="space-y-4">
            {contents.evidence_contents.map((content: any) => {
              const snapshot = content.evidence_snapshot || {};
              return (
                <div key={content.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{snapshot.file_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {snapshot.file_type} • {snapshot.file_size ? `${(snapshot.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Uploaded: {snapshot.uploaded_at ? new Date(snapshot.uploaded_at).toLocaleDateString() : 'Unknown'} • 
                        Included: {new Date(content.included_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      Version Locked
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Obligation Contents */}
      {contents.obligation_contents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Obligation Contents</h3>
          <div className="space-y-4">
            {contents.obligation_contents.map((content: any) => {
              const snapshot = content.obligation_snapshot || {};
              return (
                <div key={content.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{snapshot.title || 'Unknown Obligation'}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {snapshot.category} • {snapshot.frequency}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Deadline: {snapshot.deadline_date ? new Date(snapshot.deadline_date).toLocaleDateString() : 'N/A'} • 
                        Included: {new Date(content.included_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      Version Locked
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Pack Access Logs Tab Component
function PackAccessLogsTab({ packId }: { packId: string }) {
  const { data: logsData, isLoading } = useQuery<{
    data: any[];
    pagination: any;
    summary: {
      total_access_count: number;
      unique_accessors_count: number;
      total_download_count: number;
    };
  }>({
    queryKey: ['pack-access-logs', packId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/packs/${packId}/access-logs`);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">Loading access logs...</div>
      </div>
    );
  }

  const logs = logsData?.data || [];
  const summary = logsData?.summary;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Access Summary</h2>
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{summary.total_access_count}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{summary.unique_accessors_count}</div>
              <div className="text-sm text-gray-600">Unique Accessors</div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{summary.total_download_count}</div>
              <div className="text-sm text-gray-600">Downloads</div>
            </div>
          </div>
        </div>
      )}

      {/* Access Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Access Logs</h3>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No access logs yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accessor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Accessed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Accessed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downloads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.accessor_email || 'Anonymous'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.ip_address}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.first_accessed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.last_accessed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.view_count || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.download_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

