/**
 * Extraction Progress Service
 * Real-time progress tracking for document extraction using Redis pub/sub
 *
 * This enables SaaS-style async processing:
 * - Frontend uploads document → gets immediate response with job ID
 * - Worker processes in background → publishes progress updates to Redis
 * - Frontend polls OR subscribes via SSE → gets real-time "Found 45 obligations..."
 */

import { getRedisConnection } from '@/lib/queue/queue-manager';

export interface ExtractionProgress {
  documentId: string;
  status: 'queued' | 'downloading' | 'extracting_text' | 'extracting_obligations' | 'creating_obligations' | 'completed' | 'failed';
  progress: number; // 0-100
  currentPass?: string; // e.g., "Pass 1: Conditions", "Pass 2: Tables"
  obligationsFound: number;
  message?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

const PROGRESS_KEY_PREFIX = 'extraction:progress:';
const PROGRESS_CHANNEL = 'extraction:progress:updates';
const PROGRESS_TTL = 3600; // 1 hour TTL for progress data

/**
 * Update extraction progress (called from worker)
 */
export async function updateExtractionProgress(
  documentId: string,
  update: Partial<ExtractionProgress>
): Promise<void> {
  const redis = getRedisConnection();
  const key = `${PROGRESS_KEY_PREFIX}${documentId}`;

  // Get existing progress or create new
  const existingJson = await redis.get(key);
  const existing: ExtractionProgress = existingJson
    ? JSON.parse(existingJson)
    : { documentId, status: 'queued', progress: 0, obligationsFound: 0 };

  // Merge update
  const updated: ExtractionProgress = {
    ...existing,
    ...update,
    documentId, // Ensure documentId is always set
  };

  // Store in Redis with TTL
  await redis.setex(key, PROGRESS_TTL, JSON.stringify(updated));

  // Publish update for real-time subscribers
  await redis.publish(PROGRESS_CHANNEL, JSON.stringify({
    type: 'progress',
    documentId,
    data: updated,
    timestamp: Date.now(),
  }));
}

/**
 * Get current extraction progress (for polling)
 */
export async function getExtractionProgress(
  documentId: string
): Promise<ExtractionProgress | null> {
  const redis = getRedisConnection();
  const key = `${PROGRESS_KEY_PREFIX}${documentId}`;

  const data = await redis.get(key);
  if (!data) return null;

  return JSON.parse(data);
}

/**
 * Clear extraction progress (after retrieval or on cleanup)
 */
export async function clearExtractionProgress(documentId: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(`${PROGRESS_KEY_PREFIX}${documentId}`);
}

/**
 * Subscribe to progress updates for a document
 * Returns an async generator that yields progress updates
 */
export async function* subscribeToProgress(
  documentId: string,
  abortSignal?: AbortSignal
): AsyncGenerator<ExtractionProgress> {
  const redis = getRedisConnection().duplicate();

  // Subscribe to the progress channel
  await redis.subscribe(PROGRESS_CHANNEL);

  // Yield current progress first
  const current = await getExtractionProgress(documentId);
  if (current) {
    yield current;

    // If already completed or failed, don't wait for more updates
    if (current.status === 'completed' || current.status === 'failed') {
      await redis.unsubscribe(PROGRESS_CHANNEL);
      redis.disconnect();
      return;
    }
  }

  // Create a promise-based message handler
  const messageQueue: ExtractionProgress[] = [];
  let resolveNext: ((value: ExtractionProgress | null) => void) | null = null;

  redis.on('message', (channel, message) => {
    if (channel !== PROGRESS_CHANNEL) return;

    try {
      const parsed = JSON.parse(message);
      if (parsed.documentId !== documentId) return;

      const progress = parsed.data as ExtractionProgress;

      if (resolveNext) {
        resolveNext(progress);
        resolveNext = null;
      } else {
        messageQueue.push(progress);
      }
    } catch (e) {
      console.error('Failed to parse progress message:', e);
    }
  });

  // Handle abort signal
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      if (resolveNext) {
        resolveNext(null);
      }
    });
  }

  // Yield messages as they arrive
  try {
    while (true) {
      // Check for abort
      if (abortSignal?.aborted) break;

      // Get next message (from queue or wait for one)
      let progress: ExtractionProgress | null = null;

      if (messageQueue.length > 0) {
        progress = messageQueue.shift()!;
      } else {
        progress = await new Promise<ExtractionProgress | null>((resolve) => {
          resolveNext = resolve;

          // Timeout after 30 seconds to prevent hanging
          setTimeout(() => {
            if (resolveNext === resolve) {
              resolveNext = null;
              resolve(null);
            }
          }, 30000);
        });
      }

      if (!progress) {
        // Timeout or abort - check current status
        const current = await getExtractionProgress(documentId);
        if (current && (current.status === 'completed' || current.status === 'failed')) {
          yield current;
          break;
        }
        continue; // Keep waiting
      }

      yield progress;

      // Stop if completed or failed
      if (progress.status === 'completed' || progress.status === 'failed') {
        break;
      }
    }
  } finally {
    await redis.unsubscribe(PROGRESS_CHANNEL);
    redis.disconnect();
  }
}

/**
 * Helper to format progress message for display
 */
export function formatProgressMessage(progress: ExtractionProgress): string {
  switch (progress.status) {
    case 'queued':
      return 'Document queued for processing...';
    case 'downloading':
      return 'Downloading document...';
    case 'extracting_text':
      return 'Extracting text from document...';
    case 'extracting_obligations':
      const passInfo = progress.currentPass ? ` (${progress.currentPass})` : '';
      return `Extracting obligations${passInfo}... Found ${progress.obligationsFound} so far`;
    case 'creating_obligations':
      return `Creating ${progress.obligationsFound} obligations in database...`;
    case 'completed':
      return `Completed! Extracted ${progress.obligationsFound} obligations`;
    case 'failed':
      return `Failed: ${progress.error || 'Unknown error'}`;
    default:
      return progress.message || 'Processing...';
  }
}
