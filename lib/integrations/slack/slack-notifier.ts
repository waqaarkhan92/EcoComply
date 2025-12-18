/**
 * Slack Notifier Service
 * Formats and sends compliance notifications to Slack channels
 */

import { createSlackClient } from './slack-client';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

export interface SlackConfig {
  accessToken: string;
  defaultChannelId: string;
  defaultChannelName?: string;
}

export interface Obligation {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  status: string;
  assignee_name?: string;
  company_name?: string;
}

export interface ComplianceAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  title: string;
  file_name: string;
  uploaded_by_name?: string;
  obligation_title?: string;
  created_at: string;
}

/**
 * Notify about an approaching deadline
 */
export async function notifyDeadlineApproaching(
  slackConfig: SlackConfig,
  obligation: Obligation
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createSlackClient(slackConfig.accessToken);
    const daysUntil = Math.ceil(
      (new Date(obligation.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⏰ Deadline Approaching',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Obligation:*\n${obligation.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Days Until Due:*\n${daysUntil} days`,
          },
          {
            type: 'mrkdwn',
            text: `*Deadline:*\n${format(new Date(obligation.deadline), 'PPP')}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${obligation.status}`,
          },
        ],
      },
    ];

    if (obligation.assignee_name) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Assigned to:* ${obligation.assignee_name}`,
        },
      } as any);
    }

    if (obligation.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${obligation.description.substring(0, 200)}${
            obligation.description.length > 200 ? '...' : ''
          }`,
        },
      } as any);
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🔔 This is a reminder that the deadline is approaching. Please take action soon.`,
        },
      ],
    } as any);

    const text = `Deadline Approaching: ${obligation.title} is due in ${daysUntil} days`;

    return await client.sendMessage(slackConfig.defaultChannelId, text, blocks);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack notifyDeadlineApproaching error');
    return {
      ok: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

/**
 * Notify about an overdue deadline
 */
export async function notifyDeadlineOverdue(
  slackConfig: SlackConfig,
  obligation: Obligation
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createSlackClient(slackConfig.accessToken);
    const daysOverdue = Math.ceil(
      (Date.now() - new Date(obligation.deadline).getTime()) / (1000 * 60 * 60 * 24)
    );

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Deadline Overdue',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Obligation:*\n${obligation.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Days Overdue:*\n${daysOverdue} days`,
          },
          {
            type: 'mrkdwn',
            text: `*Original Deadline:*\n${format(new Date(obligation.deadline), 'PPP')}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${obligation.status}`,
          },
        ],
      },
    ];

    if (obligation.assignee_name) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Assigned to:* ${obligation.assignee_name}`,
        },
      } as any);
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `⚠️ This obligation is overdue and requires immediate attention!`,
        },
      ],
    } as any);

    const text = `OVERDUE: ${obligation.title} is ${daysOverdue} days overdue`;

    return await client.sendMessage(slackConfig.defaultChannelId, text, blocks);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack notifyDeadlineOverdue error');
    return {
      ok: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

/**
 * Notify about a compliance alert
 */
export async function notifyComplianceAlert(
  slackConfig: SlackConfig,
  alert: ComplianceAlert
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createSlackClient(slackConfig.accessToken);

    const severityEmoji = {
      low: '📘',
      medium: '📙',
      high: '📕',
      critical: '🚨',
    };

    const severityColor = {
      low: '#2196F3',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#B71C1C',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[alert.severity]} Compliance Alert - ${alert.severity.toUpperCase()}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Alert:*\n${alert.title}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${alert.severity.toUpperCase()}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${alert.description}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Alert ID: ${alert.id} | Created: ${format(
              new Date(alert.created_at),
              'PPpp'
            )}`,
          },
        ],
      },
    ];

    const text = `${alert.severity.toUpperCase()} Compliance Alert: ${alert.title}`;

    return await client.sendMessage(slackConfig.defaultChannelId, text, blocks);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack notifyComplianceAlert error');
    return {
      ok: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

/**
 * Notify about new evidence uploaded
 */
export async function notifyNewEvidence(
  slackConfig: SlackConfig,
  evidence: Evidence
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createSlackClient(slackConfig.accessToken);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📎 New Evidence Uploaded',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*File Name:*\n${evidence.file_name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Uploaded By:*\n${evidence.uploaded_by_name || 'Unknown'}`,
          },
        ],
      },
    ];

    if (evidence.obligation_title) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Related Obligation:*\n${evidence.obligation_title}`,
        },
      } as any);
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Evidence ID: ${evidence.id} | Uploaded: ${format(
            new Date(evidence.created_at),
            'PPpp'
          )}`,
        },
      ],
    } as any);

    const text = `New evidence uploaded: ${evidence.file_name}${
      evidence.obligation_title ? ` for ${evidence.obligation_title}` : ''
    }`;

    return await client.sendMessage(slackConfig.defaultChannelId, text, blocks);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack notifyNewEvidence error');
    return {
      ok: false,
      error: error.message || 'Failed to send notification',
    };
  }
}

/**
 * Send a custom message to Slack
 */
export async function sendCustomMessage(
  slackConfig: SlackConfig,
  message: string,
  blocks?: any[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = createSlackClient(slackConfig.accessToken);
    return await client.sendMessage(slackConfig.defaultChannelId, message, blocks);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Slack sendCustomMessage error');
    return {
      ok: false,
      error: error.message || 'Failed to send message',
    };
  }
}
