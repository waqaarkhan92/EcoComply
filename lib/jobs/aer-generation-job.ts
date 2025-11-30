/**
 * AER (Annual Emissions Report) Generation Job
 * Generates Annual Emissions Reports for Module 3
 * Reference: docs/specs/41_Backend_Background_Jobs.md
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export interface AERGenerationJobData {
  site_id: string;
  company_id: string;
  reporting_year: number;
  generator_ids?: string[];
}

export async function processAERGenerationJob(job: Job<AERGenerationJobData>): Promise<void> {
  const { site_id, company_id, reporting_year, generator_ids } = job.data;

  try {
    await job.updateProgress(10);

    // Get generators for the site
    let query = supabaseAdmin
      .from('generators')
      .select('*')
      .eq('site_id', site_id)
      .eq('company_id', company_id)
      .eq('is_active', true);

    if (generator_ids && generator_ids.length > 0) {
      query = query.in('id', generator_ids);
    }

    const { data: generators, error: generatorsError } = await query;

    if (generatorsError) {
      throw new Error(`Failed to fetch generators: ${generatorsError.message}`);
    }

    await job.updateProgress(30);

    if (!generators || generators.length === 0) {
      throw new Error('No generators found for AER generation');
    }

    // Get run-hour records for the reporting year
    const yearStart = `${reporting_year}-01-01`;
    const yearEnd = `${reporting_year}-12-31`;

    const { data: runHourRecords, error: recordsError } = await supabaseAdmin
      .from('run_hour_records')
      .select('*')
      .in('generator_id', generators.map((g: any) => g.id))
      .gte('record_date', yearStart)
      .lte('record_date', yearEnd)
      .order('record_date', { ascending: true });

    if (recordsError) {
      throw new Error(`Failed to fetch run-hour records: ${recordsError.message}`);
    }

    await job.updateProgress(50);

    // Get stack test records
    const { data: stackTests } = await supabaseAdmin
      .from('stack_tests')
      .select('*')
      .in('generator_id', generators.map((g: any) => g.id))
      .gte('test_date', yearStart)
      .lte('test_date', yearEnd);

    await job.updateProgress(70);

    // Generate AER document (simplified - in production, this would use a PDF generation library)
    const aerData = {
      reporting_year,
      site_id,
      company_id,
      generators: generators.map((g: any) => ({
        id: g.id,
        identifier: g.generator_identifier,
        type: g.generator_type,
        fuel_type: g.fuel_type,
        capacity_mw: g.capacity_mw,
        annual_hours: g.current_year_hours,
        run_hour_records: runHourRecords?.filter((r: any) => r.generator_id === g.id) || [],
        stack_tests: stackTests?.filter((t: any) => t.generator_id === g.id) || [],
      })),
      generated_at: new Date().toISOString(),
    };

    // Create AER document record
    const { data: aerDocument, error: aerError } = await supabaseAdmin
      .from('aer_documents')
      .insert({
        site_id,
        company_id,
        reporting_year,
        status: 'COMPLETED',
        generated_at: new Date().toISOString(),
        metadata: aerData,
      })
      .select()
      .single();

    if (aerError) {
      throw new Error(`Failed to create AER document: ${aerError.message}`);
    }

    await job.updateProgress(90);

    // TODO: Generate PDF file and upload to storage
    // For now, we'll just mark it as completed

    await job.updateProgress(100);

    // Update job status
    await supabaseAdmin
      .from('background_jobs')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        result: JSON.stringify({
          aer_document_id: aerDocument.id,
          generators_included: generators.length,
          reporting_year,
        }),
      })
      .eq('job_id', job.id);
  } catch (error: any) {
    console.error('AER generation job error:', error);

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

