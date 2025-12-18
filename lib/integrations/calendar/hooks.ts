/**
 * Calendar Integration Hooks
 * Automatic hooks for syncing obligations to calendars
 */

import { calendarSyncService } from './calendar-sync-service';

/**
 * Hook to sync obligation to calendar after creation/update
 * Call this after successfully creating or updating an obligation
 */
export async function syncObligationToCalendar(obligation: {
  id: string;
  obligation_title: string;
  obligation_description?: string;
  deadline_date?: string;
  category: string;
  site_id: string;
  company_id: string;
  assigned_to?: string;
  [key: string]: any;
}): Promise<void> {
  // Only sync if obligation has a deadline and is assigned
  if (!obligation.deadline_date || !obligation.assigned_to) {
    return;
  }

  try {
    await calendarSyncService.syncDeadlineToCalendar(
      obligation.assigned_to,
      obligation
    );
  } catch (error) {
    // Log error but don't throw - calendar sync should not block obligation operations
    console.error('Failed to sync obligation to calendar:', error);
  }
}

/**
 * Hook to remove obligation from calendar after deletion
 * Call this after successfully deleting an obligation
 */
export async function removeObligationFromCalendar(
  obligationId: string,
  userId: string
): Promise<void> {
  try {
    await calendarSyncService.removeDeadlineFromCalendar(userId, obligationId);
  } catch (error) {
    // Log error but don't throw
    console.error('Failed to remove obligation from calendar:', error);
  }
}

/**
 * Hook to sync all obligations for a user
 * Useful after connecting a new calendar integration
 */
export async function syncAllUserObligations(userId: string): Promise<{
  synced: number;
  failed: number;
}> {
  try {
    return await calendarSyncService.syncAllDeadlines(userId);
  } catch (error) {
    console.error('Failed to sync all obligations:', error);
    return { synced: 0, failed: 0 };
  }
}

/**
 * Batch sync multiple obligations
 * Useful for bulk operations
 */
export async function syncMultipleObligations(
  obligations: Array<{
    id: string;
    obligation_title: string;
    obligation_description?: string;
    deadline_date?: string;
    category: string;
    site_id: string;
    company_id: string;
    assigned_to?: string;
    [key: string]: any;
  }>
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const obligation of obligations) {
    if (obligation.deadline_date && obligation.assigned_to) {
      try {
        await calendarSyncService.syncDeadlineToCalendar(
          obligation.assigned_to,
          obligation
        );
        synced++;
      } catch (error) {
        console.error(`Failed to sync obligation ${obligation.id}:`, error);
        failed++;
      }
    }
  }

  return { synced, failed };
}
