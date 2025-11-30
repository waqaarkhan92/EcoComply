/**
 * Cross-Sell Triggers Job
 * Detects opportunities for cross-selling additional modules
 * Reference: docs/specs/41_Backend_Background_Jobs.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface CrossSellTriggersJobData {
  company_id?: string;
}

export async function processCrossSellTriggersJob(job: Job<CrossSellTriggersJobData>): Promise<void> {
  const { company_id } = job.data;

  try {
    await job.updateProgress(10);

    // Build query for companies
    let query = supabaseAdmin
      .from('companies')
      .select('id, name, subscription_tier')
      .eq('is_active', true);

    if (company_id) {
      query = query.eq('id', company_id);
    }

    const { data: companies, error: companiesError } = await query;

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    await job.updateProgress(30);

    if (!companies || companies.length === 0) {
      throw new Error('No active companies found');
    }

    const triggersCreated: any[] = [];

    // Check each company for cross-sell opportunities
    for (const company of companies) {
      // Get active modules
      const { data: activations } = await supabaseAdmin
        .from('module_activations')
        .select('module_id, modules(module_code)')
        .eq('company_id', company.id)
        .eq('status', 'ACTIVE');

      const activeModuleCodes = new Set(
        activations?.map((a: any) => a.modules?.module_code).filter(Boolean) || []
      );

      // Get sites
      const { data: sites } = await supabaseAdmin
        .from('sites')
        .select('id, regulator, water_company')
        .eq('company_id', company.id)
        .is('deleted_at', null);

      // Check for Module 2 opportunities (Trade Effluent)
      if (!activeModuleCodes.has('MODULE_2')) {
        const hasWaterCompany = sites?.some((s: any) => s.water_company);
        if (hasWaterCompany) {
          await createCrossSellTrigger(company.id, 'MODULE_2', 'TRADE_EFFLUENT_DETECTED');
          triggersCreated.push({ company_id: company.id, module: 'MODULE_2' });
        }
      }

      // Check for Module 3 opportunities (MCPD/Generators)
      if (!activeModuleCodes.has('MODULE_3')) {
        // Check if they have any generator-related documents
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('id, document_type')
          .in('site_id', sites?.map((s: any) => s.id) || [])
          .in('document_type', ['MCPD_REGISTRATION', 'GENERATOR_PERMIT'])
          .limit(1);

        if (documents && documents.length > 0) {
          await createCrossSellTrigger(company.id, 'MODULE_3', 'GENERATOR_DETECTED');
          triggersCreated.push({ company_id: company.id, module: 'MODULE_3' });
        }
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
          companies_checked: companies.length,
          triggers_created: triggersCreated.length,
        }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('Cross-sell triggers job error:', error);

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

async function createCrossSellTrigger(
  companyId: string,
  moduleCode: string,
  triggerReason: string
): Promise<void> {
  // Get module ID
  const { data: module } = await supabaseAdmin
    .from('modules')
    .select('id')
    .eq('module_code', moduleCode)
    .single();

  if (!module) {
    return;
  }

  // Check if trigger already exists
  const { data: existing } = await supabaseAdmin
    .from('cross_sell_triggers')
    .select('id')
    .eq('company_id', companyId)
    .eq('module_id', module.id)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from('cross_sell_triggers')
      .insert({
        company_id: companyId,
        module_id: module.id,
        trigger_reason: triggerReason,
        status: 'PENDING',
        detected_at: new Date().toISOString(),
      });
  }
}

