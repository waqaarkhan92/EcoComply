/**
 * Review Queue Escalation Job
 * Auto-escalates stale review queue items after 48 hours
 * Reference: docs/specs/Ingestion Blueprint Section 7.5
 *
 * Escalation Levels:
 * - Level 1: 48+ hours pending
 * - Level 2: 96+ hours pending
 * - Level 3: 168+ hours pending (critical)
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface ReviewQueueEscalationJobData {
  company_id?: string; // Optional: limit to specific company
  dry_run?: boolean;   // If true, don't make changes, just report
}

interface EscalationCandidate {
  id: string;
  document_id: string;
  obligation_id: string | null;
  company_id: string;
  site_id: string;
  review_type: string;
  priority: number;
  hallucination_risk: boolean;
  current_escalation_level: number;
  escalated_at: string | null;
  last_escalation_notification_at: string | null;
  hours_pending: number;
  calculated_level: number;
  company_name: string;
  site_name: string;
}

interface EscalationResult {
  processed: number;
  escalated: number;
  notifications_sent: number;
  skipped_rate_limited: number;
  errors: string[];
}

// Minimum time between escalation notifications for the same item (24 hours)
const NOTIFICATION_RATE_LIMIT_HOURS = 24;

// Escalation thresholds in hours
const ESCALATION_THRESHOLDS = {
  LEVEL_1: 48,   // 2 days
  LEVEL_2: 96,   // 4 days
  LEVEL_3: 168,  // 7 days
} as const;

/**
 * Calculate escalation level based on hours pending
 */
function calculateEscalationLevel(hoursPending: number): number {
  if (hoursPending >= ESCALATION_THRESHOLDS.LEVEL_3) return 3;
  if (hoursPending >= ESCALATION_THRESHOLDS.LEVEL_2) return 2;
  if (hoursPending >= ESCALATION_THRESHOLDS.LEVEL_1) return 1;
  return 0;
}

/**
 * Get priority label for escalation level
 */
function getEscalationPriority(level: number): 'URGENT' | 'HIGH' | 'NORMAL' {
  if (level >= 3) return 'URGENT';
  if (level >= 2) return 'HIGH';
  return 'NORMAL';
}

/**
 * Check if notification is rate-limited
 */
function isRateLimited(lastNotificationAt: string | null): boolean {
  if (!lastNotificationAt) return false;

  const lastNotification = new Date(lastNotificationAt);
  const hoursSince = (Date.now() - lastNotification.getTime()) / (1000 * 60 * 60);

  return hoursSince < NOTIFICATION_RATE_LIMIT_HOURS;
}

/**
 * Process review queue escalation job
 */
export async function processReviewQueueEscalationJob(
  job: Job<ReviewQueueEscalationJobData>
): Promise<EscalationResult> {
  const { company_id, dry_run = false } = job.data;
  const now = new Date();

  const result: EscalationResult = {
    processed: 0,
    escalated: 0,
    notifications_sent: 0,
    skipped_rate_limited: 0,
    errors: [],
  };

  try {
    // Query escalation candidates using the view
    let query = supabaseAdmin
      .from('review_queue_escalation_candidates')
      .select('*');

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: candidates, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Failed to fetch escalation candidates: ${queryError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No review queue items require escalation');
      return result;
    }

    console.log(`Found ${candidates.length} items requiring escalation check`);
    result.processed = candidates.length;

    // Process each candidate
    for (const candidate of candidates as EscalationCandidate[]) {
      try {
        const newLevel = calculateEscalationLevel(candidate.hours_pending);
        const previousLevel = candidate.current_escalation_level;

        // Skip if no level change needed
        if (newLevel <= previousLevel) {
          continue;
        }

        // Check if we should skip due to rate limiting
        const rateLimited = isRateLimited(candidate.last_escalation_notification_at);

        if (dry_run) {
          console.log(
            `[DRY RUN] Would escalate item ${candidate.id}: ` +
            `Level ${previousLevel} → ${newLevel}, ` +
            `Hours pending: ${candidate.hours_pending.toFixed(1)}, ` +
            `Rate limited: ${rateLimited}`
          );
          result.escalated++;
          continue;
        }

        // Update the review queue item
        const updateData: Record<string, unknown> = {
          escalation_level: newLevel,
          updated_at: now.toISOString(),
        };

        // Set escalated_at on first escalation
        if (previousLevel === 0) {
          updateData.escalated_at = now.toISOString();
        }

        const { error: updateError } = await supabaseAdmin
          .from('review_queue_items')
          .update(updateData)
          .eq('id', candidate.id);

        if (updateError) {
          result.errors.push(`Failed to update item ${candidate.id}: ${updateError.message}`);
          continue;
        }

        result.escalated++;

        // Record escalation in history
        const escalatedToUserIds: string[] = [];

        // Get company admins to notify
        const { data: admins } = await supabaseAdmin
          .from('users')
          .select(`
            id,
            email,
            full_name,
            user_roles!inner(role)
          `)
          .eq('company_id', candidate.company_id)
          .in('user_roles.role', ['OWNER', 'ADMIN'])
          .eq('is_active', true)
          .is('deleted_at', null);

        if (admins) {
          escalatedToUserIds.push(...admins.map((a: any) => a.id));
        }

        // Insert escalation history record
        await supabaseAdmin
          .from('review_queue_escalation_history')
          .insert({
            review_queue_item_id: candidate.id,
            previous_level: previousLevel,
            new_level: newLevel,
            hours_pending: candidate.hours_pending,
            escalated_to_user_ids: escalatedToUserIds,
            notification_sent: !rateLimited && admins && admins.length > 0,
          });

        // Send notifications if not rate-limited
        if (!rateLimited && admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            company_id: candidate.company_id,
            site_id: candidate.site_id,
            recipient_email: admin.email,
            notification_type: 'REVIEW_QUEUE_ESCALATION',
            channel: 'EMAIL',
            priority: getEscalationPriority(newLevel),
            subject: getEscalationSubject(newLevel, candidate),
            body_text: getEscalationBody(newLevel, candidate),
            entity_type: 'review_queue_item',
            entity_id: candidate.id,
            status: 'PENDING',
            scheduled_for: now.toISOString(),
            metadata: {
              escalation_level: newLevel,
              previous_level: previousLevel,
              hours_pending: candidate.hours_pending,
              review_type: candidate.review_type,
              hallucination_risk: candidate.hallucination_risk,
              site_name: candidate.site_name,
              action_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com'}/dashboard/review-queue/${candidate.id}`,
            },
          }));

          const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications);

          if (!notificationError) {
            // Update last notification timestamp
            await supabaseAdmin
              .from('review_queue_items')
              .update({ last_escalation_notification_at: now.toISOString() })
              .eq('id', candidate.id);

            result.notifications_sent++;
          }
        } else if (rateLimited) {
          result.skipped_rate_limited++;
        }
      } catch (itemError: any) {
        result.errors.push(`Error processing item ${candidate.id}: ${itemError.message}`);
      }
    }

    console.log(
      `Review queue escalation completed: ` +
      `${result.escalated} escalated, ` +
      `${result.notifications_sent} notifications sent, ` +
      `${result.skipped_rate_limited} rate-limited`
    );

    return result;
  } catch (error: any) {
    console.error('Review queue escalation job failed:', error);
    throw error;
  }
}

/**
 * Generate escalation notification subject
 */
function getEscalationSubject(level: number, candidate: EscalationCandidate): string {
  const severity = level >= 3 ? '🔴 CRITICAL' : level >= 2 ? '🟠 HIGH' : '🟡 MEDIUM';
  const days = Math.floor(candidate.hours_pending / 24);

  return `${severity}: Review item pending for ${days}+ days at ${candidate.site_name}`;
}

/**
 * Generate escalation notification body
 */
function getEscalationBody(level: number, candidate: EscalationCandidate): string {
  const days = Math.floor(candidate.hours_pending / 24);
  const hours = Math.floor(candidate.hours_pending % 24);

  let urgencyMessage = '';
  if (level >= 3) {
    urgencyMessage = 'This item has been pending for over 7 days and requires immediate attention.';
  } else if (level >= 2) {
    urgencyMessage = 'This item has been pending for over 4 days. Please review as soon as possible.';
  } else {
    urgencyMessage = 'This item has been pending for over 2 days. Please review at your earliest convenience.';
  }

  const riskWarning = candidate.hallucination_risk
    ? '\n\n⚠️ This item has been flagged as having potential hallucination risk and requires extra scrutiny.'
    : '';

  return `A review queue item at ${candidate.site_name} requires attention.

${urgencyMessage}

Details:
- Review Type: ${formatReviewType(candidate.review_type)}
- Priority: ${candidate.priority}
- Time Pending: ${days} days, ${hours} hours
- Escalation Level: ${level}/3${riskWarning}

Please review this item in the dashboard.`;
}

/**
 * Format review type for display
 */
function formatReviewType(reviewType: string): string {
  const typeLabels: Record<string, string> = {
    LOW_CONFIDENCE: 'Low Confidence Extraction',
    SUBJECTIVE: 'Subjective Content',
    NO_MATCH: 'No Matching Obligation',
    DATE_FAILURE: 'Date Parsing Failure',
    DUPLICATE: 'Potential Duplicate',
    OCR_QUALITY: 'Poor OCR Quality',
    CONFLICT: 'Data Conflict',
    HALLUCINATION: 'Potential Hallucination',
  };

  return typeLabels[reviewType] || reviewType;
}
