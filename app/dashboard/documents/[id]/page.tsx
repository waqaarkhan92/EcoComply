'use client';

import { use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  site_id: string;
  document_type: string;
  status: string;
  extraction_status: string;
  extraction_error?: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

interface Obligation {
  id: string;
  obligation_title?: string;
  obligation_description?: string;
  category: string;
  status: string;
  confidence_score: number;
  original_text?: string;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  
  console.log('🔍 DocumentDetailPage rendered with id:', id);

  const { data: document, isLoading: docLoading, error: docError } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Document>(`/documents/${id}`);
      console.log('📄 Document fetched - extraction_status:', response.data?.extraction_status);
      return response.data;
    },
    retry: 1,
    enabled: !!id,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache query results (previously cacheTime)
    refetchInterval: (query) => {
      // Get fresh document data from cache
      const freshDoc = queryClient.getQueryData<Document>(['document', id]);
      const extractionStatus = queryClient.getQueryData<any>(['extraction-status', id]);

      // Keep polling if:
      // 1. Document is not completed yet, OR
      // 2. Document is completed but extraction-status doesn't show 100% yet
      if (freshDoc && freshDoc.extraction_status !== 'COMPLETED' && freshDoc.extraction_status !== 'PROCESSING_FAILED' && freshDoc.extraction_status !== 'FAILED') {
        return 5000; // Poll every 5 seconds
      }

      // If document is completed but extraction-status doesn't show 100%, keep polling
      if (freshDoc && freshDoc.extraction_status === 'COMPLETED') {
        if (!extractionStatus || extractionStatus.progress !== 100) {
          console.log('🔄 Document COMPLETED but extraction-status not at 100%, continuing to poll...');
          return 3000; // Poll faster to catch the final state
        }
      }

      return false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: obligations, isLoading: obligationsLoading, error: obligationsError } = useQuery<Obligation[]>({
    queryKey: ['document-obligations', id],
    queryFn: async (): Promise<any> => {
      try {
        console.log('📋 Fetching obligations for document:', id);
        // Fetch with higher limit to get all obligations (increase from default 20 to 100)
        const response = await apiClient.get<Obligation[]>(`/documents/${id}/obligations?limit=100`);

        console.log('📋 Full obligations response:', JSON.stringify(response, null, 2));
        console.log('📋 Response keys:', Object.keys(response));
        console.log('📋 Response.data:', response.data);
        console.log('📋 Response.data type:', typeof response.data);
        console.log('📋 Response.data is array:', Array.isArray(response.data));
        console.log('📋 Response.data length:', Array.isArray(response.data) ? response.data.length : 'not an array');
        console.log('📋 Response.pagination:', response.pagination);
        console.log('📋 Response.meta:', response.meta);

        // Handle paginated response - data is already the array in paginatedResponse
        const obligations = Array.isArray(response.data) ? response.data : [];
        console.log('📋 Parsed obligations:', obligations.length);

        if (obligations.length > 0) {
          console.log('✅ Obligations found:', obligations.length);
          console.log('📋 First obligation sample:', JSON.stringify(obligations[0], null, 2));
        } else {
          console.warn('⚠️ No obligations returned from API for document:', id);
          console.warn('⚠️ Response structure:', {
            hasData: 'data' in response,
            dataType: typeof response.data,
            dataValue: response.data,
            fullResponse: response,
          });
        }

        return obligations;
      } catch (error: any) {
        console.error('❌ Error fetching obligations:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          status: error?.status,
          code: error?.code,
          response: error?.response,
          stack: error?.stack,
        });
        console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        // Return empty array instead of throwing to prevent query from failing
        // The error will still be available in obligationsError
        return [];
      }
    },
    enabled: !!id, // Always enabled if we have an ID (don't wait for document)
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache query results
    refetchInterval: (query) => {
      // Get fresh document data from cache
      const freshDoc = queryClient.getQueryData<Document>(['document', id]);
      const currentObligations = query.state.data;
      
      console.log('🔄 Obligations refetchInterval check:', {
        hasDoc: !!freshDoc,
        docStatus: freshDoc?.extraction_status,
        currentObligationsCount: currentObligations?.length || 0,
        queryAge: query.state.dataUpdatedAt ? Date.now() - query.state.dataUpdatedAt : 0,
      });
      
      // Always poll if extraction is in progress or if we have no obligations yet
      // Keep polling even after COMPLETED if we still don't have obligations (they might be delayed)
      // Note: Backend only uses 'PROCESSING', not 'EXTRACTING' (EXTRACTING was removed due to DB constraint)
      if (freshDoc && (
        freshDoc.extraction_status === 'PROCESSING' ||
        freshDoc.extraction_status === 'PENDING' ||
        (freshDoc.extraction_status === 'COMPLETED' && (!currentObligations || currentObligations.length === 0))
      )) {
        console.log('🔄 Polling obligations (status:', freshDoc.extraction_status, ', count:', currentObligations?.length || 0, ')');
        return 3000; // Poll every 3 seconds (faster) to catch obligations as soon as they're visible
      }
      // Also poll if we don't have document yet (might be loading)
      if (!freshDoc) {
        console.log('🔄 Polling obligations (no document yet)');
        return 5000;
      }
      // Keep polling for a bit even after we get obligations, in case more are being added
      if (freshDoc && freshDoc.extraction_status === 'COMPLETED') {
        if (currentObligations && currentObligations.length > 0) {
          // Poll a few more times to catch any delayed obligations
          const queryAge = Date.now() - (query.state.dataUpdatedAt || 0);
          if (queryAge < 30000) { // Keep polling for 30 seconds after completion
            console.log('🔄 Polling obligations (completed, query age:', Math.floor(queryAge / 1000), 's)');
            return 3000;
          }
        } else {
          // COMPLETED but no obligations - keep polling longer!
          const queryAge = Date.now() - (query.state.dataUpdatedAt || 0);
          if (queryAge < 120000) { // Keep polling for 2 minutes if no obligations found
            console.log('🔄 Polling obligations (completed but no obligations yet, query age:', Math.floor(queryAge / 1000), 's)');
            return 5000;
          }
        }
      }
      console.log('🔄 Stopping obligations polling');
      return false; // Stop polling when done
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Add retry logic
    retry: 2,
    retryDelay: 1000,
  });

  // Poll extraction status if processing
  const { data: extractionStatus, error: extractionStatusError } = useQuery<{
    status: string;
    progress: number;
    obligation_count: number;
    document_id?: string;
    started_at?: string | null;
    completed_at?: string | null;
  }>({
    queryKey: ['extraction-status', id],
    queryFn: async (): Promise<any> => {
      try {
        console.log('📊 Fetching extraction status for:', id);
        const response = await apiClient.get<{
          status: string;
          progress: number;
          obligation_count: number;
          document_id?: string;
          started_at?: string | null;
          completed_at?: string | null;
        }>(`/documents/${id}/extraction-status`);
        console.log('📊 Extraction status response:', JSON.stringify(response.data));
        // Ensure progress is always a number, never null
        const statusData = response.data;
        return {
          ...statusData,
          progress: statusData.progress ?? 0,
          obligation_count: statusData.obligation_count ?? 0,
        };
      } catch (error: any) {
        // Better error logging
        const errorDetails = {
          message: error?.message || 'Unknown error',
          status: error?.status || error?.response?.status || 'unknown',
          responseData: error?.response?.data || error?.response || null,
          errorString: String(error),
          errorType: error?.constructor?.name || typeof error,
        };
        console.error('❌ Failed to fetch extraction status:', errorDetails);
        
        // Get fresh document data from cache for error fallback
        const freshDoc = queryClient.getQueryData<Document>(['document', id]);
        const fallback = {
          status: freshDoc?.extraction_status || 'PENDING',
          progress: freshDoc?.extraction_status === 'COMPLETED' ? 100 : (freshDoc?.extraction_status === 'PENDING' ? 0 : 10),
          obligation_count: 0,
        };
        console.log('📊 Using fallback status:', fallback);
        return fallback;
      }
    },
    enabled: !!id, // Always enabled if we have an ID (don't wait for document)
    staleTime: 0, // Always consider data stale to force refetch
    refetchInterval: (query) => {
      // Always poll extraction-status while document is processing
      const freshDoc = queryClient.getQueryData<Document>(['document', id]);
      // Note: Backend only uses 'PROCESSING', not 'EXTRACTING' (EXTRACTING was removed due to DB constraint)
      if (freshDoc && (
        freshDoc.extraction_status === 'PENDING' || 
        freshDoc.extraction_status === 'PROCESSING'
      )) {
        return 5000; // Poll every 5 seconds while in progress
      }
      // Keep polling after extraction completes to get final obligation count
      if (freshDoc && freshDoc.extraction_status === 'COMPLETED') {
        const currentStatus = query.state.data;
        // Keep polling until we get 100% progress and obligations show up
        if (!currentStatus || currentStatus.progress !== 100 || currentStatus.obligation_count === 0) {
          return 3000; // Poll every 3 seconds until complete
        }
      }
      return false; // Stop polling when done
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Show progress bar even while loading or if there's an error
  if (docLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-text-secondary">Loading document...</div>
        {/* Show progress bar section even while loading */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Extraction Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-text-secondary mb-2">
                <span>Loading...</span>
                <span>0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (docError || !document) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-danger">
            {docError ? `Error loading document: ${docError.message || 'Unknown error'}` : 'Document not found'}
          </p>
          <p className="text-sm text-text-secondary mt-2">Document ID: {id}</p>
          <Link href="/dashboard/documents">
            <Button variant="outline" className="mt-4">
              Back to Documents
            </Button>
          </Link>
        </div>
        {/* Show progress bar section even on error */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Extraction Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-text-secondary mb-2">
                <span>Error loading document</span>
                <span>0%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-danger h-2 rounded-full transition-all duration-300" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🔍 Rendering document page:', {
    documentId: document?.id,
    documentStatus: document?.extraction_status,
    extractionStatus: extractionStatus,
    obligationsCount: obligations?.length || 0,
    obligationsLoading: obligationsLoading,
    obligationsError: obligationsError?.message || null,
    obligationsData: obligations ? obligations.slice(0, 2) : null, // First 2 for debugging
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/documents"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            ← Back to Documents
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">{document.title}</h1>
          <p className="text-text-secondary mt-2">
            {document.document_type.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-extract
          </Button>
          <Button variant="danger" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Document Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Document Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-text-secondary">Status</p>
            <p className="mt-1">
              <StatusBadge status={document.status} />
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Extraction Status</p>
            <p className="mt-1">
              <ExtractionBadge status={document.extraction_status} />
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">File Size</p>
            <p className="mt-1 text-text-primary">
              {(document.file_size_bytes / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">Uploaded</p>
            <p className="mt-1 text-text-primary">
              {new Date(document.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Extraction Progress - Always show, update based on status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Extraction Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-text-secondary mb-2">
              <span>
                {document.extraction_status === 'PENDING' && 'Waiting to start...'}
                {document.extraction_status === 'PROCESSING' && 'Extracting obligations...'}
                {document.extraction_status === 'COMPLETED' && 'Extraction completed'}
                {(document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' || document.extraction_status === 'EXTRACTION_FAILED') && 'Extraction failed'}
                {!['PENDING', 'PROCESSING', 'COMPLETED', 'PROCESSING_FAILED', 'FAILED', 'EXTRACTION_FAILED'].includes(document.extraction_status) && `Status: ${document.extraction_status}`}
              </span>
              <span>
                {extractionStatus?.progress !== undefined
                  ? `${Math.max(0, Math.min(100, extractionStatus.progress))}%`
                  : document.extraction_status === 'PENDING' ? '0%' 
                  : document.extraction_status === 'COMPLETED' ? '100%'
                  : (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED') ? '0%'
                  : '10%'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: extractionStatus?.progress !== undefined
                    ? `${Math.max(0, Math.min(100, extractionStatus.progress))}%`
                    : document.extraction_status === 'PENDING' ? '0%'
                    : document.extraction_status === 'COMPLETED' ? '100%'
                    : (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED') ? '0%'
                    : '10%',
                }}
              />
            </div>
          </div>
          {(document.extraction_status === 'PENDING' || document.extraction_status === 'PROCESSING') && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning">
                ⚠️ Please do not refresh this page while extraction is in progress. The page will update automatically when complete.
              </p>
            </div>
          )}
          {extractionStatus && extractionStatus.obligation_count !== undefined && extractionStatus.obligation_count > 0 && (
            <p className="text-sm text-text-secondary">
              ✅ {extractionStatus.obligation_count} obligation{extractionStatus.obligation_count !== 1 ? 's' : ''} extracted so far...
            </p>
          )}
          {obligations && obligations.length > 0 && (
            <p className="text-sm text-success">
              ✅ {obligations.length} obligation{obligations.length !== 1 ? 's' : ''} available
            </p>
          )}
          {extractionStatusError && (
            <p className="text-sm text-danger">
              ⚠️ Error loading progress: {extractionStatusError.message}
            </p>
          )}
        </div>
      </div>

      {/* Extracted Obligations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          Extracted Obligations
          {obligations && obligations.length > 0 && (
            <span className="ml-2 text-sm font-normal text-text-secondary">({obligations.length})</span>
          )}
        </h2>
        {obligationsLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading obligations...</div>
        ) : obligationsError ? (
          <div className="text-center py-8 text-danger">
            Error loading obligations: {obligationsError.message}
          </div>
        ) : obligations && obligations.length > 0 ? (
          <div className="space-y-4">
            {obligations.map((obligation) => (
              <div
                key={obligation.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/obligations/${obligation.id}`}
                      className="text-primary hover:text-primary-dark font-medium"
                    >
                      {obligation.obligation_title || obligation.obligation_description?.substring(0, 50) || 'Untitled Obligation'}
                    </Link>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                      {obligation.obligation_description || obligation.original_text || 'No description'}
                    </p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-xs text-text-tertiary">
                        Category: {obligation.category}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        Confidence: {(obligation.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={obligation.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-text-tertiary mb-4" />
            <p className="text-text-secondary">
              {document.extraction_status === 'PENDING' || document.extraction_status === 'PROCESSING'
                ? 'Obligations are being extracted...'
                : (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' || document.extraction_status === 'EXTRACTION_FAILED')
                ? `Extraction failed: ${document.extraction_error || 'Unknown error'}. Please try again later or contact support.`
                : document.extraction_status === 'COMPLETED'
                ? (obligations && obligations.length === 0 
                    ? 'Extraction completed but no obligations found. This might indicate an issue with the extraction process.'
                    : 'Extraction completed. Obligations should appear below.')
                : 'No obligations extracted yet'}
            </p>
            {document.extraction_status === 'PROCESSING_FAILED' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={async () => {
                  // TODO: Implement retry extraction endpoint
                  alert('Retry functionality coming soon. Please contact support if the issue persists.');
                }}
              >
                Retry Extraction
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { label: 'Active', className: 'bg-success/20 text-success' },
    ARCHIVED: { label: 'Archived', className: 'bg-gray-100 text-gray-800' },
    PENDING: { label: 'Pending', className: 'bg-warning/20 text-warning' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${badgeConfig.className}`}>
      {badgeConfig.label}
    </span>
  );
}

function ExtractionBadge({ status }: { status: string }) {
  const config = {
    PENDING: { label: 'Pending', className: 'bg-warning/20 text-warning' },
    PROCESSING: { label: 'Processing', className: 'bg-primary/20 text-primary' },
    COMPLETED: { label: 'Completed', className: 'bg-success/20 text-success' },
    FAILED: { label: 'Failed', className: 'bg-danger/20 text-danger' },
  };

  const badgeConfig = config[status as keyof typeof config] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md ${badgeConfig.className}`}>
      {badgeConfig.label}
    </span>
  );
}

