/**
 * Consultant Sync Job
 * Syncs consultant client data and generates aggregated reports
 * Reference: docs/specs/41_Backend_Background_Jobs.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface ConsultantSyncJobData {
  consultant_user_id: string;
  client_company_id?: string;
}

export async function processConsultantSyncJob(job: Job<ConsultantSyncJobData>): Promise<void> {
  const { consultant_user_id, client_company_id } = job.data;

  try {
    await job.updateProgress(10);

    // Get consultant's client assignments
    let query = supabaseAdmin
      .from('consultant_client_assignments')
      .select(`
        client_company_id,
        status,
        companies!inner (
          id,
          name,
          sites (
            id,
            name
          )
        )
      `)
      .eq('consultant_user_id', consultant_user_id)
      .eq('status', 'ACTIVE');

    if (client_company_id) {
      query = query.eq('client_company_id', client_company_id);
    }

    const { data: assignments, error: assignmentsError } = await query;

    if (assignmentsError) {
      throw new Error(`Failed to fetch client assignments: ${assignmentsError.message}`);
    }

    await job.updateProgress(30);

    if (!assignments || assignments.length === 0) {
      throw new Error('No active client assignments found');
    }

    const syncResults: any[] = [];

    // Sync data for each client
    for (const assignment of assignments) {
      const clientCompany = (assignment as any).companies;
      const clientSites = clientCompany?.sites || [];

      // Calculate compliance metrics
      const siteIds = clientSites.map((s: any) => s.id);

      // Get obligations count
      const { count: obligationsCount } = await supabaseAdmin
        .from('obligations')
        .select('*', { count: 'exact', head: true })
        .in('site_id', siteIds)
        .is('deleted_at', null);

      // Get overdue deadlines count
      const { count: overdueCount } = await supabaseAdmin
        .from('deadlines')
        .select('*', { count: 'exact', head: true })
        .in('site_id', siteIds)
        .eq('status', 'OVERDUE');

      // Get approaching deadlines count
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count: approachingCount } = await supabaseAdmin
        .from('deadlines')
        .select('*', { count: 'exact', head: true })
        .in('site_id', siteIds)
        .eq('status', 'PENDING')
        .gte('due_date', now.toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0]);

      // Calculate compliance score
      const totalDeadlines = (obligationsCount || 0) * 12; // Estimate
      const completedDeadlines = totalDeadlines - (overdueCount || 0) - (approachingCount || 0);
      const complianceScore = totalDeadlines > 0 ? completedDeadlines / totalDeadlines : 1;

      // Update or create consultant client summary
      const summaryData = {
        consultant_user_id,
        client_company_id: clientCompany.id,
        site_count: clientSites.length,
        total_obligations: obligationsCount || 0,
        overdue_count: overdueCount || 0,
        approaching_deadline_count: approachingCount || 0,
        compliance_score: complianceScore,
        last_synced_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabaseAdmin
        .from('consultant_client_summaries')
        .upsert(summaryData, {
          onConflict: 'consultant_user_id,client_company_id',
        });

      if (upsertError) {
        console.error(`Failed to sync client ${clientCompany.id}:`, upsertError);
      } else {
        syncResults.push({
          client_company_id: clientCompany.id,
          compliance_score: complianceScore,
        });
      }
    }

    await job.updateProgress(100);

    // Update job status
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({
          clients_synced: syncResults.length,
          results: syncResults,
        }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('Consultant sync job error:', error);

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

