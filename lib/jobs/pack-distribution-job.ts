/**
 * Pack Distribution Job
 * Distributes audit packs via email or shared links
 * Reference: docs/specs/41_Backend_Background_Jobs.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface PackDistributionJobData {
  pack_id: string;
  company_id: string;
  distribution_method: 'EMAIL' | 'SHARED_LINK';
  recipients: Array<{
    email: string;
    name?: string;
  }>;
  message?: string;
  subject?: string;
  expires_in_days?: number;
}

export async function processPackDistributionJob(job: Job<PackDistributionJobData>): Promise<void> {
  const {
    pack_id,
    company_id,
    distribution_method,
    recipients,
    message,
    subject,
    expires_in_days,
  } = job.data;

  try {
    await job.updateProgress(10);

    // Get pack details
    const { data: pack, error: packError } = await supabaseAdmin
      .from('audit_packs')
      .select('id, pack_type, file_url, storage_path, status')
      .eq('id', pack_id)
      .single();

    if (packError || !pack) {
      throw new Error(`Pack not found: ${packError?.message || 'Unknown error'}`);
    }

    if (pack.status !== 'COMPLETED') {
      throw new Error(`Pack is not ready for distribution. Status: ${pack.status}`);
    }

    await job.updateProgress(30);

    if (distribution_method === 'SHARED_LINK') {
      // Generate shared link token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = expires_in_days
        ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

      // Create distribution record
      const { error: distError } = await supabaseAdmin
        .from('pack_distributions')
        .insert({
          pack_id,
          company_id,
          distribution_method: 'SHARED_LINK',
          shared_link_token: token,
          expires_at: expiresAt,
          distributed_at: new Date().toISOString(),
        });

      if (distError) {
        throw new Error(`Failed to create distribution record: ${distError.message}`);
      }

      // TODO: Send email with shared link to recipients
      // For now, we'll just create the distribution record

      await job.updateProgress(100);
    } else if (distribution_method === 'EMAIL') {
      // Create distribution records for each recipient
      const distributionRecords = recipients.map((recipient) => ({
        pack_id,
        company_id,
        distribution_method: 'EMAIL',
        email_address: recipient.email,
        recipient_name: recipient.name || null,
        distributed_at: new Date().toISOString(),
      }));

      const { error: distError } = await supabaseAdmin
        .from('pack_distributions')
        .insert(distributionRecords);

      if (distError) {
        throw new Error(`Failed to create distribution records: ${distError.message}`);
      }

      await job.updateProgress(60);

      // TODO: Send emails with pack attachment to recipients
      // For now, we'll just create the distribution records

      await job.updateProgress(100);
    }

    // Update job status
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({
          pack_id,
          distribution_method,
          recipients_count: recipients.length,
        }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('Pack distribution job error:', error);

    // Update job status
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

