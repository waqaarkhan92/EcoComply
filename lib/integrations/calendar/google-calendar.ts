/**
 * Google Calendar Integration
 * Handles OAuth and calendar operations with Google Calendar API
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client | null = null;
  private initialized = false;

  /**
   * Check if Google Calendar integration is configured
   */
  isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }

  /**
   * Initialize the OAuth2 client (lazy initialization)
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL}/api/v1/integrations/calendar/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google Calendar credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    this.initialized = true;
  }

  /**
   * Get the OAuth2 client (ensures initialization)
   */
  private getClient(): OAuth2Client {
    this.ensureInitialized();
    return this.oauth2Client!;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params: any = {
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    };

    if (state) {
      params.state = state;
    }

    return this.getClient().generateAuthUrl(params);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }> {
    try {
      const { tokens } = await this.getClient().getToken(code);

      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
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
    expiry_date?: number;
  }> {
    try {
      const client = this.getClient();
      client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await client.refreshAccessToken();

      return {
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date || undefined,
      };
    } catch (error: any) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  /**
   * Set access token for authenticated requests
   */
  private setAccessToken(accessToken: string, refreshToken?: string) {
    this.getClient().setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * List user's calendars
   */
  async listCalendars(accessToken: string, refreshToken?: string): Promise<GoogleCalendar[]> {
    try {
      this.setAccessToken(accessToken, refreshToken);

      const calendar = google.calendar({ version: 'v3', auth: this.getClient() });
      const response = await calendar.calendarList.list();

      return (response.data.items || []).map(item => ({
        id: item.id!,
        summary: item.summary || 'Untitled Calendar',
        primary: item.primary || undefined,
        accessRole: item.accessRole || 'reader',
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
    event: GoogleCalendarEvent,
    accessToken: string,
    refreshToken?: string
  ): Promise<string> {
    try {
      this.setAccessToken(accessToken, refreshToken);

      const calendar = google.calendar({ version: 'v3', auth: this.getClient() });
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return response.data.id!;
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
    event: GoogleCalendarEvent,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      this.setAccessToken(accessToken, refreshToken);

      const calendar = google.calendar({ version: 'v3', auth: this.getClient() });
      await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      });
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
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    try {
      this.setAccessToken(accessToken, refreshToken);

      const calendar = google.calendar({ version: 'v3', auth: this.getClient() });
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error: any) {
      // Ignore 404 errors (event already deleted)
      if (error.code === 404 || error.message?.includes('404')) {
        return;
      }
      throw new Error(`Failed to delete event: ${error.message}`);
    }
  }
}

// Export singleton instance
export const googleCalendarClient = new GoogleCalendarClient();
