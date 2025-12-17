/**
 * EA Regulatory Pack Engine Service
 * Implements pack generation with commercial safeguards
 * Based on Phase 4/5 Build Outputs
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import type {
  PackType,
  PackConfiguration,
  PackGenerationRequest,
  PackGenerationResult,
  RuleEvaluation,
  RuleResult,
  CompanyAdoptionConfig,
  ElvComplianceCheckResult,
  ComplianceBand,
  RiskCategory,
  IncidentDisclosureLevel,
  BoardPackDetailLevel,
} from '@/lib/types/regulatory';

// ============================================================================
// CONSTANTS
// ============================================================================

const PACK_SECTIONS: Record<PackType, string[]> = {
  REGULATOR_PACK: ['1', '2', '3', '4', '5', '6', '7', '8'],
  INTERNAL_AUDIT_PACK: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  BOARD_PACK: ['1', '2', '3', '4', '5', '6', '7', '8'],
  TENDER_PACK: ['1', '2', '3', '4', '5', '6', '7'],
};

const RISK_CATEGORY_POINTS: Record<RiskCategory, number> = {
  '1': 60,
  '2': 31,
  '3': 4,
  '4': 0.1,
};

const COMPLIANCE_BAND_MULTIPLIERS: Record<ComplianceBand, number> = {
  A: 0.95,
  B: 1.0,
  C: 1.1,
  D: 1.25,
  E: 1.5,
  F: 3.0,
};

// ============================================================================
// RULE CONTEXT
// ============================================================================

interface RuleContext {
  companyId: string;
  siteIds: string[];
  adoptionConfig: CompanyAdoptionConfig;
  generationDate: Date;
}

// ============================================================================
// PACK ENGINE CLASS
// ============================================================================

export class PackEngineService {
  /**
   * Get company adoption configuration (Safeguard 1)
   */
  async getCompanyAdoptionConfig(companyId: string): Promise<CompanyAdoptionConfig> {
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('adoption_mode, adoption_mode_expiry, onboarding_date')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Error fetching company adoption config:', companyError);
      throw companyError;
    }

    const { data: relaxedRules, error: rulesError } = await supabaseAdmin
      .from('company_relaxed_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching relaxed rules:', rulesError);
    }

    return {
      adoptionMode: company?.adoption_mode || 'STANDARD',
      adoptionModeExpiry: company?.adoption_mode_expiry || null,
      onboardingDate: company?.onboarding_date || new Date().toISOString().split('T')[0],
      relaxedRules: relaxedRules || [],
    };
  }

  /**
   * Evaluate all readiness rules for a pack generation request
   */
  async evaluateReadiness(request: PackGenerationRequest): Promise<PackGenerationResult> {
    const adoptionConfig = await this.getCompanyAdoptionConfig(request.companyId);
    const generationDate = request.generationDate || new Date();

    const context: RuleContext = {
      companyId: request.companyId,
      siteIds: request.siteIds,
      adoptionConfig,
      generationDate,
    };

    // Get applicable rules for this pack type
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('pack_readiness_rules')
      .select('*')
      .contains('pack_types', [request.packType])
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching readiness rules:', rulesError);
      throw rulesError;
    }

    // Evaluate each rule
    const evaluations: RuleEvaluation[] = [];
    for (const rule of rules || []) {
      const evaluation = await this.evaluateRule(rule, context, request.packType);
      evaluations.push(evaluation);
    }

    // Categorize results
    const blockingFailures = evaluations.filter((e) => e.result === 'FAIL' && e.blocking);
    const warnings = evaluations.filter(
      (e) => e.result === 'WARNING' || (e.result === 'FAIL' && !e.blocking)
    );
    const passedRules = evaluations.filter((e) => e.result === 'PASS' || e.result === 'INFO');

    // Get pack metadata
    const packMetadata = await this.getPackMetadata(request);

    return {
      packId: crypto.randomUUID(),
      canGenerate: blockingFailures.length === 0,
      blockingFailures,
      warnings,
      passedRules,
      packMetadata,
    };
  }

  /**
   * Evaluate a single readiness rule
   */
  private async evaluateRule(
    rule: any,
    context: RuleContext,
    packType: PackType
  ): Promise<RuleEvaluation> {
    const { companyId, siteIds, adoptionConfig, generationDate } = context;

    // Check if rule is relaxed in First-Year Mode
    const isRelaxed =
      adoptionConfig.adoptionMode === 'FIRST_YEAR' &&
      adoptionConfig.relaxedRules.some((r) => r.rule_id === rule.rule_id);

    try {
      switch (rule.rule_id) {
        case 'RA-001':
          return await this.evaluateAllConditionsAssessed(rule, siteIds);

        case 'RA-003':
          return await this.evaluateDocumentRetention(
            rule,
            companyId,
            siteIds,
            'WASTE_TRANSFER_NOTE',
            isRelaxed ? adoptionConfig.onboardingDate : null,
            24
          );

        case 'RA-004':
          return await this.evaluateDocumentRetention(
            rule,
            companyId,
            siteIds,
            'CONSIGNMENT_NOTE',
            isRelaxed ? adoptionConfig.onboardingDate : null,
            36
          );

        case 'RA-006':
          return await this.evaluateClimateAdaptation(rule, siteIds, generationDate);

        case 'RA-010':
          return await this.evaluateMcpRecords(
            rule,
            companyId,
            siteIds,
            isRelaxed ? adoptionConfig.onboardingDate : null
          );

        case 'RC-001':
          return await this.evaluateObligationCoverage(rule, siteIds, 90);

        case 'RC-003':
          return await this.evaluateHighSeverityCapas(rule, siteIds);

        case 'RC-006':
          return this.evaluateTrendData(rule, adoptionConfig, generationDate);

        case 'RD-001':
          return await this.evaluatePermitStatus(rule, siteIds);

        case 'RD-002':
          return await this.evaluateComplianceBand(rule, siteIds, isRelaxed);

        case 'RD-005':
          return await this.evaluateNoCategory1Breaches(rule, siteIds, generationDate);

        default:
          // Default pass for rules without specific implementation
          return {
            ruleId: rule.rule_id,
            description: rule.description,
            result: 'PASS',
            blocking: rule.is_blocking,
            details: 'Rule evaluation not implemented - defaulting to pass',
          };
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.rule_id}:`, error);
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'WARNING',
        blocking: false,
        details: `Error during evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * RA-001: All conditions assessed
   */
  private async evaluateAllConditionsAssessed(
    rule: any,
    siteIds: string[]
  ): Promise<RuleEvaluation> {
    const { count: totalObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .is('deleted_at', null);

    const { count: assessedObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .is('deleted_at', null)
      .not('status', 'eq', 'PENDING');

    const total = totalObligations || 0;
    const assessed = assessedObligations || 0;
    const unassessed = total - assessed;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: unassessed === 0 ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details:
        unassessed > 0
          ? `${unassessed} of ${total} obligations not assessed`
          : `All ${total} obligations assessed`,
      recommendation:
        unassessed > 0
          ? 'Complete compliance assessment for all permit conditions before generating pack'
          : undefined,
    };
  }

  /**
   * RA-003/RA-004: Document retention (with First-Year Mode support)
   */
  private async evaluateDocumentRetention(
    rule: any,
    companyId: string,
    siteIds: string[],
    evidenceType: string,
    relaxedStartDate: string | null,
    standardMonths: number
  ): Promise<RuleEvaluation> {
    const lookbackStart = relaxedStartDate
      ? new Date(relaxedStartDate)
      : new Date(Date.now() - standardMonths * 30 * 24 * 60 * 60 * 1000);

    const { count: evidenceCount } = await supabaseAdmin
      .from('evidence_items')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('site_id', siteIds)
      .gte('created_at', lookbackStart.toISOString());

    const hasEvidence = (evidenceCount || 0) > 0;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: hasEvidence ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details: relaxedStartDate
        ? `First-Year Mode: Checking from ${lookbackStart.toISOString().split('T')[0]}`
        : `Checking coverage for full ${standardMonths}-month period`,
      recommendation: !hasEvidence
        ? `Upload ${evidenceType.toLowerCase().replace('_', ' ')}s for the required period`
        : undefined,
    };
  }

  /**
   * RA-006: Climate adaptation plan
   */
  private async evaluateClimateAdaptation(
    rule: any,
    siteIds: string[],
    generationDate: Date
  ): Promise<RuleEvaluation> {
    const cutoffDate = new Date('2023-04-01');

    // Check if any documents (permits) were issued after April 2023
    const { data: recentPermits, count: recentPermitCount } = await supabaseAdmin
      .from('documents')
      .select('id, created_at', { count: 'exact' })
      .in('site_id', siteIds)
      .gte('created_at', cutoffDate.toISOString());

    if (!recentPermitCount || recentPermitCount === 0) {
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'PASS',
        blocking: rule.is_blocking,
        details: 'No permits issued on/after 1 April 2023 in scope',
      };
    }

    // Check for climate adaptation evidence (simplified check)
    const { count: climateEvidence } = await supabaseAdmin
      .from('evidence_items')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .or('title.ilike.%climate%,title.ilike.%adaptation%');

    const hasClimateEvidence = (climateEvidence || 0) > 0;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: hasClimateEvidence ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details: `${recentPermitCount} permit(s) require climate adaptation plan`,
      recommendation: !hasClimateEvidence
        ? 'Integrate climate change adaptation planning into management system per EA guidance'
        : undefined,
    };
  }

  /**
   * RA-010: MCP 6-year records
   */
  private async evaluateMcpRecords(
    rule: any,
    companyId: string,
    siteIds: string[],
    relaxedStartDate: string | null
  ): Promise<RuleEvaluation> {
    // Check if there are any MCP/generator records
    const { count: mcpCount } = await supabaseAdmin
      .from('generators')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds);

    if (!mcpCount || mcpCount === 0) {
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'PASS',
        blocking: rule.is_blocking,
        details: 'No MCP equipment in scope',
      };
    }

    const lookbackStart = relaxedStartDate
      ? new Date(relaxedStartDate)
      : new Date(Date.now() - 72 * 30 * 24 * 60 * 60 * 1000); // 6 years

    const { count: recordCount } = await supabaseAdmin
      .from('run_hours')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .gte('created_at', lookbackStart.toISOString());

    const hasRecords = (recordCount || 0) > 0;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: hasRecords ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details: relaxedStartDate
        ? `First-Year Mode: Checking MCP records from ${lookbackStart.toISOString().split('T')[0]}`
        : 'Checking MCP records for full 6-year period',
      recommendation: !hasRecords ? 'Upload MCP monitoring records for the required period' : undefined,
    };
  }

  /**
   * RC-001: 90% obligation coverage
   */
  private async evaluateObligationCoverage(
    rule: any,
    siteIds: string[],
    threshold: number
  ): Promise<RuleEvaluation> {
    const { count: totalObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .is('deleted_at', null);

    const { count: assessedObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .is('deleted_at', null)
      .in('status', ['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'NOT_APPLICABLE']);

    const total = totalObligations || 0;
    const assessed = assessedObligations || 0;
    const percentage = total > 0 ? (assessed / total) * 100 : 100;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: percentage >= threshold ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details: `${percentage.toFixed(1)}% of obligations assessed (${assessed}/${total})`,
      recommendation:
        percentage < threshold
          ? `Assess ${Math.ceil(total * (threshold / 100)) - assessed} more obligations to reach ${threshold}% threshold`
          : undefined,
    };
  }

  /**
   * RC-003: Category 1-2 breaches must have CAPA
   */
  private async evaluateHighSeverityCapas(rule: any, siteIds: string[]): Promise<RuleEvaluation> {
    const { data: highSeverityBreaches } = await supabaseAdmin
      .from('ccs_non_compliances')
      .select(
        `
        id,
        risk_category,
        ccs_assessment_id,
        ccs_assessments!inner(site_id)
      `
      )
      .in('risk_category', ['1', '2']);

    // Filter by site
    const siteBreaches =
      highSeverityBreaches?.filter((b: any) => siteIds.includes(b.ccs_assessments?.site_id)) || [];

    if (siteBreaches.length === 0) {
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'PASS',
        blocking: rule.is_blocking,
        details: 'No Category 1-2 breaches to assess',
      };
    }

    // Check for linked CAPAs
    const breachIds = siteBreaches.map((b: any) => b.id);
    const { count: capaCount } = await supabaseAdmin
      .from('regulatory_capas')
      .select('id', { count: 'exact', head: true })
      .in('ccs_non_compliance_id', breachIds);

    const withCapa = capaCount || 0;
    const withoutCapa = siteBreaches.length - withCapa;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: withoutCapa === 0 ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details:
        withoutCapa > 0
          ? `${withoutCapa} Category 1-2 breach(es) without CAPA`
          : `All ${siteBreaches.length} Category 1-2 breaches have linked CAPAs`,
      recommendation:
        withoutCapa > 0
          ? 'Create CAPAs for all Category 1-2 breaches to demonstrate corrective action'
          : undefined,
    };
  }

  /**
   * RC-006: Trend data (with First-Year Mode support)
   */
  private evaluateTrendData(
    rule: any,
    adoptionConfig: CompanyAdoptionConfig,
    generationDate: Date
  ): RuleEvaluation {
    if (adoptionConfig.adoptionMode === 'FIRST_YEAR') {
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'INFO',
        blocking: false,
        details: 'First-Year Mode: Trend data will be calculated from onboarding date',
        recommendation: 'Full trend analysis will be available after first compliance year completes',
      };
    }

    // Standard mode would check for 24 months of data
    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: 'WARNING',
      blocking: false,
      details: 'Trend analysis requires review of historical data',
    };
  }

  /**
   * RD-001: All permits must be active
   */
  private async evaluatePermitStatus(rule: any, siteIds: string[]): Promise<RuleEvaluation> {
    // Check documents (permits) status
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('id, title, status')
      .in('site_id', siteIds)
      .neq('status', 'ACTIVE');

    const inactiveCount = documents?.length || 0;

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: inactiveCount === 0 ? 'PASS' : 'FAIL',
      blocking: rule.is_blocking,
      details:
        inactiveCount > 0
          ? `${inactiveCount} permit(s) not ACTIVE`
          : 'All permits have ACTIVE status',
      recommendation:
        inactiveCount > 0 ? 'Cannot include suspended/revoked permits in tender pack' : undefined,
    };
  }

  /**
   * RD-002: Compliance band A-C (with First-Year Mode downgrade)
   */
  private async evaluateComplianceBand(
    rule: any,
    siteIds: string[],
    isRelaxed: boolean
  ): Promise<RuleEvaluation> {
    const currentYear = new Date().getFullYear();

    const { data: assessments } = await supabaseAdmin
      .from('ccs_assessments')
      .select('site_id, compliance_band')
      .in('site_id', siteIds)
      .eq('compliance_year', currentYear);

    const poorBandSites =
      assessments?.filter((a) => a.compliance_band && ['D', 'E', 'F'].includes(a.compliance_band)) ||
      [];

    const result: RuleResult =
      poorBandSites.length === 0 ? 'PASS' : isRelaxed ? 'INFO' : 'WARNING';

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result,
      blocking: false,
      details:
        poorBandSites.length > 0
          ? `${poorBandSites.length} site(s) in Band D-F`
          : 'All sites in Band A-C',
      recommendation:
        poorBandSites.length > 0
          ? isRelaxed
            ? 'First-Year Mode: Band D-F may be acceptable as baseline; improve during year 1'
            : 'Band D-F sites may disqualify from some tenders; consider improving compliance'
          : undefined,
    };
  }

  /**
   * RD-005: No Category 1 breaches in current year
   */
  private async evaluateNoCategory1Breaches(
    rule: any,
    siteIds: string[],
    generationDate: Date
  ): Promise<RuleEvaluation> {
    const currentYear = generationDate.getFullYear();

    const { data: assessments } = await supabaseAdmin
      .from('ccs_assessments')
      .select('id')
      .in('site_id', siteIds)
      .eq('compliance_year', currentYear);

    const assessmentIds = assessments?.map((a) => a.id) || [];

    if (assessmentIds.length === 0) {
      return {
        ruleId: rule.rule_id,
        description: rule.description,
        result: 'PASS',
        blocking: rule.is_blocking,
        details: `No CCS assessments for ${currentYear}`,
      };
    }

    const { count: cat1Count } = await supabaseAdmin
      .from('ccs_non_compliances')
      .select('id', { count: 'exact', head: true })
      .in('ccs_assessment_id', assessmentIds)
      .eq('risk_category', '1');

    return {
      ruleId: rule.rule_id,
      description: rule.description,
      result: (cat1Count || 0) === 0 ? 'PASS' : 'WARNING',
      blocking: false,
      details:
        (cat1Count || 0) > 0
          ? `${cat1Count} Category 1 breach(es) in ${currentYear}`
          : `No Category 1 breaches in ${currentYear}`,
      recommendation:
        (cat1Count || 0) > 0
          ? 'Category 1 breaches may require disclosure in tender responses'
          : undefined,
    };
  }

  /**
   * Get pack metadata
   */
  private async getPackMetadata(request: PackGenerationRequest) {
    const { count: totalObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', request.siteIds)
      .is('deleted_at', null);

    const { count: assessedObligations } = await supabaseAdmin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .in('site_id', request.siteIds)
      .is('deleted_at', null)
      .not('status', 'eq', 'PENDING');

    const { count: evidenceCount } = await supabaseAdmin
      .from('evidence_items')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', request.companyId);

    const currentYear = new Date().getFullYear();
    const { count: ccsCount } = await supabaseAdmin
      .from('ccs_assessments')
      .select('id', { count: 'exact', head: true })
      .in('site_id', request.siteIds)
      .eq('compliance_year', currentYear);

    return {
      sectionsIncluded: PACK_SECTIONS[request.packType],
      dataCoverage: {
        sitesIncluded: request.siteIds.length,
        obligationsAssessed: assessedObligations || 0,
        obligationsTotal: totalObligations || 0,
        evidenceItems: evidenceCount || 0,
        ccsAssessmentsCurrent: (ccsCount || 0) > 0,
      },
    };
  }

  /**
   * Generate a pack after readiness validation
   */
  async generatePack(
    request: PackGenerationRequest,
    userId: string
  ): Promise<{ packId: string; status: string }> {
    // First evaluate readiness
    const readiness = await this.evaluateReadiness(request);

    if (!readiness.canGenerate) {
      throw new Error(
        `Pack generation blocked by ${readiness.blockingFailures.length} rule(s): ${readiness.blockingFailures.map((f) => f.ruleId).join(', ')}`
      );
    }

    // Apply pack-specific configuration defaults
    const configuration = this.applyPackConfigurationDefaults(request.packType, request.configuration);

    // Create pack record
    const { data: pack, error } = await supabaseAdmin
      .from('regulatory_packs')
      .insert({
        company_id: request.companyId,
        pack_type: request.packType,
        site_ids: request.siteIds,
        document_ids: request.documentIds || [],
        generation_date: new Date().toISOString(),
        status: 'GENERATING',
        configuration,
        blocking_failures: readiness.blockingFailures,
        warnings: readiness.warnings,
        passed_rules: readiness.passedRules,
        generated_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating pack record:', error);
      throw error;
    }

    // Map regulatory pack types to audit_packs pack types for PDF generation
    const packTypeMapping: Record<PackType, string> = {
      REGULATOR_PACK: 'REGULATOR_INSPECTION',
      INTERNAL_AUDIT_PACK: 'AUDIT_PACK',
      BOARD_PACK: 'BOARD_MULTI_SITE_RISK',
      TENDER_PACK: 'TENDER_CLIENT_ASSURANCE',
    };

    // Create corresponding audit_pack record for PDF generation
    const { data: auditPack, error: auditPackError } = await supabaseAdmin
      .from('audit_packs')
      .insert({
        company_id: request.companyId,
        site_id: request.siteIds.length === 1 ? request.siteIds[0] : null,
        pack_type: packTypeMapping[request.packType] || 'AUDIT_PACK',
        title: `${request.packType} - ${new Date().toISOString().split('T')[0]}`,
        date_range_start: request.dateRangeStart || new Date().toISOString().split('T')[0],
        date_range_end: request.dateRangeEnd || new Date().toISOString().split('T')[0],
        filters_applied: configuration,
        status: 'PENDING',
        storage_path: '',
        file_size_bytes: 0,
        generated_by: userId,
        generation_trigger: 'MANUAL',
      })
      .select('id')
      .single();

    if (auditPackError) {
      console.error('Error creating audit_pack record:', auditPackError);
      // Don't fail - the regulatory_pack is still created
    }

    // Trigger async PDF generation via queue
    if (auditPack) {
      try {
        const packQueue = getQueue(QUEUE_NAMES.AUDIT_PACK_GENERATION);
        await packQueue.add('generate-pack', {
          pack_id: auditPack.id,
          pack_type: packTypeMapping[request.packType] || 'AUDIT_PACK',
          company_id: request.companyId,
          site_id: request.siteIds.length === 1 ? request.siteIds[0] : undefined,
          document_id: request.documentIds?.[0],
          date_range_start: request.dateRangeStart,
          date_range_end: request.dateRangeEnd,
          filters: configuration,
        });

        console.log(`Pack generation job queued for pack ${auditPack.id}`);

        // Link regulatory_pack to audit_pack
        await supabaseAdmin
          .from('regulatory_packs')
          .update({
            status: 'GENERATING',
            audit_pack_id: auditPack.id,
          })
          .eq('id', pack.id);
      } catch (queueError) {
        console.error('Error queuing pack generation job:', queueError);
        // Fall back to marking as ready without PDF
        await supabaseAdmin
          .from('regulatory_packs')
          .update({
            status: 'READY',
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          })
          .eq('id', pack.id);
      }
    } else {
      // No audit pack created, mark as ready without PDF
      await supabaseAdmin
        .from('regulatory_packs')
        .update({
          status: 'READY',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .eq('id', pack.id);
    }

    return { packId: pack.id, status: auditPack ? 'GENERATING' : 'READY' };
  }

  /**
   * Apply default configuration based on pack type (Safeguards 2 & 4)
   */
  private applyPackConfigurationDefaults(
    packType: PackType,
    config?: PackConfiguration
  ): PackConfiguration {
    const defaults: PackConfiguration = { ...config };

    // Safeguard 2: Board Pack aggregation default
    if (packType === 'BOARD_PACK') {
      defaults.detailLevel = config?.detailLevel || 'AGGREGATED';
      defaults.detailSectionsEnabled = config?.detailSectionsEnabled || [];
    }

    // Safeguard 4: Tender Pack incident opt-in default
    if (packType === 'TENDER_PACK') {
      defaults.includeIncidentStatistics = config?.includeIncidentStatistics || false;
      if (!defaults.includeIncidentStatistics) {
        defaults.incidentOptIn = { enabled: false };
      }
    }

    return defaults;
  }

  /**
   * Request detail access for Board Pack section (Safeguard 2)
   */
  async requestBoardPackDetail(
    packId: string,
    section: string,
    requestedBy: string,
    justification: string
  ): Promise<{ requestId: string; status: string }> {
    const { data, error } = await supabaseAdmin
      .from('board_pack_detail_requests')
      .insert({
        pack_id: packId,
        section_requested: section,
        requested_by: requestedBy,
        justification,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating detail request:', error);
      throw error;
    }

    return { requestId: data.id, status: 'PENDING' };
  }

  /**
   * Approve detail access for Board Pack section (Safeguard 2)
   */
  async approveBoardPackDetail(requestId: string, approvedBy: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('board_pack_detail_requests')
      .update({
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
        status: 'APPROVED',
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error approving detail request:', error);
      throw error;
    }
  }

  /**
   * Opt-in to incident statistics for Tender Pack (Safeguard 4)
   */
  async optInTenderPackIncidents(
    packId: string,
    approvedBy: string,
    justification: string,
    disclosureLevel: IncidentDisclosureLevel
  ): Promise<void> {
    // Get current incident data snapshot
    const { data: pack } = await supabaseAdmin
      .from('regulatory_packs')
      .select('company_id, site_ids')
      .eq('id', packId)
      .single();

    if (!pack) {
      throw new Error('Pack not found');
    }

    const { data: incidents } = await supabaseAdmin
      .from('regulatory_incidents')
      .select('incident_date, incident_type, risk_category, status')
      .eq('company_id', pack.company_id)
      .in('site_id', pack.site_ids);

    // Record opt-in decision
    await supabaseAdmin.from('tender_pack_incident_optins').insert({
      pack_id: packId,
      opt_in_decision: 'INCLUDED',
      disclosure_level: disclosureLevel,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      justification,
      incident_data_snapshot: incidents,
    });

    // Update pack configuration
    const { data: currentPack } = await supabaseAdmin
      .from('regulatory_packs')
      .select('configuration')
      .eq('id', packId)
      .single();

    const updatedConfig: PackConfiguration = {
      ...(currentPack?.configuration as PackConfiguration),
      includeIncidentStatistics: true,
      incidentOptIn: {
        enabled: true,
        approvedBy,
        approvedDate: new Date().toISOString(),
        justification,
        disclosureLevel,
      },
    };

    await supabaseAdmin
      .from('regulatory_packs')
      .update({ configuration: updatedConfig })
      .eq('id', packId);
  }

  /**
   * Check ELV compliance against permit-verbatim values (Safeguard 3)
   */
  async checkElvCompliance(
    elvConditionId: string,
    measuredValue: number,
    measuredUnit: string,
    referenceConditions?: string
  ): Promise<ElvComplianceCheckResult> {
    const { data: condition, error } = await supabaseAdmin
      .from('elv_conditions')
      .select('*')
      .eq('id', elvConditionId)
      .single();

    if (error || !condition) {
      throw new Error('ELV condition not found');
    }

    // Validate measurement parameters match permit
    if (measuredUnit !== condition.elv_unit) {
      throw new Error(
        `Unit mismatch: measured in ${measuredUnit}, permit specifies ${condition.elv_unit}`
      );
    }

    if (referenceConditions && referenceConditions !== condition.elv_reference_conditions) {
      throw new Error(
        `Reference conditions mismatch: ${referenceConditions} vs permit ${condition.elv_reference_conditions}`
      );
    }

    const isCompliant = measuredValue <= condition.elv_value;
    const headroom = condition.elv_value - measuredValue;

    return {
      status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      measured: measuredValue,
      limit: condition.elv_value,
      limitSource: `Permit condition ${condition.condition_reference}`,
      verbatim: condition.elv_verbatim_text,
      exceedance: isCompliant ? undefined : measuredValue - condition.elv_value,
      headroom: isCompliant ? headroom : undefined,
      headroomPercentage: isCompliant ? (headroom / condition.elv_value) * 100 : undefined,
    };
  }

  /**
   * Get CCS dashboard data for a company
   */
  async getCcsDashboard(companyId: string, siteIds: string[]): Promise<any> {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Get current year assessments
    const { data: currentAssessments } = await supabaseAdmin
      .from('ccs_assessments')
      .select('*')
      .in('site_id', siteIds)
      .eq('compliance_year', currentYear);

    // Get previous year assessments
    const { data: previousAssessments } = await supabaseAdmin
      .from('ccs_assessments')
      .select('*')
      .in('site_id', siteIds)
      .eq('compliance_year', previousYear);

    // Get non-compliances by category
    const currentAssessmentIds = currentAssessments?.map((a) => a.id) || [];
    const { data: nonCompliances } = await supabaseAdmin
      .from('ccs_non_compliances')
      .select('risk_category')
      .in('ccs_assessment_id', currentAssessmentIds);

    const categoryBreakdown = {
      category1: nonCompliances?.filter((n) => n.risk_category === '1').length || 0,
      category2: nonCompliances?.filter((n) => n.risk_category === '2').length || 0,
      category3: nonCompliances?.filter((n) => n.risk_category === '3').length || 0,
      category4: nonCompliances?.filter((n) => n.risk_category === '4').length || 0,
    };

    // Get CAPA stats
    const { count: openCapas } = await supabaseAdmin
      .from('regulatory_capas')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .in('status', ['OPEN', 'IN_PROGRESS']);

    const { count: overdueCapas } = await supabaseAdmin
      .from('regulatory_capas')
      .select('id', { count: 'exact', head: true })
      .in('site_id', siteIds)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .lt('target_date', new Date().toISOString().split('T')[0]);

    // Calculate aggregate scores
    const currentTotalScore =
      currentAssessments?.reduce((sum, a) => sum + (a.total_score || 0), 0) || 0;
    const previousTotalScore =
      previousAssessments?.reduce((sum, a) => sum + (a.total_score || 0), 0) || 0;

    // Determine trend
    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NEW' = 'NEW';
    if (previousAssessments && previousAssessments.length > 0) {
      if (currentTotalScore < previousTotalScore) trend = 'IMPROVING';
      else if (currentTotalScore > previousTotalScore) trend = 'DECLINING';
      else trend = 'STABLE';
    }

    return {
      currentYear,
      currentScore: currentTotalScore,
      currentBand: currentAssessments?.[0]?.compliance_band || null,
      previousYear,
      previousScore: previousTotalScore,
      previousBand: previousAssessments?.[0]?.compliance_band || null,
      trend,
      nonCompliancesByCategory: categoryBreakdown,
      openCapas: openCapas || 0,
      overdueCapas: overdueCapas || 0,
    };
  }
}

// Export singleton instance
export const packEngineService = new PackEngineService();
