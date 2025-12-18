'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Upload, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPendingSyncItems } from '@/lib/offline/indexed-db-store';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      setIsSyncing(true);

      // Try to sync pending items
      syncPendingItems();

      // Hide after 3 seconds when back online
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending items count
    updatePendingCount();

    // Update pending count every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  async function updatePendingCount() {
    try {
      const items = await getPendingSyncItems();
      setPendingCount(items.length);

      // Show indicator if there are pending items
      if (items.length > 0) {
        setShowIndicator(true);
      }
    } catch (error) {
      console.error('Failed to get pending sync items:', error);
    }
  }

  async function syncPendingItems() {
    try {
      const items = await getPendingSyncItems();

      // Trigger background sync if available
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue');
      }

      // Update count after sync attempt
      setTimeout(() => {
        updatePendingCount();
        setIsSyncing(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to sync pending items:', error);
      setIsSyncing(false);
    }
  }

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0 && !showIndicator) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-16 md:top-4 right-4 z-50 transition-all duration-300 transform',
        showIndicator ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg border backdrop-blur-sm',
          isOnline
            ? 'bg-success/10 border-success text-success'
            : 'bg-warning/10 border-warning text-warning'
        )}
      >
        {isOnline ? (
          <>
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              {isSyncing
                ? 'Syncing...'
                : pendingCount > 0
                ? `Syncing ${pendingCount} item${pendingCount > 1 ? 's' : ''}`
                : 'Back online'}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">You are offline</span>
              {pendingCount > 0 && (
                <span className="text-xs opacity-80">
                  {pendingCount} item{pendingCount > 1 ? 's' : ''} pending sync
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
