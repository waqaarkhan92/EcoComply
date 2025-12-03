/**
 * Escalation Workflow Service
 * Implements configurable escalation workflows per Product Business Logic Specification B.6.4
 * Reference: docs/specs/30_Product_Business_Logic.md Section B.6.4
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface EscalationWorkflow {
  id: string;
  company_id: string;
  obligation_category: string | null;
  level_1_days: number;
  level_2_days: number;
  level_3_days: number;
  level_4_days: number;
  level_1_recipients: string[];
  level_2_recipients: string[];
  level_3_recipients: string[];
  level_4_recipients: string[];
  is_active: boolean;
}

export interface EscalationMatchResult {
  workflow: EscalationWorkflow | null;
  escalationLevel: number;
  daysOverdue: number;
}

/**
 * Match overdue entity to escalation workflow
 * Priority 1: Match by obligation_category (if entity has category AND workflow has category filter)
 * Priority 2: Match by company (if no category-specific workflow found, use company default workflow with obligation_category = NULL)
 */
export async function matchEscalationWorkflow(
  companyId: string,
  obligationCategory: string | null,
  daysOverdue: number
): Promise<EscalationWorkflow | null> {
  // Priority 1: Try to find category-specific workflow
  if (obligationCategory) {
    const { data: categoryWorkflow, error: categoryError } = await supabaseAdmin
      .from('escalation_workflows')
      .select('*')
      .eq('company_id', companyId)
      .eq('obligation_category', obligationCategory)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!categoryError && categoryWorkflow) {
      return categoryWorkflow as EscalationWorkflow;
    }
  }

  // Priority 2: Find company default workflow (obligation_category = NULL)
  const { data: defaultWorkflow, error: defaultError } = await supabaseAdmin
    .from('escalation_workflows')
    .select('*')
    .eq('company_id', companyId)
    .is('obligation_category', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!defaultError && defaultWorkflow) {
    return defaultWorkflow as EscalationWorkflow;
  }

  // No workflow found - return null (will use system default)
  return null;
}

/**
 * Determine escalation level based on days overdue and workflow thresholds
 */
export function determineEscalationLevel(
  daysOverdue: number,
  workflow: EscalationWorkflow
): number {
  if (daysOverdue >= workflow.level_4_days) return 4;
  if (daysOverdue >= workflow.level_3_days) return 3;
  if (daysOverdue >= workflow.level_2_days) return 2;
  if (daysOverdue >= workflow.level_1_days) return 1;
  return 0; // Not yet reached threshold
}

/**
 * Get escalation recipients for a level from workflow
 */
export async function getEscalationRecipientsFromWorkflow(
  workflow: EscalationWorkflow,
  level: number
): Promise<Array<{ userId: string; email: string }>> {
  let recipientIds: string[] = [];
  
  switch (level) {
    case 1:
      recipientIds = workflow.level_1_recipients || [];
      break;
    case 2:
      recipientIds = workflow.level_2_recipients || [];
      break;
    case 3:
      recipientIds = workflow.level_3_recipients || [];
      break;
    case 4:
      recipientIds = workflow.level_4_recipients || [];
      break;
    default:
      return [];
  }

  if (recipientIds.length === 0) {
    return [];
  }

  // Get user details for recipient IDs
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .in('id', recipientIds)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching escalation recipients:', error);
    return [];
  }

  return (users || []).map((u: any) => ({
    userId: u.id,
    email: u.email,
  }));
}

/**
 * Get current escalation level for an entity
 * Note: escalations table uses obligation_id, so for deadlines we need to get the obligation_id first
 */
export async function getCurrentEscalationLevel(
  entityType: 'obligation' | 'deadline',
  entityId: string
): Promise<number> {
  let obligationId: string | null = null;

  if (entityType === 'obligation') {
    obligationId = entityId;
  } else if (entityType === 'deadline') {
    // Get obligation_id from deadline
    const { data: deadline } = await supabaseAdmin
      .from('deadlines')
      .select('obligation_id')
      .eq('id', entityId)
      .single();

    if (!deadline) {
      return 0;
    }
    obligationId = deadline.obligation_id;
  }

  if (!obligationId) {
    return 0;
  }

  const { data: escalation, error } = await supabaseAdmin
    .from('escalations')
    .select('current_level')
    .eq('obligation_id', obligationId)
    .is('resolved_at', null) // Only active escalations
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !escalation) {
    return 0; // No escalation yet
  }

  return escalation.current_level || 0;
}

/**
 * Create or update escalation record
 * Enforces sequential level progression (cannot skip levels)
 * Note: escalations table uses obligation_id, so for deadlines we need to get the obligation_id first
 */
export async function createOrUpdateEscalation(
  entityType: 'obligation' | 'deadline',
  entityId: string,
  companyId: string,
  siteId: string | null,
  escalationLevel: number,
  workflow: EscalationWorkflow,
  daysOverdue: number,
  recipientIds: string[]
): Promise<string | null> {
  // Get obligation_id
  let obligationId: string | null = null;

  if (entityType === 'obligation') {
    obligationId = entityId;
  } else if (entityType === 'deadline') {
    // Get obligation_id from deadline
    const { data: deadline } = await supabaseAdmin
      .from('deadlines')
      .select('obligation_id')
      .eq('id', entityId)
      .single();

    if (!deadline) {
      console.error(`Deadline ${entityId} not found`);
      return null;
    }
    obligationId = deadline.obligation_id;
  }

  if (!obligationId) {
    return null;
  }

  // Get current escalation level
  const currentLevel = await getCurrentEscalationLevel(entityType, entityId);

  // Enforce sequential progression - cannot skip levels
  if (escalationLevel > currentLevel + 1) {
    escalationLevel = currentLevel + 1;
  }

  // If already at this level or higher, no action needed
  if (escalationLevel <= currentLevel) {
    return null;
  }

  // Get previous escalation ID if updating
  let previousEscalationId: string | null = null;
  if (currentLevel > 0) {
    const { data: previousEscalation } = await supabaseAdmin
      .from('escalations')
      .select('id')
      .eq('obligation_id', obligationId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (previousEscalation) {
      previousEscalationId = previousEscalation.id;
    }
  }

  // Create new escalation record
  const { data: escalation, error } = await supabaseAdmin
    .from('escalations')
    .insert({
      obligation_id: obligationId,
      company_id: companyId,
      site_id: siteId,
      current_level: escalationLevel,
      escalation_reason: `Escalated to Level ${escalationLevel} after ${daysOverdue} days overdue`,
      escalated_to: recipientIds[0] || null, // Primary recipient
      escalated_at: new Date().toISOString(),
      previous_escalation_id: previousEscalationId,
    })
    .select('id')
    .single();

  if (error || !escalation) {
    console.error('Error creating escalation record:', error);
    return null;
  }

  return escalation.id;
}

/**
 * Get system default escalation workflow
 * Used when no company-specific workflow is found
 */
export function getSystemDefaultWorkflow(): EscalationWorkflow {
  return {
    id: 'system-default',
    company_id: '',
    obligation_category: null,
    level_1_days: 1,
    level_2_days: 3,
    level_3_days: 7,
    level_4_days: 14,
    level_1_recipients: [], // Will be populated from role-based logic
    level_2_recipients: [],
    level_3_recipients: [],
    level_4_recipients: [],
    is_active: true,
  };
}

