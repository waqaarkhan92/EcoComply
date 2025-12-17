'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ExtractionStatus =
  | 'queued'
  | 'downloading'
  | 'extracting_text'
  | 'extracting_obligations'
  | 'creating_obligations'
  | 'completed'
  | 'failed';

export interface ExtractionProgress {
  documentId: string;
  status: ExtractionStatus;
  progress: number;
  obligationsFound: number;
  message?: string;
  error?: string;
  currentPass?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemaining?: number;
}

interface UseExtractionProgressOptions {
  /** Enable/disable the SSE connection */
  enabled?: boolean;
  /** Callback when extraction completes */
  onComplete?: (data: ExtractionProgress) => void;
  /** Callback when extraction fails */
  onError?: (error: string) => void;
  /** Use polling fallback instead of SSE */
  usePolling?: boolean;
  /** Polling interval in ms (default: 3000) */
  pollingInterval?: number;
}

interface UseExtractionProgressResult {
  status: ExtractionStatus;
  progress: number;
  obligationsFound: number;
  message: string;
  currentPass?: string;
  isConnected: boolean;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Hook for real-time extraction progress via Server-Sent Events
 *
 * @example
 * const { status, progress, obligationsFound, message } = useExtractionProgress(documentId, {
 *   enabled: document?.extraction_status === 'PROCESSING',
 *   onComplete: () => queryClient.invalidateQueries(['document', documentId]),
 * });
 */
export function useExtractionProgress(
  documentId: string | undefined,
  options: UseExtractionProgressOptions = {}
): UseExtractionProgressResult {
  const {
    enabled = true,
    onComplete,
    onError,
    usePolling = false,
    pollingInterval = 3000,
  } = options;

  const [state, setState] = useState<ExtractionProgress>({
    documentId: documentId || '',
    status: 'queued',
    progress: 0,
    obligationsFound: 0,
    message: 'Waiting for progress data...',
  });
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  // Reset state when documentId changes
  useEffect(() => {
    hasCompletedRef.current = false;
    setState({
      documentId: documentId || '',
      status: 'queued',
      progress: 0,
      obligationsFound: 0,
      message: 'Waiting for progress data...',
    });
  }, [documentId]);

  // Handle progress update
  const handleProgressUpdate = useCallback((data: ExtractionProgress) => {
    setState(data);

    if (data.status === 'completed' && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.(data);
    }

    if (data.status === 'failed') {
      onError?.(data.error || 'Extraction failed');
    }
  }, [onComplete, onError]);

  // Polling fallback
  const startPolling = useCallback(() => {
    if (!documentId || !enabled) return;

    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/documents/${documentId}/extraction-progress`, {
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            handleProgressUpdate(result.data);

            // Stop polling if completed or failed
            if (result.data.status === 'completed' || result.data.status === 'failed') {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval);
  }, [documentId, enabled, pollingInterval, handleProgressUpdate]);

  // SSE connection
  useEffect(() => {
    if (!documentId || !enabled || usePolling) {
      return;
    }

    // Check if EventSource is supported
    if (typeof EventSource === 'undefined') {
      console.warn('EventSource not supported, falling back to polling');
      startPolling();
      return;
    }

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `/api/v1/documents/${documentId}/extraction-progress`;
      const eventSource = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        reconnectAttempts = 0;
      };

      eventSource.addEventListener('connected', (event) => {
        console.log('SSE connected:', event.data);
        setIsConnected(true);
      });

      eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data) as ExtractionProgress;
          handleProgressUpdate(data);
        } catch (error) {
          console.error('Failed to parse progress event:', error);
        }
      });

      eventSource.addEventListener('completed', (event) => {
        try {
          const data = JSON.parse(event.data) as ExtractionProgress;
          handleProgressUpdate(data);
          eventSource.close();
          setIsConnected(false);
        } catch (error) {
          console.error('Failed to parse completed event:', error);
        }
      });

      eventSource.addEventListener('failed', (event) => {
        try {
          const data = JSON.parse(event.data) as ExtractionProgress;
          handleProgressUpdate(data);
          eventSource.close();
          setIsConnected(false);
        } catch (error) {
          console.error('Failed to parse failed event:', error);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          onError?.(data.error || 'Unknown error');
        } catch {
          // Not a JSON error event, handle as connection error
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Don't reconnect if we've completed
        if (hasCompletedRef.current) {
          return;
        }

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectAttempts++;

          console.log(`SSE disconnected, reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.warn('Max SSE reconnection attempts reached, falling back to polling');
          startPolling();
        }
      };
    };

    connect();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsConnected(false);
    };
  }, [documentId, enabled, usePolling, handleProgressUpdate, onError, startPolling]);

  // Start polling if usePolling is true
  useEffect(() => {
    if (usePolling && documentId && enabled) {
      startPolling();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [usePolling, documentId, enabled, startPolling]);

  return {
    status: state.status,
    progress: state.progress,
    obligationsFound: state.obligationsFound,
    message: state.message || formatStatusMessage(state.status, state.obligationsFound, state.currentPass),
    currentPass: state.currentPass,
    isConnected,
    error: state.error,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
  };
}

/**
 * Format a user-friendly message based on status
 */
function formatStatusMessage(
  status: ExtractionStatus,
  obligationsFound: number,
  currentPass?: string
): string {
  switch (status) {
    case 'queued':
      return 'Document queued for processing...';
    case 'downloading':
      return 'Downloading document from storage...';
    case 'extracting_text':
      return 'Extracting text from document...';
    case 'extracting_obligations':
      const passInfo = currentPass ? ` (${currentPass})` : '';
      if (obligationsFound > 0) {
        return `Extracting obligations${passInfo}... Found ${obligationsFound} so far`;
      }
      return `Extracting obligations${passInfo}...`;
    case 'creating_obligations':
      return `Creating ${obligationsFound} obligations in database...`;
    case 'completed':
      return `Completed! Extracted ${obligationsFound} obligations`;
    case 'failed':
      return 'Extraction failed';
    default:
      return 'Processing...';
  }
}
