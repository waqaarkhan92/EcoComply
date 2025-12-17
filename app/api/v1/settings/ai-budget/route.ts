/**
 * AI Budget Settings API
 * Manage AI budget configuration, view usage, and handle alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAIBudgetService } from '@/lib/services/ai-budget-service';

/**
 * GET /api/v1/settings/ai-budget
 * Get current AI budget status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const budgetService = getAIBudgetService();

    // Get current budget status
    const status = await budgetService.getBudgetStatus(userData.company_id);

    // Get usage history (last 12 months)
    const history = await budgetService.getUsageHistory(userData.company_id, 12);

    // Get unacknowledged alerts
    const alerts = await budgetService.getAlerts(userData.company_id, {
      unacknowledgedOnly: true,
    });

    // Get company config
    const { data: company } = await supabase
      .from('companies')
      .select(
        'ai_budget_monthly_usd, ai_budget_alert_threshold_percent, ai_budget_hard_limit, ai_budget_alert_emails'
      )
      .eq('id', userData.company_id)
      .single();

    return NextResponse.json({
      status,
      config: {
        budgetMonthlyUsd: company?.ai_budget_monthly_usd,
        alertThresholdPercent: company?.ai_budget_alert_threshold_percent || 80,
        hardLimit: company?.ai_budget_hard_limit || false,
        alertEmails: company?.ai_budget_alert_emails || [],
      },
      history,
      alerts,
    });
  } catch (error: unknown) {
    console.error('Error fetching AI budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI budget settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/settings/ai-budget
 * Update AI budget configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company and check if admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is admin/owner
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['OWNER', 'ADMIN']);

    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { error: 'Only admins can modify AI budget settings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      budgetMonthlyUsd,
      alertThresholdPercent,
      hardLimit,
      alertEmails,
    } = body;

    // Validate input
    if (budgetMonthlyUsd !== undefined && budgetMonthlyUsd !== null) {
      if (typeof budgetMonthlyUsd !== 'number' || budgetMonthlyUsd < 0) {
        return NextResponse.json(
          { error: 'Budget must be a positive number or null' },
          { status: 400 }
        );
      }
    }

    if (alertThresholdPercent !== undefined) {
      if (
        typeof alertThresholdPercent !== 'number' ||
        alertThresholdPercent < 1 ||
        alertThresholdPercent > 100
      ) {
        return NextResponse.json(
          { error: 'Alert threshold must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (alertEmails !== undefined) {
      if (!Array.isArray(alertEmails)) {
        return NextResponse.json(
          { error: 'Alert emails must be an array' },
          { status: 400 }
        );
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of alertEmails) {
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { error: `Invalid email format: ${email}` },
            { status: 400 }
          );
        }
      }
    }

    const budgetService = getAIBudgetService();
    const success = await budgetService.updateBudgetConfig(userData.company_id, {
      budgetMonthlyUsd,
      alertThresholdPercent,
      hardLimit,
      alertEmails,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update budget configuration' },
        { status: 500 }
      );
    }

    // Return updated status
    const status = await budgetService.getBudgetStatus(userData.company_id);

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: unknown) {
    console.error('Error updating AI budget:', error);
    return NextResponse.json(
      { error: 'Failed to update AI budget settings' },
      { status: 500 }
    );
  }
}
