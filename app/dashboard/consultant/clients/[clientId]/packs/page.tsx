'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Download } from 'lucide-react';
import Link from 'next/link';

interface Pack {
  id: string;
  pack_type: string;
  status: string;
  generated_at: string;
  file_url: string;
}

interface PacksResponse {
  data: Pack[];
}

export default function ClientPacksPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const { data: packsData, isLoading } = useQuery<PacksResponse>({
    queryKey: ['consultant-client-packs', clientId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<PacksResponse>(`/consultant/clients/${clientId}/packs`);
    },
  });

  const packs = packsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading packs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/consultant/clients/${clientId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Client Packs</h1>
          <p className="text-gray-600 mt-1">View all packs generated for this client</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pack Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Generated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {packs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No packs found for this client.
                  </td>
                </tr>
              ) : (
                packs.map((pack) => (
                  <tr key={pack.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{pack.pack_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        pack.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        pack.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pack.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(pack.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {pack.file_url && (
                        <a
                          href={pack.file_url}
                          download
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Download className="h-4 w-4 inline mr-1" />
                          Download
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

