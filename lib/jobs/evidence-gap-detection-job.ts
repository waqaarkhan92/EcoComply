/**
 * Evidence Gap Detection Job
 * Detects obligations with upcoming deadlines but missing or insufficient evidence
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface EvidenceGapDetectionJobData {
  company_id?: string;
  site_id?: string;
  days_ahead?: number; // How many days ahead to look (default: 30)
}

interface EvidenceGap {
  company_id: string;
  site_id: string;
  obligation_id: string;
  deadline_id: string | null;
  gap_type: 'NO_EVIDENCE' | 'EXPIRED_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  days_until_deadline: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

function calculateSeverity(daysUntilDeadline: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (daysUntilDeadline <= 3) return 'CRITICAL';
  if (daysUntilDeadline <= 7) return 'HIGH';
  if (daysUntilDeadline <= 14) return 'MEDIUM';
  return 'LOW';
}

export async function processEvidenceGapDetectionJob(
  job: Job<EvidenceGapDetectionJobData>
): Promise<{ detected: number; resolved: number; notified: number }> {
  const { company_id, site_id, days_ahead = 30 } = job.data;

  const stats = {
    detected: 0,
    resolved: 0,
    notified: 0,
  };

  try {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days_ahead);

    // Query obligations with upcoming deadlines
    let query = supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        site_id,
        obligation_title,
        obligation_description,
        original_text,
        category,
        review_status,
        deadlines!inner(
          id,
          due_date,
          status
        ),
        obligation_evidence_links(
          id,
          evidence_id,
          evidence_items!inner(
            id,
            status,
            expiry_date
          )
        ),
        sites!inner(
          id,
          name
        )
      `)
      .eq('deadlines.status', 'PENDING')
      .gte('deadlines.due_date', now.toISOString().split('T')[0])
      .lte('deadlines.due_date', futureDate.toISOString().split('T')[0])
      .in('review_status', ['CONFIRMED', 'EDITED', 'PENDING']);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: obligations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    if (!obligations || obligations.length === 0) {
      console.log('No obligations with upcoming deadlines found');
      return stats;
    }

    const gapsToCreate: EvidenceGap[] = [];
    const gapsToResolve: string[] = [];

    // Analyze each obligation for evidence gaps
    for (const obligation of obligations) {
      const deadlines = (obligation as any).deadlines || [];
      const evidenceLinks = (obligation as any).obligation_evidence_links || [];

      for (const deadline of deadlines) {
        const dueDate = new Date(deadline.due_date);
        const daysUntilDeadline = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check evidence status
        const activeEvidence = evidenceLinks.filter((link: any) => {
          const evidence = link.evidence_items;
          if (!evidence || evidence.status !== 'LINKED') return false;

          // Check if evidence is expired
          if (evidence.expiry_date) {
            const expiryDate = new Date(evidence.expiry_date);
            if (expiryDate < now) return false;
          }
          return true;
        });

        const expiredEvidence = evidenceLinks.filter((link: any) => {
          const evidence = link.evidence_items;
          if (!evidence) return false;
          if (evidence.expiry_date) {
            const expiryDate = new Date(evidence.expiry_date);
            return expiryDate < now;
          }
          return false;
        });

        // Determine gap type
        let gapType: 'NO_EVIDENCE' | 'EXPIRED_EVIDENCE' | 'INSUFFICIENT_EVIDENCE' | null = null;

        if (evidenceLinks.length === 0 || activeEvidence.length === 0) {
          if (expiredEvidence.length > 0) {
            gapType = 'EXPIRED_EVIDENCE';
          } else {
            gapType = 'NO_EVIDENCE';
          }
        }
        // Note: INSUFFICIENT_EVIDENCE could be determined by AI analysis
        // For now, we only detect NO_EVIDENCE and EXPIRED_EVIDENCE

        if (gapType) {
          gapsToCreate.push({
            company_id: obligation.company_id,
            site_id: obligation.site_id,
            obligation_id: obligation.id,
            deadline_id: deadline.id,
            gap_type: gapType,
            days_until_deadline: daysUntilDeadline,
            severity: calculateSeverity(daysUntilDeadline),
          });
        }
      }
    }

    // Check for existing gaps that may have been resolved
    const obligationIds = obligations.map((o: any) => o.id);

    if (obligationIds.length > 0) {
      const { data: existingGaps } = await supabaseAdmin
        .from('evidence_gaps')
        .select('id, obligation_id')
        .in('obligation_id', obligationIds)
        .is('resolved_at', null)
        .is('dismissed_at', null);

      if (existingGaps) {
        // Find gaps that should be resolved (obligation now has evidence)
        const obligationsWithGaps = new Set(gapsToCreate.map(g => g.obligation_id));
        for (const existingGap of existingGaps) {
          if (!obligationsWithGaps.has(existingGap.obligation_id)) {
            gapsToResolve.push(existingGap.id);
          }
        }
      }
    }

    // Resolve gaps that are no longer applicable
    if (gapsToResolve.length > 0) {
      const { error: resolveError } = await supabaseAdmin
        .from('evidence_gaps')
        .update({ resolved_at: now.toISOString() })
        .in('id', gapsToResolve);

      if (!resolveError) {
        stats.resolved = gapsToResolve.length;
      }
    }

    // Upsert new gaps (update existing or create new)
    for (const gap of gapsToCreate) {
      // Check if gap already exists for this obligation
      const { data: existingGap } = await supabaseAdmin
        .from('evidence_gaps')
        .select('id, notified_at')
        .eq('obligation_id', gap.obligation_id)
        .is('resolved_at', null)
        .is('dismissed_at', null)
        .single();

      if (existingGap) {
        // Update existing gap (severity might have changed)
        await supabaseAdmin
          .from('evidence_gaps')
          .update({
            days_until_deadline: gap.days_until_deadline,
            severity: gap.severity,
            gap_type: gap.gap_type,
            updated_at: now.toISOString(),
          })
          .eq('id', existingGap.id);
      } else {
        // Create new gap
        const { error: insertError } = await supabaseAdmin
          .from('evidence_gaps')
          .insert({
            company_id: gap.company_id,
            site_id: gap.site_id,
            obligation_id: gap.obligation_id,
            deadline_id: gap.deadline_id,
            gap_type: gap.gap_type,
            days_until_deadline: gap.days_until_deadline,
            severity: gap.severity,
            detected_at: now.toISOString(),
          });

        if (!insertError) {
          stats.detected++;
        }
      }
    }

    // Send notifications for critical/high severity gaps not yet notified
    const { data: unnotifiedGaps } = await supabaseAdmin
      .from('evidence_gaps')
      .select(`
        id,
        company_id,
        site_id,
        obligation_id,
        gap_type,
        days_until_deadline,
        severity,
        obligations!inner(
          obligation_title,
          obligation_description,
          original_text
        ),
        sites!inner(
          name
        )
      `)
      .is('notified_at', null)
      .is('resolved_at', null)
      .is('dismissed_at', null)
      .in('severity', ['CRITICAL', 'HIGH']);

    if (unnotifiedGaps && unnotifiedGaps.length > 0) {
      for (const gap of unnotifiedGaps) {
        const obligation = (gap as any).obligations;
        const site = (gap as any).sites;

        // Get users to notify
        const { data: users } = await supabaseAdmin
          .from('users')
          .select(`
            id,
            email,
            full_name,
            company_id,
            user_roles!inner(role)
          `)
          .eq('company_id', gap.company_id)
          .in('user_roles.role', ['OWNER', 'ADMIN', 'STAFF'])
          .eq('is_active', true)
          .is('deleted_at', null);

        if (users && users.length > 0) {
          const notifications = users.map((user: any) => ({
            user_id: user.id,
            company_id: gap.company_id,
            site_id: gap.site_id,
            recipient_email: user.email,
            notification_type: 'EVIDENCE_GAP_ALERT',
            channel: 'EMAIL',
            priority: gap.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
            subject: `Evidence Gap Alert: ${obligation.obligation_title || 'Obligation'} missing evidence`,
            body_text: `The obligation "${obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100)}" at ${site.name} is due in ${gap.days_until_deadline} days but has ${gap.gap_type === 'NO_EVIDENCE' ? 'no evidence attached' : 'expired evidence'}.`,
            entity_type: 'evidence_gap',
            entity_id: gap.id,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
            metadata: {
              obligation_title: obligation.obligation_title,
              site_name: site.name,
              gap_type: gap.gap_type,
              days_remaining: gap.days_until_deadline,
              severity: gap.severity,
              action_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.epcompliance.com'}/dashboard/obligations/${gap.obligation_id}`,
            },
          }));

          await supabaseAdmin.from('notifications').insert(notifications);

          // Mark gap as notified
          await supabaseAdmin
            .from('evidence_gaps')
            .update({ notified_at: now.toISOString() })
            .eq('id', gap.id);

          stats.notified++;
        }
      }
    }

    console.log(
      `Evidence gap detection completed: ${stats.detected} new gaps detected, ${stats.resolved} resolved, ${stats.notified} notifications sent`
    );

    return stats;
  } catch (error: any) {
    console.error('Evidence gap detection job failed:', error);
    throw error;
  }
}
