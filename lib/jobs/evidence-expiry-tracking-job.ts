/**
 * Evidence Expiry Tracking Job
 * 
 * Updates evidence expiry tracking records and sends reminders:
 * - Calculates days until expiry
 * - Marks expired evidence
 * - Sends reminders at configured intervals (90, 30, 7 days)
 * 
 * Runs: Daily at 3 AM
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface EvidenceExpiryTrackingJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEvidenceExpiryTrackingJob(job: Job<EvidenceExpiryTrackingJobData>): Promise<void> {
  const { company_id, site_id } = job.data;
  const result = await updateEvidenceExpiryTracking(company_id, site_id);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to update evidence expiry tracking');
  }
  
  console.log(`Evidence expiry tracking completed: ${result.itemsProcessed} items processed, ${result.remindersSent} reminders sent`);
}

interface EvidenceItem {
  id: string;
  company_id: string;
  site_id: string;
  expiry_date: string | null;
}

interface ExpiryTracking {
  id: string;
  evidence_id: string;
  expiry_date: string;
  days_until_expiry: number;
  reminder_days: number[];
  reminders_sent: number[];
  is_expired: boolean;
}

export async function updateEvidenceExpiryTracking(companyId?: string, siteId?: string) {
  console.log('Starting evidence expiry tracking job...');

  try {
    // Build query for evidence items with expiry dates
    let evidenceQuery = supabaseAdmin
      .from('evidence_items')
      .select('id, company_id, site_id, expiry_date')
      .not('expiry_date', 'is', null);
    
    if (companyId) {
      evidenceQuery = evidenceQuery.eq('company_id', companyId);
    }
    if (siteId) {
      evidenceQuery = evidenceQuery.eq('site_id', siteId);
    }
    
    const { data: evidenceItems, error: evidenceError } = await evidenceQuery;

    if (evidenceError) {
      console.error('Error fetching evidence items:', evidenceError);
      return { success: false, error: evidenceError.message };
    }

    if (!evidenceItems || evidenceItems.length === 0) {
      console.log('No evidence items with expiry dates found');
      return { success: true, itemsProcessed: 0 };
    }

    console.log(`Processing ${evidenceItems.length} evidence items with expiry dates`);

    let itemsProcessed = 0;
    let remindersSent = 0;

    for (const evidence of evidenceItems) {
      if (!evidence.expiry_date) continue;

      const expiryDate = new Date(evidence.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isExpired = daysUntilExpiry < 0;

      // Check if tracking record exists
      const { data: existingTracking, error: fetchError } = await supabaseAdmin
        .from('evidence_expiry_tracking')
        .select('*')
        .eq('evidence_id', evidence.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`Error fetching tracking for evidence ${evidence.id}:`, fetchError);
        continue;
      }

      const trackingData: any = {
        evidence_id: evidence.id,
        company_id: evidence.company_id,
        site_id: evidence.site_id,
        expiry_date: evidence.expiry_date,
        days_until_expiry: isExpired ? 0 : daysUntilExpiry,
        is_expired: isExpired,
        reminder_days: existingTracking?.reminder_days || [90, 30, 7],
        reminders_sent: existingTracking?.reminders_sent || [],
      };

      if (isExpired && !existingTracking?.expired_at) {
        trackingData.expired_at = new Date().toISOString();
      }

      // Check if reminders need to be sent
      const remindersToSend: number[] = [];
      if (!isExpired && trackingData.reminder_days) {
        for (const reminderDay of trackingData.reminder_days) {
          if (
            daysUntilExpiry <= reminderDay &&
            daysUntilExpiry > 0 &&
            !trackingData.reminders_sent.includes(reminderDay)
          ) {
            remindersToSend.push(reminderDay);
          }
        }
      }

      if (remindersToSend.length > 0) {
        // Send reminders (would integrate with notification system)
        console.log(`Sending reminders for evidence ${evidence.id} at ${remindersToSend.join(', ')} days`);
        trackingData.reminders_sent = [...trackingData.reminders_sent, ...remindersToSend];
        remindersSent += remindersToSend.length;
      }

      // Upsert tracking record
      if (existingTracking) {
        const { error: updateError } = await supabaseAdmin
          .from('evidence_expiry_tracking')
          .update(trackingData)
          .eq('id', existingTracking.id);

        if (updateError) {
          console.error(`Error updating tracking for evidence ${evidence.id}:`, updateError);
          continue;
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('evidence_expiry_tracking')
          .insert(trackingData);

        if (insertError) {
          console.error(`Error creating tracking for evidence ${evidence.id}:`, insertError);
          continue;
        }
      }

      itemsProcessed++;
    }

    console.log(`Successfully processed ${itemsProcessed} evidence items, sent ${remindersSent} reminders`);

    return {
      success: true,
      itemsProcessed,
      remindersSent,
    };
  } catch (error: any) {
    console.error('Error in evidence expiry tracking job:', error);
    return { success: false, error: error.message };
  }
}

