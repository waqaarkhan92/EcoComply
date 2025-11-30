/**
 * Evidence Retention Enforcement Job
 * 
 * Purpose: Archive evidence that has exceeded its retention period
 * Trigger: Cron (daily at 2:00 AM)
 * Queue: monitoring-schedule
 * Priority: LOW
 * Reference: docs/specs/30_Product_Business_Logic.md Section H.7 (Evidence Retention Rules)
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface EvidenceRetentionJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEvidenceRetentionJob(job: Job<EvidenceRetentionJobData>): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    await job.updateProgress(0);
    
    console.log(`Starting Evidence Retention Enforcement Job for company ${company_id || 'all'}, site ${site_id || 'all'}`);

    const now = new Date();
    let archivedCount = 0;

    // Build query for evidence items that need archival
    let query = supabaseAdmin
      .from('evidence_items')
      .select(`
        id,
        company_id,
        site_id,
        file_name,
        retention_policy,
        retention_period_years,
        created_at,
        metadata,
        is_archived
      `)
      .eq('is_archived', false); // Only process non-archived evidence

    // Filter by company/site if provided
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: evidenceItems, error: evidenceError } = await query;

    if (evidenceError) {
      throw new Error(`Failed to fetch evidence items: ${evidenceError.message}`);
    }

    if (!evidenceItems || evidenceItems.length === 0) {
      console.log('No evidence items found for retention check');
      await job.updateProgress(100);
      return;
    }

    console.log(`Checking ${evidenceItems.length} evidence items for retention period expiration`);

    // Process each evidence item
    for (let i = 0; i < evidenceItems.length; i++) {
      const evidence = evidenceItems[i];
      await job.updateProgress(Math.floor((i / evidenceItems.length) * 90));

      try {
        // Determine retention period based on policy
        let retentionPeriodYears = evidence.retention_period_years || 7;
        
        // Override based on retention_policy if needed
        if (evidence.retention_policy === 'INCIDENT') {
          retentionPeriodYears = 10;
        } else if (evidence.retention_policy === 'IMPROVEMENT_CONDITION') {
          // For improvement conditions, check if condition is closed
          // If condition is closed, use 2 years from condition close date
          // Otherwise, don't archive yet
          const metadata = evidence.metadata as any;
          const conditionClosedDate = metadata?.condition_closed_date;
          
          if (conditionClosedDate) {
            const closedDate = new Date(conditionClosedDate);
            const archiveDate = new Date(closedDate);
            archiveDate.setFullYear(archiveDate.getFullYear() + 2);
            
            if (now >= archiveDate) {
              // Archive evidence
              await archiveEvidence(evidence.id);
              continue;
            } else {
              // Not yet ready for archival
              continue;
            }
          } else {
            // Condition not closed yet, skip archival
            continue;
          }
        } else {
          // STANDARD: 7 years from upload (default)
          retentionPeriodYears = 7;
        }

        // Calculate expiration date
        const uploadDate = new Date(evidence.created_at);
        const expirationDate = new Date(uploadDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + retentionPeriodYears);

        // Check if retention period has expired
        if (now >= expirationDate) {
          // Archive the evidence
          await archiveEvidence(evidence.id);
          archivedCount++;
        }

      } catch (error: any) {
        console.error(`Error processing evidence ${evidence.id}:`, error.message);
        // Continue with next evidence item
      }
    }

    await job.updateProgress(100);
    console.log(`Evidence retention enforcement job completed. Archived ${archivedCount} evidence items.`);
  } catch (error: any) {
    console.error('Evidence retention job error:', error);
    throw error;
  }
}

/**
 * Archive an evidence item
 */
async function archiveEvidence(evidenceId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('evidence_items')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', evidenceId);

    if (error) {
      throw new Error(`Failed to archive evidence ${evidenceId}: ${error.message}`);
    }

    console.log(`Archived evidence ${evidenceId}`);
  } catch (error: any) {
    console.error(`Error archiving evidence ${evidenceId}:`, error.message);
    throw error;
  }
}

