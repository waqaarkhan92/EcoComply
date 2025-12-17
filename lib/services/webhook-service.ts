/**
 * Webhook Service
 * Manages outbound webhooks for external integrations
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 14
 */

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';

export type WebhookEventType =
  | 'obligation.created'
  | 'obligation.completed'
  | 'obligation.overdue'
  | 'deadline.approaching'
  | 'deadline.missed'
  | 'evidence.uploaded'
  | 'evidence.linked'
  | 'pack.generated'
  | 'risk_score.changed'
  | 'compliance_score.changed';

export interface WebhookPayload {
  id: string;
  type: WebhookEventType;
  created_at: string;
  company_id: string;
  data: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  headers?: Record<string, string>;
  retry_count: number;
  timeout_ms: number;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateSignature(secret: string, timestamp: string, payload: string): string {
  const data = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

export class WebhookService {
  /**
   * Create a new webhook configuration
   */
  async createWebhook(
    companyId: string,
    config: {
      name: string;
      url: string;
      events: WebhookEventType[];
      headers?: Record<string, string>;
    },
    createdBy: string
  ): Promise<WebhookConfig> {
    const secret = generateWebhookSecret();

    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        company_id: companyId,
        name: config.name,
        url: config.url,
        secret,
        events: config.events,
        headers: config.headers || {},
        is_active: true,
        retry_count: 3,
        timeout_ms: 30000,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create webhook: ${error.message}`);
    }

    return data;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(
    webhookId: string,
    companyId: string,
    updates: {
      name?: string;
      url?: string;
      events?: WebhookEventType[];
      headers?: Record<string, string>;
      is_active?: boolean;
    }
  ): Promise<WebhookConfig> {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update webhook: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string, companyId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('company_id', companyId);

    if (error) {
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }
  }

  /**
   * Get webhooks for a company
   */
  async getWebhooks(companyId: string): Promise<WebhookConfig[]> {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch webhooks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Trigger a webhook event for a company
   */
  async triggerEvent(
    companyId: string,
    eventType: WebhookEventType,
    data: Record<string, any>
  ): Promise<{ triggered: number; failed: number }> {
    // Get active webhooks subscribed to this event
    const { data: webhooks, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (error || !webhooks || webhooks.length === 0) {
      return { triggered: 0, failed: 0 };
    }

    const eventId = `evt_${crypto.randomBytes(16).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const payload: WebhookPayload = {
      id: eventId,
      type: eventType,
      created_at: timestamp,
      company_id: companyId,
      data,
    };

    let triggered = 0;
    let failed = 0;

    for (const webhook of webhooks) {
      try {
        await this.deliverWebhook(webhook, payload);
        triggered++;
      } catch (e) {
        failed++;
        console.error(`Webhook delivery failed for ${webhook.id}:`, e);
      }
    }

    return { triggered, failed };
  }

  /**
   * Deliver webhook to endpoint
   */
  private async deliverWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<void> {
    const payloadJson = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(webhook.secret, timestamp, payloadJson);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': payload.type,
      'X-Webhook-ID': payload.id,
      ...(webhook.headers || {}),
    };

    // Record delivery attempt
    const { data: delivery } = await supabaseAdmin
      .from('webhook_deliveries')
      .insert({
        webhook_id: webhook.id,
        event_type: payload.type,
        event_id: payload.id,
        payload,
      })
      .select('id')
      .single();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadJson,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();

      // Update delivery record
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          response_status: response.status,
          response_body: responseBody.substring(0, 10000), // Limit stored response
          delivered_at: response.ok ? new Date().toISOString() : null,
          failed_at: response.ok ? null : new Date().toISOString(),
          error_message: response.ok ? null : `HTTP ${response.status}`,
        })
        .eq('id', delivery?.id);

      // Update webhook last delivery status
      await supabaseAdmin
        .from('webhooks')
        .update({
          last_delivery_at: new Date().toISOString(),
          last_delivery_status: response.ok ? 'SUCCESS' : 'FAILED',
          failure_count: response.ok ? 0 : supabaseAdmin.rpc('increment_failure_count'),
        })
        .eq('id', webhook.id);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }
    } catch (e: any) {
      // Update delivery with error
      await supabaseAdmin
        .from('webhook_deliveries')
        .update({
          failed_at: new Date().toISOString(),
          error_message: e.message || 'Unknown error',
        })
        .eq('id', delivery?.id);

      throw e;
    }
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(
    webhookId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0 } = options;

    const { data, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Send test event to webhook
   */
  async sendTestEvent(webhookId: string, companyId: string): Promise<{
    success: boolean;
    status?: number;
    error?: string;
  }> {
    const { data: webhook, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('company_id', companyId)
      .single();

    if (error || !webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      id: `test_${crypto.randomBytes(8).toString('hex')}`,
      type: 'obligation.created',
      created_at: new Date().toISOString(),
      company_id: companyId,
      data: {
        test: true,
        message: 'This is a test webhook event from EcoComply',
      },
    };

    try {
      await this.deliverWebhook(webhook, testPayload);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}

export const webhookService = new WebhookService();
