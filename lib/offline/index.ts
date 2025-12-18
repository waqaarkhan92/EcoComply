/**
 * Offline utilities
 * Exports for offline support functionality
 */

export {
  offlineStore,
  STORES,
  saveUserData,
  getUserData,
  saveObligations,
  getObligations,
  getObligationsBySite,
  saveEvidence,
  getEvidence,
  getEvidenceByObligation,
  addOfflineRequest,
  getPendingSyncItems,
} from './indexed-db-store';

export type { SyncQueueItem, CacheMetadata } from './indexed-db-store';

export { syncManager, SyncManager } from './sync-manager';
