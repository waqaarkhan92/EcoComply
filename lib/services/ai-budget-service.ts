/**
 * AI Budget Service
 * Tracks AI costs per company, manages budgets, and triggers alerts
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// OpenAI pricing per 1M tokens (as of Feb 2025)
export const AI_PRICING = {
  'gpt-4o': {
    input: 2.50, // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  'gpt-4o-mini': {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.50, // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
  },
} as const;

export type AIModel = keyof typeof AI_PRICING;

export interface UsageRecord {
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  operationType: 'extraction' | 'title_generation' | 'validation' | 'other';
  documentType?: 'permit' | 'consent' | 'mcpd';
}

export interface BudgetStatus {
  companyId: string;
  companyName: string;
  budgetLimit: number | null;
  alertThreshold: number;
  hardLimit: boolean;
  currentUsage: number;
  totalTokens: number;
  documentsProcessed: number;
  usagePercent: number | null;
  budgetStatus: 'NO_LIMIT' | 'OK' | 'WARNING' | 'EXCEEDED';
  currentMonth: string;
}

export interface BudgetAlert {
  id: string;
  companyId: string;
  alertType: 'THRESHOLD_WARNING' | 'BUDGET_EXCEEDED' | 'HARD_LIMIT_BLOCKED';
  yearMonth: string;
  thresholdPercent: number;
  currentUsageUsd: number;
  budgetLimitUsd: number;
  usagePercent: number;
  notifiedAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = AI_PRICING[model] || AI_PRICING['gpt-4o-mini'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000; // Round to 4 decimal places
}

/**
 * AI Budget Service Class
 */
export class AIBudgetService {
  /**
   * Get current budget status for a company
   */
  async getBudgetStatus(companyId: string): Promise<BudgetStatus | null> {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('ai_budget_status')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching budget status:', error);
      return null;
    }

    return {
      companyId: data.company_id,
      companyName: data.company_name,
      budgetLimit: data.budget_limit,
      alertThreshold: data.alert_threshold,
      hardLimit: data.ai_budget_hard_limit,
      currentUsage: parseFloat(data.current_usage) || 0,
      totalTokens: parseInt(data.total_tokens) || 0,
      documentsProcessed: parseInt(data.documents_processed) || 0,
      usagePercent: data.usage_percent ? parseFloat(data.usage_percent) : null,
      budgetStatus: data.budget_status,
      currentMonth: data.current_month || new Date().toISOString().slice(0, 7),
    };
  }

  /**
   * Check if AI operations should be blocked due to hard limit
   */
  async isAIBlocked(companyId: string): Promise<{ blocked: boolean; reason?: string }> {
    const status = await this.getBudgetStatus(companyId);

    if (!status) {
      return { blocked: false };
    }

    if (status.hardLimit && status.budgetStatus === 'EXCEEDED') {
      return {
        blocked: true,
        reason: `AI budget exceeded. Monthly limit: $${status.budgetLimit?.toFixed(2)}, Current usage: $${status.currentUsage.toFixed(2)}`,
      };
    }

    return { blocked: false };
  }

  /**
   * Record AI usage and check budget thresholds
   */
  async recordUsage(
    companyId: string,
    usage: UsageRecord
  ): Promise<{ success: boolean; blocked?: boolean; alert?: BudgetAlert }> {
    // Check if blocked before processing
    const blockCheck = await this.isAIBlocked(companyId);
    if (blockCheck.blocked) {
      return {
        success: false,
        blocked: true,
      };
    }

    const supabase = supabaseAdmin;
    const yearMonth = new Date().toISOString().slice(0, 7);
    const cost = calculateCost(usage.model, usage.inputTokens, usage.outputTokens);

    // Update usage (the trigger will handle aggregation)
    // This is called separately from document processing for non-document operations
    const { error } = await supabase.rpc('record_ai_usage', {
      p_company_id: companyId,
      p_year_month: yearMonth,
      p_input_tokens: usage.inputTokens,
      p_output_tokens: usage.outputTokens,
      p_cost_usd: cost,
      p_model: usage.model,
      p_operation_type: usage.operationType,
    });

    if (error) {
      console.error('Error recording AI usage:', error);
      // Continue even if recording fails - don't block operations
    }

    // Check thresholds and create alerts if needed
    const alert = await this.checkAndCreateAlert(companyId);

    return {
      success: true,
      alert: alert || undefined,
    };
  }

  /**
   * Check budget thresholds and create alert if needed
   */
  async checkAndCreateAlert(companyId: string): Promise<BudgetAlert | null> {
    const status = await this.getBudgetStatus(companyId);

    if (!status || !status.budgetLimit || status.budgetStatus === 'NO_LIMIT') {
      return null;
    }

    const supabase = supabaseAdmin;
    const yearMonth = new Date().toISOString().slice(0, 7);

    // Check if we already sent an alert this month for this threshold
    const { data: existingAlerts } = await supabase
      .from('ai_budget_alerts')
      .select('alert_type')
      .eq('company_id', companyId)
      .eq('year_month', yearMonth);

    const existingTypes = new Set(existingAlerts?.map((a: { alert_type: string }) => a.alert_type) || []);

    let alertType: 'THRESHOLD_WARNING' | 'BUDGET_EXCEEDED' | 'HARD_LIMIT_BLOCKED' | null = null;

    // Determine what alert to send
    if (status.budgetStatus === 'EXCEEDED' && !existingTypes.has('BUDGET_EXCEEDED')) {
      alertType = status.hardLimit ? 'HARD_LIMIT_BLOCKED' : 'BUDGET_EXCEEDED';
    } else if (
      status.budgetStatus === 'WARNING' &&
      !existingTypes.has('THRESHOLD_WARNING') &&
      !existingTypes.has('BUDGET_EXCEEDED')
    ) {
      alertType = 'THRESHOLD_WARNING';
    }

    if (!alertType) {
      return null;
    }

    // Create alert record
    const { data: alertData, error: alertError } = await supabase
      .from('ai_budget_alerts')
      .insert({
        company_id: companyId,
        alert_type: alertType,
        year_month: yearMonth,
        threshold_percent: status.alertThreshold,
        current_usage_usd: status.currentUsage,
        budget_limit_usd: status.budgetLimit,
        usage_percent: status.usagePercent || 0,
      })
      .select()
      .single();

    if (alertError) {
      console.error('Error creating budget alert:', alertError);
      return null;
    }

    // Send notification
    await this.sendAlertNotification(companyId, alertType, status);

    return {
      id: alertData.id,
      companyId: alertData.company_id,
      alertType: alertData.alert_type,
      yearMonth: alertData.year_month,
      thresholdPercent: alertData.threshold_percent,
      currentUsageUsd: parseFloat(alertData.current_usage_usd),
      budgetLimitUsd: parseFloat(alertData.budget_limit_usd),
      usagePercent: parseFloat(alertData.usage_percent),
      notifiedAt: alertData.notified_at,
      acknowledgedAt: alertData.acknowledged_at,
      acknowledgedBy: alertData.acknowledged_by,
    };
  }

  /**
   * Send alert notification to company admins
   */
  private async sendAlertNotification(
    companyId: string,
    alertType: string,
    status: BudgetStatus
  ): Promise<void> {
    const supabase = supabaseAdmin;

    // Get admin user IDs first
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['OWNER', 'ADMIN']);

    const adminUserIds = adminRoles?.map((r: { user_id: string }) => r.user_id) || [];

    // Get company admins
    const { data: admins } = adminUserIds.length > 0
      ? await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .in('id', adminUserIds)
      : { data: [] };

    // Get additional alert emails from company settings
    const { data: company } = await supabase
      .from('companies')
      .select('ai_budget_alert_emails')
      .eq('id', companyId)
      .single();

    const additionalEmails = company?.ai_budget_alert_emails || [];

    // Construct notification message
    const messages: Record<string, { subject: string; body: string }> = {
      THRESHOLD_WARNING: {
        subject: `AI Budget Alert: ${status.usagePercent?.toFixed(0)}% of monthly budget used`,
        body: `Your AI usage has reached ${status.usagePercent?.toFixed(0)}% of your monthly budget ($${status.currentUsage.toFixed(2)} of $${status.budgetLimit?.toFixed(2)}). Consider reviewing your document processing activity.`,
      },
      BUDGET_EXCEEDED: {
        subject: 'AI Budget Alert: Monthly budget exceeded',
        body: `Your AI usage has exceeded your monthly budget. Current usage: $${status.currentUsage.toFixed(2)}, Budget: $${status.budgetLimit?.toFixed(2)}. AI operations will continue but you may incur additional charges.`,
      },
      HARD_LIMIT_BLOCKED: {
        subject: 'AI Budget Alert: Operations blocked - Budget exceeded',
        body: `Your AI usage has exceeded your monthly budget and operations have been blocked. Current usage: $${status.currentUsage.toFixed(2)}, Budget: $${status.budgetLimit?.toFixed(2)}. Please contact support or increase your budget to resume AI operations.`,
      },
    };

    const message = messages[alertType];
    if (!message) return;

    // Create in-app notifications for admins
    for (const admin of admins || []) {
      await supabase.from('notifications').insert({
        user_id: admin.id,
        company_id: companyId,
        notification_type: 'AI_BUDGET_ALERT',
        channel: 'IN_APP',
        subject: message.subject,
        message: message.body,
        status: 'PENDING',
        metadata: {
          alert_type: alertType,
          usage_percent: status.usagePercent,
          current_usage: status.currentUsage,
          budget_limit: status.budgetLimit,
        },
      });
    }

    // TODO: Send email notifications to admins and additional emails
    // This would integrate with the email service
    console.log(`📧 AI Budget Alert: ${alertType} for company ${companyId}`);
    console.log(`   Recipients: ${admins?.map((a: { email: string }) => a.email).join(', ')}`);
    console.log(`   Additional: ${additionalEmails.join(', ')}`);
  }

  /**
   * Acknowledge a budget alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const supabase = supabaseAdmin;

    const { error } = await supabase
      .from('ai_budget_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
      })
      .eq('id', alertId);

    return !error;
  }

  /**
   * Get alerts for a company
   */
  async getAlerts(
    companyId: string,
    options?: { yearMonth?: string; unacknowledgedOnly?: boolean }
  ): Promise<BudgetAlert[]> {
    const supabase = supabaseAdmin;

    let query = supabase
      .from('ai_budget_alerts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (options?.yearMonth) {
      query = query.eq('year_month', options.yearMonth);
    }

    if (options?.unacknowledgedOnly) {
      query = query.is('acknowledged_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }

    return (data || []).map((alert: Record<string, unknown>) => ({
      id: alert.id as string,
      companyId: alert.company_id as string,
      alertType: alert.alert_type as BudgetAlert['alertType'],
      yearMonth: alert.year_month as string,
      thresholdPercent: alert.threshold_percent as number,
      currentUsageUsd: parseFloat(String(alert.current_usage_usd)),
      budgetLimitUsd: parseFloat(String(alert.budget_limit_usd)),
      usagePercent: parseFloat(String(alert.usage_percent)),
      notifiedAt: alert.notified_at as string,
      acknowledgedAt: alert.acknowledged_at as string | null,
      acknowledgedBy: alert.acknowledged_by as string | null,
    }));
  }

  /**
   * Update company AI budget configuration
   */
  async updateBudgetConfig(
    companyId: string,
    config: {
      budgetMonthlyUsd?: number | null;
      alertThresholdPercent?: number;
      hardLimit?: boolean;
      alertEmails?: string[];
    }
  ): Promise<boolean> {
    const supabase = supabaseAdmin;

    const updates: Record<string, unknown> = {};

    if (config.budgetMonthlyUsd !== undefined) {
      updates.ai_budget_monthly_usd = config.budgetMonthlyUsd;
    }
    if (config.alertThresholdPercent !== undefined) {
      updates.ai_budget_alert_threshold_percent = config.alertThresholdPercent;
    }
    if (config.hardLimit !== undefined) {
      updates.ai_budget_hard_limit = config.hardLimit;
    }
    if (config.alertEmails !== undefined) {
      updates.ai_budget_alert_emails = config.alertEmails;
    }

    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId);

    return !error;
  }

  /**
   * Get usage history for a company
   */
  async getUsageHistory(
    companyId: string,
    months: number = 12
  ): Promise<
    Array<{
      yearMonth: string;
      totalCost: number;
      totalTokens: number;
      documentCount: number;
      costByModel: { gpt4o: number; gpt4oMini: number; other: number };
    }>
  > {
    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('ai_usage_monthly')
      .select('*')
      .eq('company_id', companyId)
      .order('year_month', { ascending: false })
      .limit(months);

    if (error) {
      console.error('Error fetching usage history:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      yearMonth: row.year_month as string,
      totalCost: parseFloat(String(row.total_cost_usd)),
      totalTokens: parseInt(String(row.total_tokens)),
      documentCount: row.document_count as number,
      costByModel: {
        gpt4o: parseFloat(String(row.cost_gpt4o_usd)),
        gpt4oMini: parseFloat(String(row.cost_gpt4o_mini_usd)),
        other: parseFloat(String(row.cost_other_usd)),
      },
    }));
  }
}

// Singleton instance
let aiBudgetService: AIBudgetService | null = null;

export function getAIBudgetService(): AIBudgetService {
  if (!aiBudgetService) {
    aiBudgetService = new AIBudgetService();
  }
  return aiBudgetService;
}
