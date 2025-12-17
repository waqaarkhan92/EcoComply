/**
 * Compliance Risk Score Service
 * Calculates predictive risk scores based on historical patterns
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 3
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface RiskFactors {
  historicalBreaches: number; // 0-1 normalized
  overdueCount: number; // 0-1 normalized
  evidenceGapCount: number; // 0-1 normalized
  deadlineProximity: number; // 0-1 normalized
  lateCompletionRate: number; // 0-1 normalized
  complexityScore: number; // 0-1 normalized
}

export interface RiskScore {
  score: number; // 0-100
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: RiskFactors;
}

const RISK_WEIGHTS = {
  historicalBreaches: 0.25,
  overdueCount: 0.20,
  evidenceGapCount: 0.20,
  deadlineProximity: 0.15,
  lateCompletionRate: 0.10,
  complexityScore: 0.10,
};

function getRiskLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function normalizeValue(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(value / max, 1);
}

export class RiskScoreService {
  /**
   * Calculate risk score for a site
   */
  async calculateSiteRiskScore(siteId: string, companyId: string): Promise<RiskScore> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch all required data in parallel
    const [
      overdueResult,
      evidenceGapsResult,
      upcomingDeadlinesResult,
      completionMetricsResult,
      historicalBreachesResult,
      totalObligationsResult,
    ] = await Promise.all([
      // Count overdue obligations
      supabaseAdmin
        .from('deadlines')
        .select('id', { count: 'exact' })
        .eq('status', 'PENDING')
        .lt('due_date', now.toISOString().split('T')[0])
        .eq('obligations.site_id', siteId),

      // Count evidence gaps
      supabaseAdmin
        .from('evidence_gaps')
        .select('id', { count: 'exact' })
        .eq('site_id', siteId)
        .is('resolved_at', null)
        .is('dismissed_at', null),

      // Upcoming deadlines (next 7 days)
      supabaseAdmin
        .from('deadlines')
        .select('id, due_date', { count: 'exact' })
        .eq('status', 'PENDING')
        .gte('due_date', now.toISOString().split('T')[0])
        .lte('due_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),

      // Late completion rate (last 90 days)
      supabaseAdmin
        .from('obligation_completion_metrics')
        .select('was_late', { count: 'exact' })
        .eq('site_id', siteId)
        .gte('completed_at', ninetyDaysAgo.toISOString()),

      // Historical breaches (enforcement notices, exceedances)
      supabaseAdmin
        .from('enforcement_notices')
        .select('id', { count: 'exact' })
        .eq('site_id', siteId)
        .gte('created_at', ninetyDaysAgo.toISOString()),

      // Total obligations for site
      supabaseAdmin
        .from('obligations')
        .select('id', { count: 'exact' })
        .eq('site_id', siteId),
    ]);

    const totalObligations = totalObligationsResult.count || 1;
    const overdueCount = overdueResult.count || 0;
    const evidenceGapCount = evidenceGapsResult.count || 0;
    const upcomingDeadlineCount = upcomingDeadlinesResult.count || 0;
    const historicalBreachCount = historicalBreachesResult.count || 0;

    // Calculate late completion rate
    let lateCompletionRate = 0;
    if (completionMetricsResult.data && completionMetricsResult.data.length > 0) {
      const lateCount = completionMetricsResult.data.filter((m: any) => m.was_late).length;
      lateCompletionRate = lateCount / completionMetricsResult.data.length;
    }

    // Normalize factors
    const factors: RiskFactors = {
      historicalBreaches: normalizeValue(historicalBreachCount, 5), // 5+ breaches = max risk
      overdueCount: normalizeValue(overdueCount, totalObligations * 0.2), // 20% overdue = max
      evidenceGapCount: normalizeValue(evidenceGapCount, totalObligations * 0.3), // 30% gaps = max
      deadlineProximity: normalizeValue(upcomingDeadlineCount, 10), // 10+ in 7 days = high
      lateCompletionRate: lateCompletionRate,
      complexityScore: normalizeValue(totalObligations, 100), // 100+ obligations = complex
    };

    // Calculate weighted score
    const score = Math.round(
      Object.entries(RISK_WEIGHTS).reduce((total, [key, weight]) => {
        return total + factors[key as keyof RiskFactors] * weight * 100;
      }, 0)
    );

    return {
      score: Math.min(100, Math.max(0, score)),
      level: getRiskLevel(score),
      factors,
    };
  }

  /**
   * Calculate and store risk scores for all sites in a company
   */
  async calculateCompanyRiskScores(companyId: string): Promise<{ sitesProcessed: number }> {
    const { data: sites, error } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', companyId);

    if (error || !sites) {
      throw new Error(`Failed to fetch sites: ${error?.message}`);
    }

    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setHours(validUntil.getHours() + 24); // Valid for 24 hours

    for (const site of sites) {
      const riskScore = await this.calculateSiteRiskScore(site.id, companyId);

      // Upsert risk score
      await supabaseAdmin
        .from('compliance_risk_scores')
        .upsert(
          {
            company_id: companyId,
            site_id: site.id,
            score_type: 'SITE',
            risk_score: riskScore.score,
            risk_level: riskScore.level,
            factors: riskScore.factors,
            calculated_at: now.toISOString(),
            valid_until: validUntil.toISOString(),
          },
          {
            onConflict: 'company_id,site_id,score_type',
            ignoreDuplicates: false,
          }
        );

      // Store history for trending
      await supabaseAdmin.from('compliance_risk_history').insert({
        company_id: companyId,
        site_id: site.id,
        score_type: 'SITE',
        risk_score: riskScore.score,
        risk_level: riskScore.level,
        recorded_at: now.toISOString(),
      });
    }

    return { sitesProcessed: sites.length };
  }

  /**
   * Get current risk scores for a company
   */
  async getRiskScores(
    companyId: string,
    options: { siteId?: string; scoreType?: string } = {}
  ): Promise<any[]> {
    let query = supabaseAdmin
      .from('compliance_risk_scores')
      .select('*')
      .eq('company_id', companyId)
      .gt('valid_until', new Date().toISOString());

    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    if (options.scoreType) {
      query = query.eq('score_type', options.scoreType);
    }

    const { data, error } = await query.order('risk_score', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch risk scores: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get risk score trends for a site
   */
  async getRiskTrends(
    companyId: string,
    siteId: string,
    days: number = 30
  ): Promise<{ date: string; score: number; level: string }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('compliance_risk_history')
      .select('risk_score, risk_level, recorded_at')
      .eq('company_id', companyId)
      .eq('site_id', siteId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch risk trends: ${error.message}`);
    }

    return (data || []).map(row => ({
      date: row.recorded_at,
      score: row.risk_score,
      level: row.risk_level,
    }));
  }
}

export const riskScoreService = new RiskScoreService();
