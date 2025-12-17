/**
 * Specialized Ingestion Validators
 * Business logic validators for AI extraction and document processing
 */

import { z } from 'zod';
import {
  uuidSchema,
  conditionTypesSchema,
  confidenceComponentsSchema,
  mogdenFormulaSchema,
  jurisdictionSchema,
  regulatorSchema,
  reviewStatusSchema,
  obligationCategorySchema,
  obligationFrequencySchema,
} from './schemas';

// ============================================================================
// CONFIDENCE - Re-exported from centralized source of truth
// Source: lib/utils/status.ts (aligned with Ingestion Prompt UI Spec v1.0 Part 3)
// Thresholds: HIGH >= 0.90, MEDIUM >= 0.70, LOW >= 0.50, VERY_LOW < 0.50
// ============================================================================

import {
  CONFIDENCE_THRESHOLDS,
  type ConfidenceLevel,
  getConfidenceLevel,
} from '@/lib/utils/status';

// Re-export for consumers of this module
export { CONFIDENCE_THRESHOLDS, type ConfidenceLevel, getConfidenceLevel };

// ============================================================================
// EXTRACTED OBLIGATION SCHEMA
// ============================================================================

export const extractedObligationSchema = z.object({
  // Core identification
  condition_reference: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),

  // Classification
  category: obligationCategorySchema,
  condition_types: conditionTypesSchema,
  frequency: obligationFrequencySchema.optional(),

  // Timing
  deadline_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deadline_relative: z.string().max(100).optional(),

  // Source reference
  page_reference: z.string().max(50).optional(),
  section_reference: z.string().max(100).optional(),

  // AI confidence
  confidence_score: z.number().min(0).max(1),
  confidence_components: confidenceComponentsSchema.optional(),

  // Flags
  is_subjective: z.boolean().default(false),
  is_improvement: z.boolean().default(false),
  needs_interpretation: z.boolean().default(false),

  // Subjective content
  subjective_phrases: z.array(z.object({
    phrase: z.string(),
    context: z.string().optional(),
    suggested_interpretation: z.string().optional(),
  })).default([]),

  // Evidence suggestions
  evidence_suggestions: z.array(z.string()).default([]),

  // Raw extraction metadata
  extraction_notes: z.string().optional(),
});

export type ExtractedObligation = z.infer<typeof extractedObligationSchema>;

// ============================================================================
// EXTRACTION RESULT SCHEMA
// ============================================================================

export const extractionResultSchema = z.object({
  // Document metadata
  document_id: uuidSchema,
  site_id: uuidSchema,
  company_id: uuidSchema,

  // Permit information
  permit_reference: z.string().max(100).optional(),
  permit_holder: z.string().max(200).optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),

  // Jurisdiction
  jurisdiction: jurisdictionSchema.optional(),
  regulator: regulatorSchema.optional(),

  // Extracted obligations
  obligations: z.array(extractedObligationSchema),

  // Module-specific data
  mogden_formula: mogdenFormulaSchema.optional(),

  // Summary statistics
  total_obligations: z.number().int().min(0),
  high_confidence_count: z.number().int().min(0),
  medium_confidence_count: z.number().int().min(0),
  low_confidence_count: z.number().int().min(0),
  subjective_count: z.number().int().min(0),

  // Processing metadata
  prompt_id: z.string(),
  prompt_version: z.string(),
  model_identifier: z.string(),
  processing_time_ms: z.number().int().positive(),

  // Warnings and errors
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

// ============================================================================
// REVIEW QUEUE ITEM SCHEMA
// ============================================================================

export const reviewQueueItemSchema = z.object({
  id: uuidSchema,
  obligation_id: uuidSchema,
  document_id: uuidSchema,
  site_id: uuidSchema,
  company_id: uuidSchema,

  // Review status
  status: reviewStatusSchema,

  // Obligation summary
  title: z.string(),
  condition_reference: z.string().optional(),
  confidence_score: z.number().min(0).max(1),
  confidence_level: z.enum(['HIGH', 'MEDIUM', 'LOW', 'VERY_LOW']),

  // Flags
  is_subjective: z.boolean(),
  needs_interpretation: z.boolean(),
  has_pending_interpretations: z.boolean(),

  // Review metadata
  assigned_to: uuidSchema.optional(),
  reviewed_by: uuidSchema.optional(),
  reviewed_at: z.string().datetime().optional(),
  review_notes: z.string().optional(),

  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ReviewQueueItem = z.infer<typeof reviewQueueItemSchema>;

// ============================================================================
// BATCH REVIEW SCHEMA
// ============================================================================

export const batchReviewSchema = z.object({
  obligation_ids: z.array(uuidSchema).min(1, 'At least one obligation required'),
  action: z.enum(['APPROVE', 'REJECT', 'NEEDS_CLARIFICATION']),
  notes: z.string().optional(),
});

export type BatchReview = z.infer<typeof batchReviewSchema>;

// ============================================================================
// INTERPRETATION REQUEST SCHEMA
// ============================================================================

export const interpretationRequestSchema = z.object({
  obligation_id: uuidSchema,
  phrase: z.string().min(1).max(500),
  interpretation: z.string().min(1),
  operational_definition: z.string().optional(),
  checklist_items: z.array(z.string()).default([]),
});

export type InterpretationRequest = z.infer<typeof interpretationRequestSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that confidence components sum correctly
 */
export function validateConfidenceComponents(components: z.infer<typeof confidenceComponentsSchema>): boolean {
  const values = Object.values(components);
  return values.every(v => v >= 0 && v <= 1);
}

/**
 * Calculate overall confidence from components
 */
export function calculateOverallConfidence(components: z.infer<typeof confidenceComponentsSchema>): number {
  const weights = {
    textClarity: 0.3,
    structureMatch: 0.25,
    keywordPresence: 0.25,
    contextRelevance: 0.2,
  };

  return (
    components.textClarity * weights.textClarity +
    components.structureMatch * weights.structureMatch +
    components.keywordPresence * weights.keywordPresence +
    components.contextRelevance * weights.contextRelevance
  );
}

/**
 * Validates EWC code format and returns structured data
 */
export function parseEWCCode(code: string): { chapter: string; subChapter: string; entry: string; isHazardous: boolean } | null {
  const match = code.match(/^(\d{2})\s(\d{2})\s(\d{2})(\*)?$/);
  if (!match) return null;

  return {
    chapter: match[1],
    subChapter: match[2],
    entry: match[3],
    isHazardous: match[4] === '*',
  };
}

/**
 * Validates UK OS grid reference and extracts components
 */
export function parseUKGridReference(ref: string): { letters: string; easting: string; northing: string } | null {
  const normalized = ref.replace(/\s/g, '').toUpperCase();
  const match = normalized.match(/^([A-HJ-Z]{2})(\d+)$/);
  if (!match) return null;

  const digits = match[2];
  if (digits.length % 2 !== 0 || digits.length < 4 || digits.length > 10) return null;

  const half = digits.length / 2;
  return {
    letters: match[1],
    easting: digits.slice(0, half),
    northing: digits.slice(half),
  };
}

/**
 * Validates Mogden formula components
 */
export function validateMogdenFormula(formula: z.infer<typeof mogdenFormulaSchema>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (formula.ot <= 0) errors.push('Ot (reception/treatment cost) must be positive');
  if (formula.os <= 0) errors.push('Os (primary treatment cost) must be positive');
  if (formula.st <= 0) errors.push('St (biological oxidation cost) must be positive');
  if (formula.ss <= 0) errors.push('Ss (sludge treatment cost) must be positive');

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Determines if an obligation should be flagged for review based on extraction results
 */
export function shouldFlagForReview(obligation: ExtractedObligation): boolean {
  // Flag if low confidence
  if (obligation.confidence_score < CONFIDENCE_THRESHOLDS.MEDIUM) return true;

  // Flag if subjective and needs interpretation
  if (obligation.is_subjective && obligation.needs_interpretation) return true;

  // Flag if has subjective phrases without interpretations
  if (obligation.subjective_phrases.length > 0) {
    const hasUninterpretedPhrases = obligation.subjective_phrases.some(
      p => !p.suggested_interpretation
    );
    if (hasUninterpretedPhrases) return true;
  }

  return false;
}

/**
 * Groups obligations by confidence level for UI display
 */
export function groupObligationsByConfidence(obligations: ExtractedObligation[]): Record<ConfidenceLevel, ExtractedObligation[]> {
  return obligations.reduce(
    (acc, obligation) => {
      const level = getConfidenceLevel(obligation.confidence_score);
      acc[level].push(obligation);
      return acc;
    },
    {
      HIGH: [] as ExtractedObligation[],
      MEDIUM: [] as ExtractedObligation[],
      LOW: [] as ExtractedObligation[],
      VERY_LOW: [] as ExtractedObligation[],
    }
  );
}

// ============================================================================
// RE-EXPORT COMMONLY USED SCHEMAS
// ============================================================================

export {
  conditionTypesSchema,
  confidenceComponentsSchema,
  mogdenFormulaSchema,
  jurisdictionSchema,
  regulatorSchema,
  reviewStatusSchema,
};
