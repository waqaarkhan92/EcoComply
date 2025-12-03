/**
 * Compliance Score Calculation Service
 * Implements full compliance score calculation per Product Business Logic Specification B.5.4
 * Reference: docs/specs/30_Product_Business_Logic.md Section B.5.4
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface ComplianceScoreResult {
  score: number;
  breakdown: {
    total_due_obligations: number;
    completed_and_evidenced_obligations: number;
    overdue_obligations: number;
    completion_rate: number;
    overdue_penalty: number;
    compliance_clock_penalty: number;
  };
  calculated_at: string;
}

export interface ModuleComplianceScore extends ComplianceScoreResult {
  module_id: string;
  module_name: string;
}

/**
 * Get current compliance period for recurring obligations
 * For now, uses calendar year. Can be enhanced to support different period types.
 */
function getCurrentCompliancePeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}`;
}

/**
 * Calculate module-level compliance score for a site
 */
export async function calculateModuleComplianceScore(
  siteId: string,
  moduleId: string
): Promise<ComplianceScoreResult> {
  const currentDate = new Date().toISOString().split('T')[0];
  const currentPeriod = getCurrentCompliancePeriod();

  // Get obligation counts with evidence validation
  const { data: obligations, error: obligationsError } = await supabaseAdmin
    .from('obligations')
    .select(`
      id,
      status,
      deadline_date,
      frequency,
      obligation_evidence_links(
        id,
        unlinked_at,
        compliance_period
      )
    `)
    .eq('site_id', siteId)
    .eq('module_id', moduleId)
    .is('deleted_at', null)
    .in('status', ['PENDING', 'INCOMPLETE', 'COMPLETE']);

  if (obligationsError) {
    console.error('Error fetching obligations for compliance score:', obligationsError);
    throw obligationsError;
  }

  // Filter obligations that are currently due
  const dueObligations = (obligations || []).filter((o) => {
    // Exclude NOT_APPLICABLE and CANCELLED (already filtered in query)
    if (o.status === 'NOT_APPLICABLE' || o.status === 'CANCELLED') {
      return false;
    }
    // Include if deadline has passed or is recurring
    return o.deadline_date <= currentDate || o.frequency !== null;
  });

  // Count completed and evidenced obligations
  const completedAndEvidenced = dueObligations.filter((o) => {
    if (o.status !== 'COMPLETE') return false;
    
    // Check for active evidence links
    const hasActiveEvidence = o.obligation_evidence_links?.some(
      (link: any) => link.unlinked_at === null
    );
    
    if (!hasActiveEvidence) return false;
    
    // For recurring obligations, check compliance period
    if (o.frequency !== null) {
      const hasPeriodEvidence = o.obligation_evidence_links?.some(
        (link: any) => link.unlinked_at === null && link.compliance_period === currentPeriod
      );
      return hasPeriodEvidence;
    }
    
    return true;
  });

  // Count overdue obligations
  const overdueObligations = dueObligations.filter(
    (o) => o.deadline_date < currentDate && o.status !== 'COMPLETE'
  );

  const totalDue = dueObligations.length;
  const completedCount = completedAndEvidenced.length;
  const overdueCount = overdueObligations.length;

  // Calculate base score
  let score = totalDue === 0 ? 100 : Math.round((completedCount / totalDue) * 100);

  // Apply overdue penalty: Each overdue obligation reduces score by (1 / total_due) * 100
  const overduePenalty = totalDue > 0 ? (overdueCount / totalDue) * 100 : 0;
  score = Math.max(0, score - overduePenalty);

  // Apply Compliance Clock penalties
  const complianceClockPenalty = await calculateComplianceClockPenalty(siteId, moduleId);
  score = Math.max(0, score - complianceClockPenalty);

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    breakdown: {
      total_due_obligations: totalDue,
      completed_and_evidenced_obligations: completedCount,
      overdue_obligations: overdueCount,
      completion_rate: totalDue > 0 ? (completedCount / totalDue) * 100 : 100,
      overdue_penalty,
      compliance_clock_penalty: complianceClockPenalty,
    },
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Calculate Compliance Clock penalty
 * RED: -10 points per overdue item
 * AMBER: -5 points per overdue item
 * GREEN: -2 points per overdue item
 */
async function calculateComplianceClockPenalty(
  siteId: string,
  moduleId: string
): Promise<number> {
  const { data: clockItems, error } = await supabaseAdmin
    .from('compliance_clocks_universal')
    .select('id, criticality, status, days_remaining')
    .eq('site_id', siteId)
    .eq('module_id', moduleId)
    .eq('status', 'OVERDUE')
    .in('criticality', ['RED', 'AMBER', 'GREEN']);

  if (error) {
    console.error('Error fetching compliance clock items:', error);
    return 0;
  }

  let penalty = 0;
  (clockItems || []).forEach((item) => {
    switch (item.criticality) {
      case 'RED':
        penalty += 10;
        break;
      case 'AMBER':
        penalty += 5;
        break;
      case 'GREEN':
        penalty += 2;
        break;
    }
  });

  return penalty;
}

/**
 * Calculate site-level compliance score (average of all active module scores)
 */
export async function calculateSiteComplianceScore(
  siteId: string
): Promise<ComplianceScoreResult> {
  // Get all active module activations for this site
  const { data: moduleActivations, error } = await supabaseAdmin
    .from('module_activations')
    .select('id, module_id, compliance_score, modules!inner(module_name)')
    .eq('site_id', siteId)
    .eq('status', 'ACTIVE')
    .not('compliance_score', 'is', null);

  if (error) {
    console.error('Error fetching module activations:', error);
    throw error;
  }

  if (!moduleActivations || moduleActivations.length === 0) {
    return {
      score: 100,
      breakdown: {
        total_due_obligations: 0,
        completed_and_evidenced_obligations: 0,
        overdue_obligations: 0,
        completion_rate: 100,
        overdue_penalty: 0,
        compliance_clock_penalty: 0,
      },
      calculated_at: new Date().toISOString(),
    };
  }

  // Calculate average of module scores
  const totalScore = moduleActivations.reduce(
    (sum, ma) => sum + (ma.compliance_score || 0),
    0
  );
  const averageScore = Math.round(totalScore / moduleActivations.length);

  // Aggregate breakdown (simplified - could be enhanced)
  const totalObligations = moduleActivations.reduce(
    (sum, ma) => sum + (ma.compliance_score || 0),
    0
  );

  return {
    score: averageScore,
    breakdown: {
      total_due_obligations: moduleActivations.length,
      completed_and_evidenced_obligations: Math.round(
        (averageScore / 100) * moduleActivations.length
      ),
      overdue_obligations: 0, // Would need to aggregate from modules
      completion_rate: averageScore,
      overdue_penalty: 0, // Would need to aggregate from modules
      compliance_clock_penalty: 0, // Would need to aggregate from modules
    },
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Update compliance scores for a site and all its modules
 * Called when obligations/evidence change
 */
export async function updateComplianceScores(siteId: string): Promise<void> {
  try {
    // Get all active modules for this site
    const { data: moduleActivations, error: maError } = await supabaseAdmin
      .from('module_activations')
      .select('id, module_id, modules!inner(module_name)')
      .eq('site_id', siteId)
      .eq('status', 'ACTIVE');

    if (maError) {
      console.error('Error fetching module activations:', maError);
      return;
    }

    // Calculate and update module-level scores
    const moduleScores: ModuleComplianceScore[] = [];
    for (const ma of moduleActivations || []) {
      try {
        const scoreResult = await calculateModuleComplianceScore(siteId, ma.module_id);
        moduleScores.push({
          ...scoreResult,
          module_id: ma.module_id,
          module_name: (ma.modules as any)?.module_name || 'Unknown',
        });

        // Update module_activations table
        await supabaseAdmin
          .from('module_activations')
          .update({
            compliance_score: scoreResult.score,
            compliance_score_updated_at: new Date().toISOString(),
          })
          .eq('id', ma.id);
      } catch (error) {
        console.error(`Error calculating score for module ${ma.module_id}:`, error);
      }
    }

    // Calculate and update site-level score
    const siteScore = await calculateSiteComplianceScore(siteId);
    await supabaseAdmin
      .from('sites')
      .update({
        compliance_score: siteScore.score,
        compliance_score_updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    console.log(`Updated compliance scores for site ${siteId}:`, {
      site_score: siteScore.score,
      module_scores: moduleScores.map((ms) => ({
        module: ms.module_name,
        score: ms.score,
      })),
    });
  } catch (error) {
    console.error('Error updating compliance scores:', error);
    throw error;
  }
}

/**
 * Get compliance score color coding
 * 90-100: Green
 * 70-89: Amber
 * 0-69: Red
 */
export function getComplianceScoreColor(score: number): 'green' | 'amber' | 'red' {
  if (score >= 90) return 'green';
  if (score >= 70) return 'amber';
  return 'red';
}

/**
 * Get compliance score status text
 */
export function getComplianceScoreStatus(score: number): string {
  if (score >= 90) return 'Compliant';
  if (score >= 70) return 'Needs Attention';
  return 'Non-Compliant';
}

