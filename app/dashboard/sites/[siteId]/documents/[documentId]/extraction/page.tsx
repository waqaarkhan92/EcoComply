'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  extraction_status: string;
}

interface ExtractionResults {
  document_id: string;
  extraction_status: string;
  obligations: any[];
  extraction_logs: any;
}

export default function DocumentExtractionPage() {
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

  const { data: extractionData, refetch } = useQuery<{ data: ExtractionResults }>({
    queryKey: ['extraction-results', documentId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: ExtractionResults }>(`/documents/${documentId}/extraction-results`);
    },
    refetchInterval: (data) => {
      // Poll if extraction is in progress
      return data?.data?.extraction_status === 'IN_PROGRESS' ? 5000 : false;
    },
  });

  const triggerExtraction = useMutation({
    mutationFn: async (forceReprocess: boolean) => {
      return apiClient.post(`/documents/${documentId}/extract`, {
        force_reprocess: forceReprocess,
      });
    },
    onSuccess: () => {
      refetch();
    },
  });

  const extractionStatus = extractionData?.data?.extraction_status || documentData?.data?.extraction_status || 'PENDING';
  const isProcessing = extractionStatus === 'IN_PROGRESS' || extractionStatus === 'PROCESSING';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/documents/${documentId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Extraction Status</h1>
            <p className="text-gray-600 mt-1">
              {documentData?.data?.title || 'Document Extraction'}
            </p>
          </div>
        </div>
        {!isProcessing && (
          <Button
            onClick={() => triggerExtraction.mutate(false)}
            disabled={triggerExtraction.isPending}
          >
            {triggerExtraction.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {extractionStatus === 'EXTRACTED' ? 'Re-extract' : 'Start Extraction'}
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              extractionStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              extractionStatus === 'IN_PROGRESS' || extractionStatus === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
              extractionStatus === 'FAILED' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {extractionStatus}
            </span>
            {isProcessing && (
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
            )}
          </div>
        </div>

        {extractionData?.data && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Extraction Results</h3>
              <div className="bg-gray-50 rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Obligations Extracted:</span>
                    <span className="ml-2 font-medium">{extractionData.data.obligations.length}</span>
                  </div>
                  {extractionData.data.extraction_logs && (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Estimated Cost:</span>
                        <span className="ml-2 font-medium">
                          £{extractionData.data.extraction_logs.estimated_cost.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Input Tokens:</span>
                        <span className="ml-2 font-medium">
                          {extractionData.data.extraction_logs.input_tokens.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Output Tokens:</span>
                        <span className="ml-2 font-medium">
                          {extractionData.data.extraction_logs.output_tokens.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {extractionData.data.obligations.length > 0 && (
              <div>
                <Link href={`/dashboard/sites/${siteId}/documents/${documentId}/obligations`}>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    View {extractionData.data.obligations.length} Obligations
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

