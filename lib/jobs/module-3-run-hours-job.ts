/**
 * Module 3 Run Hours Monitoring Job
 * Monitors generator run-hour limits and generates alerts
 * Reference: EP_Compliance_Background_Jobs_Specification.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface Module3RunHoursJobData {
  site_id?: string;
  company_id?: string;
  generator_id?: string;
}

export async function processModule3RunHoursJob(job: Job<Module3RunHoursJobData>): Promise<void> {
  const { site_id, company_id, generator_id } = job.data;

  try {
    await job.updateProgress(10);

    // Build query for generators
    let query = supabaseAdmin
      .from('generators')
      .select(`
        id,
        site_id,
        company_id,
        generator_identifier,
        annual_run_hour_limit,
        monthly_run_hour_limit,
        current_year_hours,
        current_month_hours,
        is_active
      `)
      .eq('is_active', true);

    if (generator_id) {
      query = query.eq('id', generator_id);
    } else if (site_id) {
      query = query.eq('site_id', site_id);
    } else if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: generators, error: generatorsError } = await query;

    if (generatorsError) {
      throw new Error(`Failed to fetch generators: ${generatorsError.message}`);
    }

    await job.updateProgress(30);

    if (!generators || generators.length === 0) {
      throw new Error('No active generators found');
    }

    const alertsCreated: string[] = [];

    // Check each generator for limit breaches
    for (const generator of generators) {
      const annualPercentage = (generator.current_year_hours / generator.annual_run_hour_limit) * 100;
      const monthlyPercentage = generator.monthly_run_hour_limit
        ? (generator.current_month_hours / generator.monthly_run_hour_limit) * 100
        : null;

      // Check for annual limit breach
      if (annualPercentage >= 100) {
        await createBreachAlert(generator, 'ANNUAL_LIMIT_EXCEEDED', annualPercentage);
        alertsCreated.push(generator.id);
      } else if (annualPercentage >= 90) {
        await createBreachAlert(generator, 'ANNUAL_LIMIT_WARNING', annualPercentage);
        alertsCreated.push(generator.id);
      }

      // Check for monthly limit breach
      if (monthlyPercentage !== null) {
        if (monthlyPercentage >= 100) {
          await createBreachAlert(generator, 'MONTHLY_LIMIT_EXCEEDED', monthlyPercentage);
          alertsCreated.push(generator.id);
        } else if (monthlyPercentage >= 90) {
          await createBreachAlert(generator, 'MONTHLY_LIMIT_WARNING', monthlyPercentage);
          alertsCreated.push(generator.id);
        }
      }

      // Update generator percentages
      await supabaseAdmin
        .from('generators')
        .update({
          percentage_of_annual_limit: annualPercentage,
          percentage_of_monthly_limit: monthlyPercentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generator.id);
    }

    await job.updateProgress(100);

    // Update job status
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({
          generators_checked: generators.length,
          alerts_created: alertsCreated.length,
        }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('Module 3 run hours job error:', error);

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

async function createBreachAlert(
  generator: any,
  alertType: string,
  percentage: number
): Promise<void> {
  // Check if alert already exists
  const { data: existing } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('entity_type', 'generators')
    .eq('entity_id', generator.id)
    .eq('notification_type', alertType)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (!existing) {
    // Get site users to notify
    const { data: siteUsers } = await supabaseAdmin
      .from('user_site_assignments')
      .select('user_id')
      .eq('site_id', generator.site_id)
      .limit(10);

    if (siteUsers && siteUsers.length > 0) {
      const notifications = siteUsers.map((su: any) => ({
        user_id: su.user_id,
        company_id: generator.company_id,
        site_id: generator.site_id,
        notification_type: alertType,
        channel: 'IN_APP',
        priority: percentage >= 100 ? 'HIGH' : 'NORMAL',
        subject: `Generator ${generator.generator_identifier} - ${alertType.replace(/_/g, ' ')}`,
        body_text: `Generator ${generator.generator_identifier} has reached ${percentage.toFixed(1)}% of its limit.`,
        entity_type: 'generators',
        entity_id: generator.id,
        status: 'PENDING',
        scheduled_for: new Date().toISOString(),
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }
  }
}

