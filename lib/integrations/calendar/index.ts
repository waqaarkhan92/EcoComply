/**
 * Calendar Integration Exports
 */

export { googleCalendarClient, GoogleCalendarClient } from './google-calendar';
export type { GoogleCalendarEvent, GoogleCalendar } from './google-calendar';

export { outlookCalendarClient, OutlookCalendarClient } from './outlook-calendar';
export type { OutlookCalendarEvent, OutlookCalendar } from './outlook-calendar';

export { calendarSyncService, CalendarSyncService } from './calendar-sync-service';

export {
  syncObligationToCalendar,
  removeObligationFromCalendar,
  syncAllUserObligations,
  syncMultipleObligations,
} from './hooks';
