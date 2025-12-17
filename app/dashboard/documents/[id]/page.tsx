'use client';

import { use, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, RefreshCw, Trash2, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useExtractionProgress } from '@/lib/hooks/use-extraction-progress';

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

interface SiteAssignment {
  id: string;
  site_id: string;
  is_primary: boolean;
  obligations_shared: boolean;
  sites: {
    id: string;
    name: string;
  };
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

  // Get current document status from cache to determine if SSE should be enabled
  const cachedDoc = queryClient.getQueryData<Document>(['document', id]);
  const isProcessing = cachedDoc?.extraction_status === 'PROCESSING' ||
                       cachedDoc?.extraction_status === 'PENDING';

  // Use SSE for real-time progress updates (when processing)
  const {
    status: sseStatus,
    progress: sseProgress,
    obligationsFound: sseObligationsFound,
    message: sseMessage,
    currentPass: sseCurrentPass,
    isConnected: sseConnected,
  } = useExtractionProgress(id, {
    enabled: isProcessing,
    onComplete: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      queryClient.invalidateQueries({ queryKey: ['document-obligations', id] });
      queryClient.invalidateQueries({ queryKey: ['extraction-status', id] });
    },
    onError: () => {
      // Error handled by SSE hook
    },
  });

  const { data: document, isLoading: docLoading, error: docError } = useQuery({
    queryKey: ['document', id],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<Document>(`/documents/${id}`);
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
          return 3000; // Poll faster to catch the final state
        }
      }

      return false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch site assignments
  const { data: siteAssignments } = useQuery<SiteAssignment[]>({
    queryKey: ['document-sites', id],
    queryFn: async (): Promise<SiteAssignment[]> => {
      try {
        const response = await apiClient.get<{ assignments: SiteAssignment[] }>(`/documents/${id}/sites`);
        return response.data?.assignments || [];
      } catch (error) {
        console.error('Error fetching site assignments:', error);
        return [];
      }
    },
    enabled: !!id,
  });

  const { data: obligations, isLoading: obligationsLoading, error: obligationsError} = useQuery({
    queryKey: ['document-obligations', id],
    queryFn: async (): Promise<any> => {
      try {
        // Fetch with higher limit to get all obligations
        const response = await apiClient.get<Obligation[]>(`/documents/${id}/obligations?limit=100`);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error: any) {
        // Return empty array instead of throwing to prevent query from failing
        return [];
      }
    },
    enabled: !!id, // Always enabled if we have an ID (don't wait for document)
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 0, // Don't cache query results
    refetchInterval: (query) => {
      const freshDoc = queryClient.getQueryData<Document>(['document', id]);
      const currentObligations = query.state.data;

      // Poll if extraction is in progress or completed but no obligations yet
      if (freshDoc && (
        freshDoc.extraction_status === 'PROCESSING' ||
        freshDoc.extraction_status === 'PENDING' ||
        (freshDoc.extraction_status === 'COMPLETED' && (!currentObligations || currentObligations.length === 0))
      )) {
        return 3000;
      }

      // Poll if document not loaded yet
      if (!freshDoc) {
        return 5000;
      }

      // Brief polling after completion to catch delayed obligations
      if (freshDoc && freshDoc.extraction_status === 'COMPLETED') {
        const queryAge = Date.now() - (query.state.dataUpdatedAt || 0);
        if (currentObligations && currentObligations.length > 0) {
          if (queryAge < 30000) return 3000;
        } else {
          if (queryAge < 60000) return 5000; // Reduced from 2 min to 1 min
        }
      }

      return false;
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
        const response = await apiClient.get<{
          status: string;
          progress: number;
          obligation_count: number;
          document_id?: string;
          started_at?: string | null;
          completed_at?: string | null;
        }>(`/documents/${id}/extraction-status`);
        const statusData = response.data;
        return {
          ...statusData,
          progress: statusData.progress ?? 0,
          obligation_count: statusData.obligation_count ?? 0,
        };
      } catch (error: any) {
        // Fallback to document status from cache
        const freshDoc = queryClient.getQueryData<Document>(['document', id]);
        return {
          status: freshDoc?.extraction_status || 'PENDING',
          progress: freshDoc?.extraction_status === 'COMPLETED' ? 100 : (freshDoc?.extraction_status === 'PENDING' ? 0 : 10),
          obligation_count: 0,
        };
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

      {/* Site Assignments */}
      {siteAssignments && siteAssignments.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Assigned Sites
            <span className="ml-2 text-sm font-normal text-text-secondary">({siteAssignments.length})</span>
          </h2>
          <div className="space-y-3">
            {siteAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {assignment.sites.name}
                    </p>
                    {assignment.is_primary && (
                      <p className="text-xs text-primary mt-0.5">Primary Site</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.is_primary && (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-primary/20 text-primary">
                      Primary
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                    assignment.obligations_shared
                      ? 'bg-success/20 text-success'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {assignment.obligations_shared ? 'Shared' : 'Replicated'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {siteAssignments.some(a => a.obligations_shared) && (
            <p className="text-xs text-text-secondary mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <strong>Shared:</strong> Obligations are shared across all assigned sites. Evidence can be linked from any site.
            </p>
          )}
          {siteAssignments.some(a => !a.obligations_shared) && !siteAssignments.some(a => a.obligations_shared) && (
            <p className="text-xs text-text-secondary mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <strong>Replicated:</strong> Separate obligations created for each site. Evidence must be site-specific.
            </p>
          )}
        </div>
      )}

      {/* Extraction Progress - Always show, update based on status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Extraction Progress</h2>
          {isProcessing && sseConnected && (
            <span className="flex items-center text-xs text-success">
              <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
              Live
            </span>
          )}
        </div>
        <div className="space-y-4">
          {/* Progress Header with Icon */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              document.extraction_status === 'COMPLETED' ? 'bg-success/10' :
              document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' ? 'bg-danger/10' :
              isProcessing ? 'bg-blue-50' : 'bg-gray-100'
            }`}>
              {isProcessing ? (
                <Sparkles className="h-5 w-5 text-info animate-pulse" />
              ) : document.extraction_status === 'COMPLETED' ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' ? (
                <AlertCircle className="h-5 w-5 text-danger" />
              ) : (
                <Clock className="h-5 w-5 text-text-tertiary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {/* Use SSE message when available and processing */}
                {isProcessing && sseMessage ? sseMessage :
                 document.extraction_status === 'PENDING' ? 'Waiting to start...' :
                 document.extraction_status === 'PROCESSING' ? 'Extracting obligations...' :
                 document.extraction_status === 'COMPLETED' ? 'Extraction completed' :
                 document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' ? 'Extraction failed' :
                 `Status: ${document.extraction_status}`}
              </p>
              {/* Show current pass when available */}
              {isProcessing && sseCurrentPass && (
                <p className="text-xs text-text-tertiary mt-0.5">{sseCurrentPass}</p>
              )}
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {/* Prefer SSE progress when processing, otherwise use polling fallback */}
              {isProcessing && sseProgress > 0
                ? `${Math.max(0, Math.min(100, sseProgress))}%`
                : extractionStatus?.progress !== undefined
                  ? `${Math.max(0, Math.min(100, extractionStatus.progress))}%`
                  : document.extraction_status === 'PENDING' ? '0%'
                  : document.extraction_status === 'COMPLETED' ? '100%'
                  : (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED') ? '0%'
                  : '10%'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                document.extraction_status === 'COMPLETED' ? 'bg-success' :
                document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED' ? 'bg-danger' :
                'bg-info'
              }`}
              style={{
                width: isProcessing && sseProgress > 0
                  ? `${Math.max(0, Math.min(100, sseProgress))}%`
                  : extractionStatus?.progress !== undefined
                    ? `${Math.max(0, Math.min(100, extractionStatus.progress))}%`
                    : document.extraction_status === 'PENDING' ? '0%'
                    : document.extraction_status === 'COMPLETED' ? '100%'
                    : (document.extraction_status === 'PROCESSING_FAILED' || document.extraction_status === 'FAILED') ? '0%'
                    : '10%',
              }}
            />
          </div>

          {/* Live Obligations Found Counter */}
          {isProcessing && sseObligationsFound > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Sparkles className="h-4 w-4 text-info" />
              <p className="text-sm text-info font-medium">
                Found {sseObligationsFound} obligation{sseObligationsFound !== 1 ? 's' : ''} so far...
              </p>
            </div>
          )}

          {/* Info message while processing */}
          {isProcessing && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-text-secondary">
                {sseConnected
                  ? '✓ Receiving real-time updates. The page will refresh automatically when complete.'
                  : 'The page will update automatically when extraction completes.'}
              </p>
            </div>
          )}

          {/* Legacy polling-based obligation count (fallback) */}
          {!isProcessing && extractionStatus && extractionStatus.obligation_count !== undefined && extractionStatus.obligation_count > 0 && (
            <p className="text-sm text-text-secondary">
              ✅ {extractionStatus.obligation_count} obligation{extractionStatus.obligation_count !== 1 ? 's' : ''} extracted
            </p>
          )}

          {/* Show final count when done */}
          {document.extraction_status === 'COMPLETED' && obligations && obligations.length > 0 && (
            <p className="text-sm text-success font-medium">
              ✅ {obligations.length} obligation{obligations.length !== 1 ? 's' : ''} successfully extracted
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
            {obligations.map((obligation: Obligation) => (
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

