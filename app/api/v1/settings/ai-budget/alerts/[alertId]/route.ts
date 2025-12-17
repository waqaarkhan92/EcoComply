/**
 * AI Budget Alert API
 * Acknowledge budget alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAIBudgetService } from '@/lib/services/ai-budget-service';

interface RouteParams {
  params: Promise<{
    alertId: string;
  }>;
}

/**
 * POST /api/v1/settings/ai-budget/alerts/[alertId]
 * Acknowledge a budget alert
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { alertId } = await params;
    const supabase = supabaseAdmin;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this alert's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check alert belongs to user's company
    const { data: alert, error: alertError } = await supabase
      .from('ai_budget_alerts')
      .select('company_id')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (alert.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const budgetService = getAIBudgetService();
    const success = await budgetService.acknowledgeAlert(alertId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to acknowledge alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}
