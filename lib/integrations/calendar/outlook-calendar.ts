/**
 * Outlook Calendar Integration
 * Handles OAuth and calendar operations with Microsoft Graph API
 */

import { Client } from '@microsoft/microsoft-graph-client';

const SCOPES = ['Calendars.ReadWrite', 'offline_access'];

export interface OutlookCalendarEvent {
  subject: string;
  body?: {
    contentType: 'HTML' | 'Text';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isReminderOn?: boolean;
  reminderMinutesBeforeStart?: number;
}

export interface OutlookCalendar {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
}

export class OutlookCalendarClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tenantId: string;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${process.env.BASE_URL}/api/v1/integrations/calendar/callback`;
    this.tenantId = process.env.MICROSOFT_TENANT_ID || 'common';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Microsoft Calendar credentials not configured');
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: SCOPES.join(' '),
      response_mode: 'query',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            code: code,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
      };
    } catch (error: any) {
      throw new Error(`Failed to exchange token: ${error.message}`);
    }
  }

  /**
   * Refresh expired access token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in?: number;
  }> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        expires_in: data.expires_in,
      };
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Create Graph API client with access token
   */
  private createClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * List user's calendars
   */
  async listCalendars(accessToken: string): Promise<OutlookCalendar[]> {
    try {
      const client = this.createClient(accessToken);
      const response = await client.api('/me/calendars').get();

      return (response.value || []).map((calendar: any) => ({
        id: calendar.id,
        name: calendar.name,
        isDefaultCalendar: calendar.isDefaultCalendar,
        canEdit: calendar.canEdit,
      }));
    } catch (error: any) {
      throw new Error(`Failed to list calendars: ${error.message}`);
    }
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    calendarId: string,
    event: OutlookCalendarEvent,
    accessToken: string
  ): Promise<string> {
    try {
      const client = this.createClient(accessToken);
      const response = await client
        .api(`/me/calendars/${calendarId}/events`)
        .post(event);

      return response.id;
    } catch (error: any) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: OutlookCalendarEvent,
    accessToken: string
  ): Promise<void> {
    try {
      const client = this.createClient(accessToken);
      await client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .patch(event);
    } catch (error: any) {
      throw new Error(`Failed to update event: ${error.message}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    calendarId: string,
    eventId: string,
    accessToken: string
  ): Promise<void> {
    try {
      const client = this.createClient(accessToken);
      await client
        .api(`/me/calendars/${calendarId}/events/${eventId}`)
        .delete();
    } catch (error: any) {
      // Ignore 404 errors (event already deleted)
      if (error.statusCode === 404 || error.message?.includes('404')) {
        return;
      }
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }
}

// Export singleton instance
export const outlookCalendarClient = new OutlookCalendarClient();
