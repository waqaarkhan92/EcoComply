/**
 * Calendar Integration Types
 */

export type CalendarProvider = 'google' | 'outlook';

export interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id?: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventMapping {
  id: string;
  integration_id: string;
  obligation_id: string;
  external_event_id: string;
  synced_at: string;
  updated_at: string;
}

export interface Obligation {
  id: string;
  obligation_title: string;
  obligation_description?: string;
  deadline_date?: string;
  deadline_relative?: string;
  category: string;
  site_id: string;
  company_id: string;
  assigned_to?: string;
  status?: string;
  [key: string]: any;
}

export interface SyncResult {
  synced: number;
  failed: number;
}

export interface CalendarConnectionStatus {
  provider: CalendarProvider;
  connected: boolean;
  calendar_id?: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  calendars: Array<{
    id: string;
    name: string;
    primary?: boolean;
    isDefault?: boolean;
  }>;
  error?: string;
}
