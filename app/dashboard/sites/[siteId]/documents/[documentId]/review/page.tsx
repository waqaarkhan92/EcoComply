'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  extraction_status: string;
  obligation_count: number;
}

interface Obligation {
  id: string;
  obligation_title: string;
  review_status: string;
  confidence_score: number;
}

export default function DocumentReviewPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const documentId = params.documentId as string;

  const { data: documentData } = useQuery<{ data: Document }>({
    queryKey: ['document', documentId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Document }>(`/documents/${documentId}`);
    },
  });

  const { data: obligationsData } = useQuery<{ data: Obligation[] }>({
    queryKey: ['document-obligations', documentId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Obligation[] }>(`/documents/${documentId}/obligations`);
    },
  });

  const confirmObligation = useMutation({
    mutationFn: async (obligationId: string) => {
      return apiClient.put(`/obligations/${obligationId}/review`, {
        review_status: 'CONFIRMED',
      });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const rejectObligation = useMutation({
    mutationFn: async (obligationId: string) => {
      return apiClient.put(`/obligations/${obligationId}/review`, {
        review_status: 'REJECTED',
      });
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const obligations = obligationsData?.data || [];

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
          <h1 className="text-2xl font-bold">Review Document</h1>
          <p className="text-gray-600 mt-1">
            {documentData?.data?.title || 'Document Review'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Extracted Obligations</h2>
          <p className="text-sm text-gray-600">
            {obligations.length} obligation{obligations.length !== 1 ? 's' : ''} extracted
          </p>
        </div>

        <div className="space-y-4">
          {obligations.map((obligation) => (
            <div
              key={obligation.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{obligation.obligation_title}</h3>
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      Confidence: {(obligation.confidence_score * 100).toFixed(0)}%
                    </span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      obligation.review_status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                      obligation.review_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {obligation.review_status}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  {obligation.review_status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => confirmObligation.mutate(obligation.id)}
                        disabled={confirmObligation.isPending}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectObligation.mutate(obligation.id)}
                        disabled={rejectObligation.isPending}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Link href={`/dashboard/sites/${siteId}/obligations/${obligation.id}`}>
                    <Button size="sm" variant="ghost">
                      <FileText className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

