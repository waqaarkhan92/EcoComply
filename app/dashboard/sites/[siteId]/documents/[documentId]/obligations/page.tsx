'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface Obligation {
  id: string;
  obligation_title: string;
  obligation_description: string;
  category: string;
  review_status: string;
  confidence_score: number;
}

interface ObligationsResponse {
  data: Obligation[];
  pagination: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}

export default function DocumentObligationsPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;

  const { data: obligationsData, isLoading } = useQuery<ObligationsResponse>({
    queryKey: ['document-obligations', documentId],
    queryFn: async () => {
      return apiClient.get<ObligationsResponse>(`/documents/${documentId}/obligations`);
    },
  });

  const obligations = obligationsData?.data || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading obligations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/sites/${siteId}/documents/${documentId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Document Obligations</h1>
          <p className="text-gray-600 mt-1">
            {obligations.length} obligation{obligations.length !== 1 ? 's' : ''} extracted from this document
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {obligations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No obligations found for this document.
                  </td>
                </tr>
              ) : (
                obligations.map((obligation) => (
                  <tr key={obligation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{obligation.obligation_title}</div>
                      {obligation.obligation_description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {obligation.obligation_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{obligation.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        obligation.review_status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                        obligation.review_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {obligation.review_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {(obligation.confidence_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/sites/${siteId}/obligations/${obligation.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
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

