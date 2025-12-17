/**
 * iCal Service
 * Generates iCal feeds for compliance deadlines
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 7
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface ICalEvent {
  uid: string;
  summary: string;
  description: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  categories: string[];
  url?: string;
  alarm?: {
    trigger: string; // e.g., '-P1D' for 1 day before
    action: 'DISPLAY';
    description: string;
  };
}

/**
 * Generate a secure token for calendar access
 */
export function generateCalendarToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Format date for iCal (YYYYMMDD format for all-day events)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format datetime for iCal (YYYYMMDDTHHMMSSZ format)
 */
function formatICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape text for iCal format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold long lines per iCal spec (max 75 chars per line)
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  let result = '';
  let remaining = line;

  while (remaining.length > maxLength) {
    result += remaining.slice(0, maxLength) + '\r\n ';
    remaining = remaining.slice(maxLength);
  }

  return result + remaining;
}

/**
 * Generate iCal content from events
 */
export function generateICalFeed(
  events: ICalEvent[],
  calendarName: string = 'EcoComply Deadlines'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EcoComply//Compliance Calendar//EN',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatICalDateTime(new Date())}`);
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(event.dtstart)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(event.dtend)}`);
    lines.push(foldLine(`SUMMARY:${escapeICalText(event.summary)}`));

    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICalText(event.description)}`));
    }

    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeICalText(event.location)}`));
    }

    if (event.categories.length > 0) {
      lines.push(`CATEGORIES:${event.categories.map(escapeICalText).join(',')}`);
    }

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    if (event.alarm) {
      lines.push('BEGIN:VALARM');
      lines.push(`TRIGGER:${event.alarm.trigger}`);
      lines.push(`ACTION:${event.alarm.action}`);
      lines.push(foldLine(`DESCRIPTION:${escapeICalText(event.alarm.description)}`));
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export class ICalService {
  /**
   * Create a calendar token for a user
   */
  async createUserToken(
    companyId: string,
    userId: string,
    name?: string
  ): Promise<{ token: string; id: string }> {
    const token = generateCalendarToken();

    const { data, error } = await supabaseAdmin
      .from('calendar_tokens')
      .insert({
        company_id: companyId,
        user_id: userId,
        token,
        token_type: 'USER',
        name: name || 'Personal Calendar',
      })
      .select('id, token')
      .single();

    if (error) {
      throw new Error(`Failed to create calendar token: ${error.message}`);
    }

    return { token: data.token, id: data.id };
  }

  /**
   * Create a calendar token for a site
   */
  async createSiteToken(
    companyId: string,
    siteId: string,
    name?: string
  ): Promise<{ token: string; id: string }> {
    const token = generateCalendarToken();

    const { data, error } = await supabaseAdmin
      .from('calendar_tokens')
      .insert({
        company_id: companyId,
        site_id: siteId,
        token,
        token_type: 'SITE',
        name: name || 'Site Calendar',
      })
      .select('id, token')
      .single();

    if (error) {
      throw new Error(`Failed to create calendar token: ${error.message}`);
    }

    return { token: data.token, id: data.id };
  }

  /**
   * Validate a calendar token and return its details
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    companyId?: string;
    userId?: string;
    siteId?: string;
    tokenType?: string;
  }> {
    const { data, error } = await supabaseAdmin
      .from('calendar_tokens')
      .select('company_id, user_id, site_id, token_type, expires_at')
      .eq('token', token)
      .single();

    if (error || !data) {
      return { valid: false };
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false };
    }

    // Update last accessed
    await supabaseAdmin
      .from('calendar_tokens')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: supabaseAdmin.rpc('increment_access_count'),
      })
      .eq('token', token);

    return {
      valid: true,
      companyId: data.company_id,
      userId: data.user_id,
      siteId: data.site_id,
      tokenType: data.token_type,
    };
  }

  /**
   * Generate iCal feed for a user's deadlines
   */
  async generateUserFeed(
    companyId: string,
    userId: string,
    daysAhead: number = 90
  ): Promise<string> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get user's assigned sites or all sites if admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isAdmin = userRoles?.role === 'OWNER' || userRoles?.role === 'ADMIN';

    let siteIds: string[] = [];

    if (!isAdmin) {
      const { data: assignments } = await supabaseAdmin
        .from('user_site_assignments')
        .select('site_id')
        .eq('user_id', userId);

      siteIds = assignments?.map(a => a.site_id) || [];
    }

    // Fetch deadlines
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        status,
        obligations!inner(
          id,
          obligation_title,
          obligation_description,
          category,
          site_id,
          sites!inner(name)
        )
      `)
      .eq('obligations.company_id', companyId)
      .eq('status', 'PENDING')
      .gte('due_date', new Date().toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (!isAdmin && siteIds.length > 0) {
      query = query.in('obligations.site_id', siteIds);
    }

    const { data: deadlines, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines: ${error.message}`);
    }

    // Convert to iCal events
    const events: ICalEvent[] = (deadlines || []).map((deadline: any) => {
      const obligation = deadline.obligations;
      const site = obligation.sites;
      const dueDate = new Date(deadline.due_date);
      const endDate = new Date(dueDate);
      endDate.setDate(endDate.getDate() + 1); // All-day events need next day as end

      return {
        uid: `deadline-${deadline.id}@ecocomply.com`,
        summary: `[${site.name}] ${obligation.obligation_title || 'Compliance Deadline'}`,
        description: obligation.obligation_description || obligation.obligation_title || '',
        dtstart: dueDate,
        dtend: endDate,
        location: site.name,
        categories: [obligation.category || 'Compliance'].filter(Boolean),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/obligations/${obligation.id}`,
        alarm: {
          trigger: '-P1D',
          action: 'DISPLAY',
          description: `Reminder: ${obligation.obligation_title || 'Compliance deadline'} due tomorrow`,
        },
      };
    });

    return generateICalFeed(events, 'EcoComply - My Deadlines');
  }

  /**
   * Generate iCal feed for a site's deadlines
   */
  async generateSiteFeed(
    companyId: string,
    siteId: string,
    daysAhead: number = 90
  ): Promise<string> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get site name
    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('name')
      .eq('id', siteId)
      .eq('company_id', companyId)
      .single();

    if (!site) {
      throw new Error('Site not found');
    }

    // Fetch deadlines for site
    const { data: deadlines, error } = await supabaseAdmin
      .from('deadlines')
      .select(`
        id,
        due_date,
        status,
        obligations!inner(
          id,
          obligation_title,
          obligation_description,
          category,
          site_id
        )
      `)
      .eq('obligations.site_id', siteId)
      .eq('status', 'PENDING')
      .gte('due_date', new Date().toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch deadlines: ${error.message}`);
    }

    // Convert to iCal events
    const events: ICalEvent[] = (deadlines || []).map((deadline: any) => {
      const obligation = deadline.obligations;
      const dueDate = new Date(deadline.due_date);
      const endDate = new Date(dueDate);
      endDate.setDate(endDate.getDate() + 1);

      return {
        uid: `deadline-${deadline.id}@ecocomply.com`,
        summary: obligation.obligation_title || 'Compliance Deadline',
        description: obligation.obligation_description || '',
        dtstart: dueDate,
        dtend: endDate,
        location: site.name,
        categories: [obligation.category || 'Compliance'].filter(Boolean),
        url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/obligations/${obligation.id}`,
        alarm: {
          trigger: '-P1D',
          action: 'DISPLAY',
          description: `Reminder: ${obligation.obligation_title || 'Compliance deadline'} due tomorrow`,
        },
      };
    });

    return generateICalFeed(events, `EcoComply - ${site.name}`);
  }

  /**
   * Revoke a calendar token
   */
  async revokeToken(tokenId: string, companyId: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('calendar_tokens')
      .delete()
      .eq('id', tokenId)
      .eq('company_id', companyId);

    return !error;
  }

  /**
   * List calendar tokens for a user
   */
  async listUserTokens(userId: string, companyId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('calendar_tokens')
      .select('id, name, token_type, site_id, last_accessed_at, access_count, created_at')
      .eq('company_id', companyId)
      .or(`user_id.eq.${userId},token_type.eq.SITE`);

    if (error) {
      throw new Error(`Failed to list tokens: ${error.message}`);
    }

    return data || [];
  }
}

export const icalService = new ICalService();
