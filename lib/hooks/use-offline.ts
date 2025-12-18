/**
 * useOffline Hook
 * Manages offline state and sync queue
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { addOfflineRequest, getPendingSyncItems, type SyncQueueItem } from '@/lib/offline/indexed-db-store';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Update pending count
    updatePendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingCount = useCallback(async () => {
    try {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);
    } catch (error) {
      console.error('Failed to get pending sync items:', error);
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    setIsSyncing(true);
    try {
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue');
      }

      // Update count after sync
      setTimeout(updatePendingCount, 2000);
    } catch (error) {
      console.error('Failed to sync queue:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [updatePendingCount]);

  const queueRequest = useCallback(
    async (url: string, method: string, body?: any, headers?: Record<string, string>) => {
      try {
        const id = await addOfflineRequest(url, method, body, headers);
        await updatePendingCount();
        return id;
      } catch (error) {
        console.error('Failed to queue request:', error);
        throw error;
      }
    },
    [updatePendingCount]
  );

  return {
    isOnline,
    isOffline: !isOnline,
    pendingCount,
    isSyncing,
    queueRequest,
    syncQueue,
  };
}
