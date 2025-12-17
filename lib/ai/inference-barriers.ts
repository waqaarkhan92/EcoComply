/**
 * Inference Barriers
 * Prevents cross-jurisdiction inference and inappropriate field presence in AI extractions
 * Aligned with: docs/09-regulatory/01-methodology-handbook.md Section 8 (Anti-Inference Rules)
 */

import { waterCompanyConfig } from '@/lib/validation/schemas';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: InferenceViolation[];
  warnings: InferenceViolation[];
}

export interface InferenceViolation {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  detectedValue?: unknown;
}

export interface ExtractionContext {
  regulator?: string;
  jurisdiction?: string;
  waterCompany?: string;
  documentType: string;
}

// =============================================================================
// FIELD DEFINITIONS
// =============================================================================

/**
 * Fields that should NEVER be inferred - must come explicitly from document
 * These are high-risk fields where inference could cause compliance issues
 */
export const NEVER_INFER_FIELDS = [
  'emission_limits',
  'emission_limit_values',
  'compliance_dates',
  'mogden_values',
  'mogden_formula',
  'ot_value',
  'os_value',
  'st_value',
  'ss_value',
  'ewc_codes',
  'hazard_codes',
  'operating_hours_limit',
  'annual_run_hour_limit',
  'stack_test_results',
  'discharge_limits',
  'parameter_limits',
  'consent_reference',
  'permit_reference',
  'registration_number',
] as const;

/**
 * Fields that are only valid for specific jurisdictions/regulators
 * Maps field name to array of allowed sources (regulator or water company)
 */
export const JURISDICTION_SPECIFIC_FIELDS: Record<string, readonly string[]> = {
  // Welsh language fields - only NRW and Dŵr Cymru
  condition_text_welsh: ['NRW', 'DWR_CYMRU'],
  welsh_language_scheme: ['NRW', 'DWR_CYMRU'],
  bilingual_content: ['NRW', 'DWR_CYMRU'],

  // Mogden formula - only Thames Water
  mogden_formula: ['THAMES_WATER'],
  mogden_values: ['THAMES_WATER'],
  ot_value: ['THAMES_WATER'],
  os_value: ['THAMES_WATER'],
  st_value: ['THAMES_WATER'],
  ss_value: ['THAMES_WATER'],

  // Scotland-specific
  sepa_registration_number: ['SEPA'],
  sepa_reference: ['SEPA'],
  cas_status: ['SEPA'],
  cas_withdrawn: ['SEPA'],
  ppc_permit_number: ['SEPA'],

  // Northern Ireland-specific
  irish_grid_reference: ['NIEA'],
  niea_reference: ['NIEA'],
  niea_permit_number: ['NIEA'],

  // CCS banding - only England and Wales (not NIEA/SEPA)
  ccs_banding: ['EA', 'NRW'],
  ccs_category: ['EA', 'NRW'],

  // Trade effluent specific by water company
  thames_water_reference: ['THAMES_WATER'],
  severn_trent_reference: ['SEVERN_TRENT'],
  scottish_water_reference: ['SCOTTISH_WATER'],
} as const;

/**
 * Condition types that are jurisdiction-specific
 */
export const JURISDICTION_SPECIFIC_CONDITION_TYPES: Record<string, readonly string[]> = {
  // Scottish-specific condition types
  CAR_LICENCE: ['SEPA'],
  PPC_CONDITION: ['SEPA'],

  // Northern Ireland-specific
  IPPC_NI: ['NIEA'],
} as const;

// =============================================================================
// VALIDATION CLASS
// =============================================================================

export class InferenceBarrier {
  /**
   * Validates extraction output against source document context
   * Prevents cross-jurisdiction inference and inappropriate field presence
   */
  static validateExtractionScope(
    extraction: Record<string, unknown>,
    context: ExtractionContext
  ): ValidationResult {
    const errors: InferenceViolation[] = [];
    const warnings: InferenceViolation[] = [];

    // Get the source identifier (water company takes precedence for trade effluent)
    const sourceKey = context.waterCompany || context.regulator;

    // 1. Check for jurisdiction-specific field violations
    this.checkJurisdictionFields(extraction, sourceKey, errors);

    // 2. Check obligations for jurisdiction-specific violations
    if (Array.isArray(extraction.obligations)) {
      this.checkObligations(extraction.obligations, context, errors, warnings);
    }

    // 3. Check for Welsh language content in non-Welsh documents
    this.checkWelshContent(extraction, context, warnings);

    // 4. Check for inferred critical fields without source references
    this.checkInferredCriticalFields(extraction, warnings);

    // 5. Check metadata consistency
    this.checkMetadataConsistency(extraction, context, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for jurisdiction-specific field violations
   */
  private static checkJurisdictionFields(
    extraction: Record<string, unknown>,
    sourceKey: string | undefined,
    errors: InferenceViolation[]
  ): void {
    for (const [field, allowedSources] of Object.entries(JURISDICTION_SPECIFIC_FIELDS)) {
      const fieldValue = this.getNestedField(extraction, field);

      if (fieldValue !== undefined && fieldValue !== null) {
        if (!sourceKey || !allowedSources.includes(sourceKey)) {
          errors.push({
            code: 'JURISDICTION_FIELD_VIOLATION',
            field,
            message: `Field '${field}' is only valid for ${allowedSources.join('/')} but found in ${sourceKey || 'unknown'} document`,
            severity: 'error',
            suggestion: `Remove '${field}' from extraction or verify document source`,
            detectedValue: fieldValue,
          });
        }
      }
    }
  }

  /**
   * Check obligations for jurisdiction-specific violations
   */
  private static checkObligations(
    obligations: unknown[],
    context: ExtractionContext,
    errors: InferenceViolation[],
    warnings: InferenceViolation[]
  ): void {
    for (const obligation of obligations) {
      if (typeof obligation !== 'object' || obligation === null) continue;
      const obl = obligation as Record<string, unknown>;
      const conditionRef = obl.condition_reference || 'unknown';

      // CCS banding check
      if (obl.ccs_banding && !['EA', 'NRW'].includes(context.regulator || '')) {
        errors.push({
          code: 'CCS_BANDING_INVALID_JURISDICTION',
          field: `obligation.${conditionRef}.ccs_banding`,
          message: 'CCS banding is only applicable to EA/NRW environmental permits',
          severity: 'error',
          detectedValue: obl.ccs_banding,
        });
      }

      // Mogden formula check for trade effluent
      if (obl.mogden_values && context.waterCompany !== 'THAMES_WATER') {
        errors.push({
          code: 'MOGDEN_INVALID_WATER_COMPANY',
          field: `obligation.${conditionRef}.mogden_values`,
          message: 'Mogden formula values are only applicable to Thames Water consents',
          severity: 'error',
          detectedValue: obl.mogden_values,
        });
      }

      // Check condition types
      const conditionTypes = obl.condition_types || (obl.condition_type ? [obl.condition_type] : []);
      if (Array.isArray(conditionTypes)) {
        for (const condType of conditionTypes) {
          const allowedRegulators = JURISDICTION_SPECIFIC_CONDITION_TYPES[condType as string];
          if (allowedRegulators && context.regulator && !allowedRegulators.includes(context.regulator)) {
            warnings.push({
              code: 'CONDITION_TYPE_JURISDICTION_MISMATCH',
              field: `obligation.${conditionRef}.condition_types`,
              message: `Condition type '${condType}' is typically used by ${allowedRegulators.join('/')} but found in ${context.regulator} document`,
              severity: 'warning',
              detectedValue: condType,
            });
          }
        }
      }

      // Check for SEPA-specific fields in non-SEPA documents
      if (obl.cas_status && context.regulator !== 'SEPA') {
        errors.push({
          code: 'CAS_STATUS_INVALID_JURISDICTION',
          field: `obligation.${conditionRef}.cas_status`,
          message: 'CAS status is only applicable to SEPA permits',
          severity: 'error',
          detectedValue: obl.cas_status,
        });
      }
    }
  }

  /**
   * Check for Welsh language content in non-Welsh documents
   */
  private static checkWelshContent(
    extraction: Record<string, unknown>,
    context: ExtractionContext,
    warnings: InferenceViolation[]
  ): void {
    const isWelshJurisdiction =
      context.regulator === 'NRW' || context.waterCompany === 'DWR_CYMRU';

    if (!isWelshJurisdiction && this.containsWelshText(extraction)) {
      warnings.push({
        code: 'UNEXPECTED_WELSH_CONTENT',
        field: 'various',
        message: 'Welsh language content detected in non-Welsh jurisdiction document',
        severity: 'warning',
        suggestion: 'Verify document source or check if content is actually Welsh',
      });
    }
  }

  /**
   * Check for inferred critical fields without source references
   */
  private static checkInferredCriticalFields(
    extraction: Record<string, unknown>,
    warnings: InferenceViolation[]
  ): void {
    for (const field of NEVER_INFER_FIELDS) {
      const fieldValue = this.getNestedField(extraction, field);

      if (fieldValue !== undefined && fieldValue !== null) {
        // Check if there's a page reference or section reference
        const hasSourceRef = this.hasSourceReference(extraction, field);

        if (!hasSourceRef) {
          warnings.push({
            code: 'INFERRED_CRITICAL_FIELD',
            field,
            message: `Critical field '${field}' appears to be inferred without explicit document reference`,
            severity: 'warning',
            suggestion: 'Ensure value is explicitly stated in document, not inferred',
            detectedValue: typeof fieldValue === 'object' ? '[object]' : fieldValue,
          });
        }
      }
    }
  }

  /**
   * Validate grounding references on obligations (anti-hallucination check)
   * Ensures each obligation has proper source references for verification
   */
  static validateGroundingReferences(
    obligations: unknown[],
    context: ExtractionContext
  ): ValidationResult {
    const errors: InferenceViolation[] = [];
    const warnings: InferenceViolation[] = [];

    let missingPageRefCount = 0;
    let missingOriginalTextCount = 0;
    let missingSectionRefCount = 0;

    for (const obligation of obligations) {
      if (typeof obligation !== 'object' || obligation === null) continue;
      const obl = obligation as Record<string, unknown>;
      const conditionRef = obl.condition_reference || 'unknown';

      // Check for page_reference (critical for verification)
      if (!obl.page_reference) {
        missingPageRefCount++;
      }

      // Check for original_text (verbatim text from permit)
      if (!obl.original_text) {
        missingOriginalTextCount++;
      }

      // Check for section_reference (where in document)
      if (!obl.section_reference && !obl.schedule_reference) {
        missingSectionRefCount++;
      }

      // For ELV conditions, elv_verbatim_text is critical (Safeguard 3)
      if (obl.condition_type === 'ELV' || (obl.condition_types as string[])?.includes('ELV')) {
        if (!obl.elv_verbatim_text && !obl.elv_limit) {
          warnings.push({
            code: 'ELV_MISSING_VERBATIM',
            field: `obligation.${conditionRef}.elv_verbatim_text`,
            message: 'ELV condition missing verbatim limit text from permit',
            severity: 'warning',
            suggestion: 'Extract exact ELV wording from permit document',
          });
        }
      }
    }

    // Report aggregated grounding issues
    const totalObligations = obligations.length;

    if (missingPageRefCount > totalObligations * 0.5) {
      warnings.push({
        code: 'GROUNDING_PAGE_REF_LOW',
        field: 'obligations.page_reference',
        message: `${missingPageRefCount}/${totalObligations} obligations missing page reference - reduces verifiability`,
        severity: 'warning',
        suggestion: 'Extraction should include page_reference for each obligation',
      });
    }

    if (missingOriginalTextCount > totalObligations * 0.3) {
      warnings.push({
        code: 'GROUNDING_ORIGINAL_TEXT_LOW',
        field: 'obligations.original_text',
        message: `${missingOriginalTextCount}/${totalObligations} obligations missing original verbatim text`,
        severity: 'warning',
        suggestion: 'Include original_text field with exact permit wording',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check metadata consistency with document context
   */
  private static checkMetadataConsistency(
    extraction: Record<string, unknown>,
    context: ExtractionContext,
    errors: InferenceViolation[]
  ): void {
    // Check if extracted regulator matches context
    const extractedRegulator = extraction.regulator || (extraction.metadata as Record<string, unknown>)?.regulator;
    if (extractedRegulator && context.regulator && extractedRegulator !== context.regulator) {
      errors.push({
        code: 'REGULATOR_MISMATCH',
        field: 'regulator',
        message: `Extracted regulator '${extractedRegulator}' does not match document context '${context.regulator}'`,
        severity: 'error',
        suggestion: 'Verify document source and regulator identification',
        detectedValue: extractedRegulator,
      });
    }

    // Check if extracted jurisdiction matches context
    const extractedJurisdiction = extraction.jurisdiction || (extraction.metadata as Record<string, unknown>)?.jurisdiction;
    if (extractedJurisdiction && context.jurisdiction && extractedJurisdiction !== context.jurisdiction) {
      errors.push({
        code: 'JURISDICTION_MISMATCH',
        field: 'jurisdiction',
        message: `Extracted jurisdiction '${extractedJurisdiction}' does not match document context '${context.jurisdiction}'`,
        severity: 'error',
        detectedValue: extractedJurisdiction,
      });
    }

    // For trade effluent, check water company consistency
    if (context.documentType === 'TRADE_EFFLUENT_CONSENT') {
      const extractedWaterCompany =
        extraction.water_company || (extraction.metadata as Record<string, unknown>)?.water_company;
      if (extractedWaterCompany && context.waterCompany && extractedWaterCompany !== context.waterCompany) {
        errors.push({
          code: 'WATER_COMPANY_MISMATCH',
          field: 'water_company',
          message: `Extracted water company '${extractedWaterCompany}' does not match document context '${context.waterCompany}'`,
          severity: 'error',
          detectedValue: extractedWaterCompany,
        });
      }
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Get a nested field value using dot notation
   */
  private static getNestedField(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Check if extraction contains Welsh text patterns
   */
  private static containsWelshText(extraction: Record<string, unknown>): boolean {
    const text = JSON.stringify(extraction).toLowerCase();

    // Common Welsh words and patterns
    const welshPatterns = [
      /\bcymraeg\b/,      // "Welsh" in Welsh
      /\bdŵr\b/,          // "water"
      /\bgweithredwr\b/,  // "operator"
      /\bamodau\b/,       // "conditions"
      /\btrwydded\b/,     // "licence"
      /\bamgylchedd\b/,   // "environment"
      /\bgwastraff\b/,    // "waste"
      /\bcaniatâd\b/,     // "consent"
    ];

    return welshPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Check if a field has an associated source reference
   */
  private static hasSourceReference(extraction: Record<string, unknown>, field: string): boolean {
    // Check for common source reference patterns
    const possibleRefs = [
      `${field}_page_reference`,
      `${field}_section_reference`,
      `${field}_source`,
      'page_reference',
      'section_reference',
    ];

    for (const ref of possibleRefs) {
      if (this.getNestedField(extraction, ref)) {
        return true;
      }
    }

    // Check if obligations have page references
    if (Array.isArray(extraction.obligations)) {
      return extraction.obligations.some((obl) => {
        if (typeof obl === 'object' && obl !== null) {
          const o = obl as Record<string, unknown>;
          return o.page_reference || o.section_reference;
        }
        return false;
      });
    }

    return false;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a validation result with no violations
 */
export function createValidResult(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const merged: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  for (const result of results) {
    if (!result.valid) {
      merged.valid = false;
    }
    merged.errors.push(...result.errors);
    merged.warnings.push(...result.warnings);
  }

  return merged;
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('✅ Inference barrier validation passed');
  } else {
    lines.push('❌ Inference barrier validation failed');
  }

  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    for (const error of result.errors) {
      lines.push(`  - [${error.code}] ${error.field}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.code}] ${warning.field}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
