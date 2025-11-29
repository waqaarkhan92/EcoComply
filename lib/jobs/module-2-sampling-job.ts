/**
 * Module 2 Sampling Schedule Job
 * Generates sampling schedules based on consent parameters
 * Reference: EP_Compliance_Background_Jobs_Specification.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface Module2SamplingJobData {
  site_id: string;
  company_id: string;
  consent_id?: string;
  parameter_id?: string;
}

export async function processModule2SamplingJob(job: Job<Module2SamplingJobData>): Promise<void> {
  const { site_id, company_id, consent_id, parameter_id } = job.data;

  try {
    await job.updateProgress(10);

    // Get consent and parameters
    let query = supabaseAdmin
      .from('consents')
      .select(`
        id,
        site_id,
        parameters (
          id,
          parameter_name,
          sampling_frequency,
          sampling_start_date,
          next_sampling_date
        )
      `)
      .eq('site_id', site_id)
      .eq('company_id', company_id);

    if (consent_id) {
      query = query.eq('id', consent_id);
    }

    const { data: consents, error: consentsError } = await query;

    if (consentsError) {
      throw new Error(`Failed to fetch consents: ${consentsError.message}`);
    }

    await job.updateProgress(30);

    if (!consents || consents.length === 0) {
      throw new Error('No consents found for site');
    }

    // Process each consent and its parameters
    for (const consent of consents) {
      const parameters = (consent as any).parameters || [];

      for (const parameter of parameters) {
        // Skip if parameter_id is specified and doesn't match
        if (parameter_id && parameter.id !== parameter_id) {
          continue;
        }

        // Calculate next sampling date based on frequency
        const nextSamplingDate = calculateNextSamplingDate(
          parameter.sampling_frequency,
          parameter.sampling_start_date || parameter.next_sampling_date
        );

        // Update parameter with next sampling date
        await supabaseAdmin
          .from('parameters')
          .update({
            next_sampling_date: nextSamplingDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', parameter.id);

        // Create sampling schedule entry if needed
        await createSamplingSchedule(parameter.id, nextSamplingDate, site_id, company_id);
      }
    }

    await job.updateProgress(100);

    // Update job status
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({ message: 'Sampling schedules generated successfully' }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('Module 2 sampling job error:', error);

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

function calculateNextSamplingDate(frequency: string, startDate: string | null): string {
  if (!startDate) {
    return new Date().toISOString().split('T')[0];
  }

  const start = new Date(startDate);
  const now = new Date();

  switch (frequency) {
    case 'DAILY':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case 'MONTHLY':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString().split('T')[0];
    case 'QUARTERLY':
      const nextQuarter = new Date(now);
      nextQuarter.setMonth(nextQuarter.getMonth() + 3);
      return nextQuarter.toISOString().split('T')[0];
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
}

async function createSamplingSchedule(
  parameterId: string,
  samplingDate: string,
  siteId: string,
  companyId: string
): Promise<void> {
  // Note: Sampling schedules are tracked via the parameters table's next_sampling_date
  // and can be created as deadlines or notifications if needed
  // For now, we'll just update the parameter's next_sampling_date
  // In a full implementation, you might create deadline records or notifications
}

