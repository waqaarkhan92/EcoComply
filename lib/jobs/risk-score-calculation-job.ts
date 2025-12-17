/**
 * Risk Score Calculation Job
 * Calculates compliance risk scores for all sites daily
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 3
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { riskScoreService } from '@/lib/services/risk-score-service';

export interface RiskScoreCalculationJobData {
  company_id?: string; // If not provided, process all companies
}

export async function processRiskScoreCalculationJob(
  job: Job<RiskScoreCalculationJobData>
): Promise<{ companiesProcessed: number; sitesProcessed: number }> {
  const { company_id } = job.data;

  let companiesProcessed = 0;
  let sitesProcessed = 0;

  try {
    // Get companies to process
    let companies: { id: string }[] = [];

    if (company_id) {
      companies = [{ id: company_id }];
    } else {
      const { data, error } = await supabaseAdmin
        .from('companies')
        .select('id')
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`);
      }

      companies = data || [];
    }

    // Process each company
    for (const company of companies) {
      try {
        const result = await riskScoreService.calculateCompanyRiskScores(company.id);
        companiesProcessed++;
        sitesProcessed += result.sitesProcessed;

        console.log(
          `Calculated risk scores for company ${company.id}: ${result.sitesProcessed} sites`
        );
      } catch (companyError: any) {
        console.error(`Error calculating risk scores for company ${company.id}:`, companyError);
        // Continue with other companies
      }
    }

    console.log(
      `Risk score calculation completed: ${companiesProcessed} companies, ${sitesProcessed} sites`
    );

    return { companiesProcessed, sitesProcessed };
  } catch (error: any) {
    console.error('Risk score calculation job failed:', error);
    throw error;
  }
}
