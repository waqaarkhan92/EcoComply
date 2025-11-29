'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2, FileText } from 'lucide-react';
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
}

export default function PackDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const packId = params.packId as string;

  const { data: packData, isLoading } = useQuery<{ data: Pack }>({
    queryKey: ['pack', packId],
    queryFn: async () => {
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
    </div>
  );
}

