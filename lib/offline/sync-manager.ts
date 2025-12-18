/**
 * Sync Manager
 * Handles synchronization of offline data with the server
 */

import { offlineStore, STORES, type SyncQueueItem } from './indexed-db-store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class SyncManager {
  private isSyncing = false;

  async syncAll(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Cannot sync while offline');
      return;
    }

    this.isSyncing = true;

    try {
      const queue = await offlineStore.getSyncQueue();
      console.log(`Syncing ${queue.length} items`);

      for (const item of queue) {
        await this.syncItem(item);
      }

      // Clean up synced items
      await offlineStore.clearSyncedItems();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    if (item.retries >= MAX_RETRIES) {
      console.error(`Max retries reached for item ${item.id}`);
      await offlineStore.updateSyncItem(item.id, { status: 'failed' });
      return;
    }

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });

      if (response.ok) {
        await offlineStore.updateSyncItem(item.id, { status: 'synced' });
        console.log(`Successfully synced item ${item.id}`);
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);

      // Increment retry count
      await offlineStore.updateSyncItem(item.id, {
        retries: item.retries + 1,
      });

      // Retry after delay
      if (item.retries + 1 < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        await this.syncItem({
          ...item,
          retries: item.retries + 1,
        });
      } else {
        await offlineStore.updateSyncItem(item.id, { status: 'failed' });
      }
    }
  }

  async syncUserData(): Promise<void> {
    // Sync user-specific data from IndexedDB to server
    const userData = await offlineStore.get(STORES.USER_DATA, 'current-user');
    if (!userData) return;

    // Implementation depends on your API structure
    console.log('Syncing user data', userData);
  }

  async syncObligations(): Promise<void> {
    // Sync obligations that were modified offline
    const obligations = await offlineStore.getAll(STORES.OBLIGATIONS);
    console.log(`Syncing ${obligations.length} obligations`);

    // Implementation depends on your API structure
  }

  async syncEvidence(): Promise<void> {
    // Sync evidence that was uploaded offline
    const evidence = await offlineStore.getAll(STORES.EVIDENCE);
    console.log(`Syncing ${evidence.length} evidence items`);

    // Implementation depends on your API structure
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, starting sync...');
    syncManager.syncAll();
  });
}
