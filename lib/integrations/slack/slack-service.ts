/**
 * Slack Service
 * Helper functions to interact with Slack integrations
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { SlackConfig } from './slack-notifier';

/**
 * Get Slack configuration for a company
 */
export async function getSlackConfig(companyId: string): Promise<SlackConfig | null> {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('slack_integrations')
      .select('access_token, default_channel_id, default_channel_name')
      .eq('company_id', companyId)
      .single();

    if (error || !integration) {
      logger.debug({ companyId }, 'No Slack integration found for company');
      return null;
    }

    if (!integration.default_channel_id) {
      logger.debug({ companyId }, 'Slack integration exists but no default channel set');
      return null;
    }

    return {
      accessToken: integration.access_token,
      defaultChannelId: integration.default_channel_id,
      defaultChannelName: integration.default_channel_name || undefined,
    };
  } catch (error: any) {
    logger.error({ error: error.message, companyId }, 'Error fetching Slack config');
    return null;
  }
}

/**
 * Check if a company has Slack integration enabled
 */
export async function hasSlackIntegration(companyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('slack_integrations')
      .select('id')
      .eq('company_id', companyId)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Get notification settings for a company's Slack integration
 */
export async function getNotificationSettings(companyId: string): Promise<{
  deadline_reminders: boolean;
  overdue_alerts: boolean;
  compliance_alerts: boolean;
  evidence_uploads: boolean;
} | null> {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('slack_integrations')
      .select('notification_settings')
      .eq('company_id', companyId)
      .single();

    if (error || !integration) {
      return null;
    }

    return integration.notification_settings as any;
  } catch (error: any) {
    logger.error({ error: error.message, companyId }, 'Error fetching notification settings');
    return null;
  }
}

/**
 * Check if a specific notification type is enabled
 */
export async function isNotificationEnabled(
  companyId: string,
  notificationType: 'deadline_reminders' | 'overdue_alerts' | 'compliance_alerts' | 'evidence_uploads'
): Promise<boolean> {
  const settings = await getNotificationSettings(companyId);
  return settings?.[notificationType] || false;
}
