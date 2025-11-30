/**
 * Permit Renewal Reminder Job
 * 
 * Purpose: Send notifications for approaching permit renewals
 * Trigger: Cron (daily at 8:00 AM)
 * Queue: deadline-alerts
 * Priority: NORMAL
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 6.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface PermitRenewalReminderJobData {
  company_id?: string;
  site_id?: string;
  reminder_days?: number[]; // Default: [90, 30, 7]
}

export async function processPermitRenewalReminderJob(job: Job<PermitRenewalReminderJobData>): Promise<void> {
  const { company_id, site_id, reminder_days = [90, 30, 7] } = job.data;

  try {
    await supabaseAdmin
      .from('background_jobs')
      .update({ status: 'RUNNING', started_at: new Date().toISOString() })
      .eq('job_id', job.id);

    console.log(`Starting Permit Renewal Reminder Job for company ${company_id || 'all'}, site ${site_id || 'all'}`);

    const now = new Date();
    const remindersCreated: any[] = [];

    // Query documents with upcoming expiry dates
    // We'll check documents with expiry_date in metadata or a dedicated expiry_date column
    let query = supabaseAdmin
      .from('documents')
      .select(`
        id,
        title,
        site_id,
        document_type,
        metadata,
        sites!inner (
          id,
          name,
          company_id
        )
      `)
      .is('deleted_at', null)
      .not('metadata', 'is', null);

    // Filter by company/site if provided
    if (company_id) {
      query = query.eq('sites.company_id', company_id);
    }
    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: documents, error: documentsError } = await query;

    if (documentsError) {
      throw new Error(`Failed to fetch documents: ${documentsError.message}`);
    }

    if (!documents || documents.length === 0) {
      console.log(`No documents found for renewal reminders`);
      await job.updateProgress(100);
      await supabaseAdmin
        .from('background_jobs')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          result: JSON.stringify({ message: 'No documents found for renewal reminders' }),
        })
        .eq('job_id', job.id);
      return;
    }

    // Process each document
    for (const document of documents) {
      try {
        const metadata = document.metadata as any;
        const expiryDateStr = metadata?.expiry_date || metadata?.renewal_date || metadata?.expires_at;
        
        if (!expiryDateStr) {
          continue; // Skip if no expiry date
        }

        const expiryDate = new Date(expiryDateStr);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check if reminder should be sent for this threshold
        if (!reminder_days.includes(daysUntilExpiry)) {
          continue;
        }

        // Check if reminder already sent for this threshold
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('company_id', document.sites.company_id)
          .eq('site_id', document.site_id)
          .eq('notification_type', 'PERMIT_RENEWAL_REMINDER')
          .eq('entity_type', 'DOCUMENT')
          .eq('entity_id', document.id)
          .like('body_text', `%${daysUntilExpiry} days%`)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
          .limit(1)
          .single();

        if (existingNotification) {
          continue; // Already notified
        }

        // Determine priority based on days until expiry
        let priority: 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';
        if (daysUntilExpiry <= 7) {
          priority = 'URGENT';
        } else if (daysUntilExpiry <= 30) {
          priority = 'HIGH';
        }

        // Get users who should receive this reminder
        // For 90 days: Owner, Admin
        // For 30 days: Owner, Admin, assigned Staff
        // For 7 days: All users with document access
        const rolesToNotify = daysUntilExpiry <= 7 
          ? ['OWNER', 'ADMIN', 'STAFF', 'VIEWER']
          : daysUntilExpiry <= 30
          ? ['OWNER', 'ADMIN', 'STAFF']
          : ['OWNER', 'ADMIN'];

        const { data: users } = await supabaseAdmin
          .from('users')
          .select(`
            id,
            email,
            full_name,
            company_id,
            user_roles!inner(role)
          `)
          .eq('company_id', document.sites.company_id)
          .in('user_roles.role', rolesToNotify)
          .eq('is_active', true)
          .is('deleted_at', null);

        // Create notifications for each user
        if (users && users.length > 0) {
          const notifications = users.map((user: any) => ({
            user_id: user.id,
            company_id: document.sites.company_id,
            site_id: document.site_id,
            recipient_email: user.email,
            notification_type: 'PERMIT_RENEWAL_REMINDER',
            channel: 'EMAIL',
            priority,
            subject: `${daysUntilExpiry} Days: ${document.title || 'Document'} Renewal`,
            body_text: `Your ${document.document_type || 'document'} (${document.title || 'N/A'}) expires on ${expiryDate.toISOString().split('T')[0]}. Please initiate renewal process.`,
            entity_type: 'DOCUMENT',
            entity_id: document.id,
            action_url: `/dashboard/sites/${document.site_id}/documents/${document.id}`,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
            metadata: {
              reminder_type: 'PERMIT_RENEWAL',
              reminder_days: daysUntilExpiry,
              expiry_date: expiryDateStr,
            },
          }));

          await supabaseAdmin.from('notifications').insert(notifications);

          remindersCreated.push({
            document_id: document.id,
            document_title: document.title,
            days_until_expiry: daysUntilExpiry,
            notifications_sent: users.length,
          });

          console.log(`Created permit renewal reminder for document "${document.title}" (${daysUntilExpiry} days until expiry)`);
        }
      } catch (error: any) {
        console.error(`Error processing document ${document.id}:`, error);
        // Continue with next document
      }
    }

    await job.updateProgress(100);

    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({ 
          message: 'Permit renewal reminders processed successfully',
          reminders_created: remindersCreated.length,
        }),
      })
      .eq('job_id', job.id);

    console.log(`Permit renewal reminder job completed: ${remindersCreated.length} reminders created`);

  } catch (error: any) {
    console.error('Permit renewal reminder job error:', error);

    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'FAILED',
        error_message: error.message || 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('job_id', job.id);

    throw error;
  }
}

