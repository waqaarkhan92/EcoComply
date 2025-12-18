/**
 * Calendar Sync Service
 * Synchronizes obligation deadlines with Google Calendar and Outlook
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { googleCalendarClient, GoogleCalendarEvent } from './google-calendar';
import { outlookCalendarClient, OutlookCalendarEvent } from './outlook-calendar';
import { format, parseISO, addDays } from 'date-fns';

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: 'google' | 'outlook';
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id?: string;
  sync_enabled: boolean;
}

interface Obligation {
  id: string;
  obligation_title: string;
  obligation_description?: string;
  deadline_date?: string;
  deadline_relative?: string;
  category: string;
  site_id: string;
  company_id: string;
}

export class CalendarSyncService {
  /**
   * Sync a single deadline to user's calendar
   */
  async syncDeadlineToCalendar(userId: string, obligation: Obligation): Promise<void> {
    try {
      const supabase = supabaseAdmin;

      // Get user's active calendar integrations
      const { data: integrations, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('sync_enabled', true);

      if (error) {
        throw new Error(`Failed to fetch integrations: ${error.message}`);
      }

      if (!integrations || integrations.length === 0) {
        return; // No integrations to sync
      }

      // Sync to each integration
      for (const integration of integrations) {
        await this.syncToIntegration(integration, obligation);
      }
    } catch (error: any) {
      console.error('Failed to sync deadline to calendar:', error);
      throw error;
    }
  }

  /**
   * Sync obligation to a specific integration
   */
  private async syncToIntegration(
    integration: CalendarIntegration,
    obligation: Obligation
  ): Promise<void> {
    const supabase = supabaseAdmin;

    try {
      // Check if token needs refresh
      const accessToken = await this.getValidAccessToken(integration);

      // Check if event already exists
      const { data: existingMapping } = await supabase
        .from('calendar_event_mappings')
        .select('*')
        .eq('integration_id', integration.id)
        .eq('obligation_id', obligation.id)
        .single();

      if (existingMapping) {
        // Update existing event
        await this.updateEvent(integration, existingMapping.external_event_id, obligation, accessToken);
      } else {
        // Create new event
        const eventId = await this.createEvent(integration, obligation, accessToken);

        // Store mapping
        await supabase
          .from('calendar_event_mappings')
          .insert({
            integration_id: integration.id,
            obligation_id: obligation.id,
            external_event_id: eventId,
          });
      }

      // Update last synced time
      await supabase
        .from('calendar_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', integration.id);
    } catch (error: any) {
      console.error(`Failed to sync to ${integration.provider}:`, error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if expired)
   */
  private async getValidAccessToken(integration: CalendarIntegration): Promise<string> {
    // Check if token is expired
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at);
      const now = new Date();

      // Refresh if expired or expiring in next 5 minutes
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        return await this.refreshAccessToken(integration);
      }
    }

    return integration.access_token;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(integration: CalendarIntegration): Promise<string> {
    if (!integration.refresh_token) {
      throw new Error('No refresh token available');
    }

    const supabase = supabaseAdmin;

    try {
      let newAccessToken: string;
      let expiresIn: number | undefined;

      if (integration.provider === 'google') {
        const tokens = await googleCalendarClient.refreshToken(integration.refresh_token);
        newAccessToken = tokens.access_token;
        expiresIn = tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : undefined;
      } else {
        const tokens = await outlookCalendarClient.refreshToken(integration.refresh_token);
        newAccessToken = tokens.access_token;
        expiresIn = tokens.expires_in;
      }

      // Update stored token
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

      await supabase
        .from('calendar_integrations')
        .update({
          access_token: newAccessToken,
          token_expires_at: expiresAt,
        })
        .eq('id', integration.id);

      return newAccessToken;
    } catch (error: any) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Create calendar event
   */
  private async createEvent(
    integration: CalendarIntegration,
    obligation: Obligation,
    accessToken: string
  ): Promise<string> {
    if (!integration.calendar_id) {
      throw new Error('No calendar selected');
    }

    if (!obligation.deadline_date) {
      throw new Error('Obligation has no deadline date');
    }

    const deadlineDate = parseISO(obligation.deadline_date);

    if (integration.provider === 'google') {
      const event: GoogleCalendarEvent = {
        summary: obligation.obligation_title,
        description: obligation.obligation_description || `Category: ${obligation.category}`,
        start: {
          date: format(deadlineDate, 'yyyy-MM-dd'),
        },
        end: {
          date: format(addDays(deadlineDate, 1), 'yyyy-MM-dd'),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 }, // 7 days before
            { method: 'popup', minutes: 24 * 60 * 3 }, // 3 days before
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
          ],
        },
      };

      return await googleCalendarClient.createEvent(
        integration.calendar_id,
        event,
        accessToken,
        integration.refresh_token
      );
    } else {
      const event: OutlookCalendarEvent = {
        subject: obligation.obligation_title,
        body: {
          contentType: 'Text',
          content: obligation.obligation_description || `Category: ${obligation.category}`,
        },
        start: {
          dateTime: format(deadlineDate, "yyyy-MM-dd'T'00:00:00"),
          timeZone: 'UTC',
        },
        end: {
          dateTime: format(addDays(deadlineDate, 1), "yyyy-MM-dd'T'00:00:00"),
          timeZone: 'UTC',
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 24 * 60 * 7, // 7 days before
      };

      return await outlookCalendarClient.createEvent(
        integration.calendar_id,
        event,
        accessToken
      );
    }
  }

  /**
   * Update calendar event
   */
  private async updateEvent(
    integration: CalendarIntegration,
    eventId: string,
    obligation: Obligation,
    accessToken: string
  ): Promise<void> {
    if (!integration.calendar_id) {
      throw new Error('No calendar selected');
    }

    if (!obligation.deadline_date) {
      throw new Error('Obligation has no deadline date');
    }

    const deadlineDate = parseISO(obligation.deadline_date);

    if (integration.provider === 'google') {
      const event: GoogleCalendarEvent = {
        summary: obligation.obligation_title,
        description: obligation.obligation_description || `Category: ${obligation.category}`,
        start: {
          date: format(deadlineDate, 'yyyy-MM-dd'),
        },
        end: {
          date: format(addDays(deadlineDate, 1), 'yyyy-MM-dd'),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 * 7 },
            { method: 'popup', minutes: 24 * 60 * 3 },
            { method: 'popup', minutes: 24 * 60 },
          ],
        },
      };

      await googleCalendarClient.updateEvent(
        integration.calendar_id,
        eventId,
        event,
        accessToken,
        integration.refresh_token
      );
    } else {
      const event: OutlookCalendarEvent = {
        subject: obligation.obligation_title,
        body: {
          contentType: 'Text',
          content: obligation.obligation_description || `Category: ${obligation.category}`,
        },
        start: {
          dateTime: format(deadlineDate, "yyyy-MM-dd'T'00:00:00"),
          timeZone: 'UTC',
        },
        end: {
          dateTime: format(addDays(deadlineDate, 1), "yyyy-MM-dd'T'00:00:00"),
          timeZone: 'UTC',
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 24 * 60 * 7,
      };

      await outlookCalendarClient.updateEvent(
        integration.calendar_id,
        eventId,
        event,
        accessToken
      );
    }
  }

  /**
   * Remove deadline from calendar
   */
  async removeDeadlineFromCalendar(userId: string, obligationId: string): Promise<void> {
    try {
      const supabase = supabaseAdmin;

      // Get all event mappings for this obligation
      const { data: mappings, error } = await supabase
        .from('calendar_event_mappings')
        .select('*, calendar_integrations(*)')
        .eq('obligation_id', obligationId);

      if (error) {
        throw new Error(`Failed to fetch mappings: ${error.message}`);
      }

      if (!mappings || mappings.length === 0) {
        return; // No events to delete
      }

      // Delete events from calendars
      for (const mapping of mappings) {
        const integration = mapping.calendar_integrations as unknown as CalendarIntegration;

        if (!integration || integration.user_id !== userId) {
          continue;
        }

        try {
          const accessToken = await this.getValidAccessToken(integration);

          if (integration.calendar_id) {
            if (integration.provider === 'google') {
              await googleCalendarClient.deleteEvent(
                integration.calendar_id,
                mapping.external_event_id,
                accessToken,
                integration.refresh_token
              );
            } else {
              await outlookCalendarClient.deleteEvent(
                integration.calendar_id,
                mapping.external_event_id,
                accessToken
              );
            }
          }
        } catch (error) {
          console.error('Failed to delete event:', error);
          // Continue with deletion even if calendar deletion fails
        }

        // Delete mapping
        await supabase
          .from('calendar_event_mappings')
          .delete()
          .eq('id', mapping.id);
      }
    } catch (error: any) {
      console.error('Failed to remove deadline from calendar:', error);
      throw error;
    }
  }

  /**
   * Sync all deadlines for a user
   */
  async syncAllDeadlines(userId: string): Promise<{ synced: number; failed: number }> {
    try {
      const supabase = supabaseAdmin;

      // Get user's obligations with deadlines
      const { data: obligations, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('assigned_to', userId)
        .not('deadline_date', 'is', null)
        .eq('status', 'PENDING');

      if (error) {
        throw new Error(`Failed to fetch obligations: ${error.message}`);
      }

      if (!obligations || obligations.length === 0) {
        return { synced: 0, failed: 0 };
      }

      let synced = 0;
      let failed = 0;

      for (const obligation of obligations) {
        try {
          await this.syncDeadlineToCalendar(userId, obligation);
          synced++;
        } catch (error) {
          console.error(`Failed to sync obligation ${obligation.id}:`, error);
          failed++;
        }
      }

      return { synced, failed };
    } catch (error: any) {
      console.error('Failed to sync all deadlines:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const calendarSyncService = new CalendarSyncService();
