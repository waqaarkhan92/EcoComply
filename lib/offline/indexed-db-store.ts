/**
 * IndexedDB Offline Storage
 * Provides offline data storage and sync queue management
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 19-20
 */

const DB_NAME = 'ecocomply-offline';
const DB_VERSION = 1;

// Object store names
export const STORES = {
  USER_DATA: 'user-data',
  OBLIGATIONS: 'obligations',
  EVIDENCE: 'evidence',
  SYNC_QUEUE: 'sync-queue',
  CACHE_META: 'cache-meta',
} as const;

export interface SyncQueueItem {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'failed' | 'synced';
}

export interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number;
}

class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.OBLIGATIONS)) {
          const obligationsStore = db.createObjectStore(STORES.OBLIGATIONS, { keyPath: 'id' });
          obligationsStore.createIndex('siteId', 'siteId', { unique: false });
          obligationsStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.EVIDENCE)) {
          const evidenceStore = db.createObjectStore(STORES.EVIDENCE, { keyPath: 'id' });
          evidenceStore.createIndex('obligationId', 'obligationId', { unique: false });
          evidenceStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
          const cacheStore = db.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async set<T>(storeName: string, value: T): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setMany<T>(storeName: string, values: T[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      values.forEach((value) => store.put(value));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync queue specific methods
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: SyncQueueItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    await this.set(STORES.SYNC_QUEUE, queueItem);

    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-queue');
      } catch (error) {
        console.error('Failed to register sync:', error);
      }
    }

    return id;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'status', 'pending');
  }

  async updateSyncItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const item = await this.get<SyncQueueItem>(STORES.SYNC_QUEUE, id);
    if (!item) throw new Error('Sync item not found');

    await this.set(STORES.SYNC_QUEUE, { ...item, ...updates });
  }

  async clearSyncedItems(): Promise<void> {
    const syncedItems = await this.getByIndex<SyncQueueItem>(STORES.SYNC_QUEUE, 'status', 'synced');
    await Promise.all(syncedItems.map((item) => this.delete(STORES.SYNC_QUEUE, item.id)));
  }

  // Cache metadata management
  async setCacheMeta(key: string, ttl: number): Promise<void> {
    const meta: CacheMetadata = {
      key,
      timestamp: Date.now(),
      ttl,
    };
    await this.set(STORES.CACHE_META, meta);
  }

  async isCacheValid(key: string): Promise<boolean> {
    const meta = await this.get<CacheMetadata>(STORES.CACHE_META, key);
    if (!meta) return false;
    return Date.now() - meta.timestamp < meta.ttl;
  }

  async cleanExpiredCache(): Promise<void> {
    const allMeta = await this.getAll<CacheMetadata>(STORES.CACHE_META);
    const now = Date.now();
    const expired = allMeta.filter((meta) => now - meta.timestamp >= meta.ttl);

    await Promise.all(expired.map((meta) => this.delete(STORES.CACHE_META, meta.key)));
  }
}

// Singleton instance
export const offlineStore = new IndexedDBStore();

// Convenience methods
export async function saveUserData(userData: any): Promise<void> {
  await offlineStore.set(STORES.USER_DATA, { id: 'current-user', ...userData });
}

export async function getUserData(): Promise<any | null> {
  return offlineStore.get(STORES.USER_DATA, 'current-user');
}

export async function saveObligations(obligations: any[]): Promise<void> {
  await offlineStore.setMany(STORES.OBLIGATIONS, obligations);
}

export async function getObligations(): Promise<any[]> {
  return offlineStore.getAll(STORES.OBLIGATIONS);
}

export async function getObligationsBySite(siteId: string): Promise<any[]> {
  return offlineStore.getByIndex(STORES.OBLIGATIONS, 'siteId', siteId);
}

export async function saveEvidence(evidence: any): Promise<void> {
  await offlineStore.set(STORES.EVIDENCE, evidence);
}

export async function getEvidence(): Promise<any[]> {
  return offlineStore.getAll(STORES.EVIDENCE);
}

export async function getEvidenceByObligation(obligationId: string): Promise<any[]> {
  return offlineStore.getByIndex(STORES.EVIDENCE, 'obligationId', obligationId);
}

export async function addOfflineRequest(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>
): Promise<string> {
  return offlineStore.addToSyncQueue({ url, method, body, headers });
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return offlineStore.getSyncQueue();
}
