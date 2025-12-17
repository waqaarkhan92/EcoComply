/**
 * Types for Multi-Pass Extraction Strategy
 * Reference: EXTRACTION_IMPROVEMENT_RECOMMENDATIONS.md
 */

export interface Obligation {
  condition_reference: string | null;
  title: string;
  description: string;
  original_text?: string | null; // Grounding: verbatim quote from document
  section_reference?: string | null; // Grounding: section/table where this was found
  category: 'MONITORING' | 'REPORTING' | 'RECORD_KEEPING' | 'OPERATIONAL' | 'MAINTENANCE' | 'NOTIFICATION';
  frequency: string | null;
  deadline_date: string | null;
  deadline_relative: string | null;
  is_improvement: boolean;
  is_subjective: boolean;
  condition_type: 'STANDARD' | 'IMPROVEMENT' | 'PRE_OPERATIONAL' | 'ELV' | 'NOTIFICATION' | 'MONITORING_REQUIREMENT';
  confidence_score: number;
  evidence_suggestions?: string[];
  page_reference?: number | null;
  elv_limit?: string | null;
  metadata?: Record<string, any>;
  _source?: string;
  _extracted_at?: string;
}

export interface PassResult {
  obligations: Obligation[];
  confidence: number;
  duration: number;
}

export interface VerificationResult {
  additionalObligations: Obligation[];
  estimatedCoverage: number;
  gaps: string[];
  recommendations: string[];
}

export interface MultiPassExtractionResult {
  obligations: Obligation[];
  passResults: {
    conditions: PassResult;
    tables: PassResult;
    improvements: PassResult;
    elvs: PassResult;
    verification: VerificationResult;
  };
  totalExtracted: number;
  coverageScore: number;
  extractionTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
    estimatedCost: number;
  };
}

export interface LoadedPrompt {
  promptId: string;
  version: string;
  systemMessage: string;
  userMessageTemplate: string;
  isJurisdictionSpecific: boolean;
  loadedFrom: 'docs' | 'memory' | 'cache';
}

export interface ExtractionOptions {
  documentId?: string; // For real-time progress tracking
  documentType?: string;
  regulator?: string;
  permitReference?: string;
  pageCount?: number;
  fileSizeBytes?: number;
  waterCompany?: string;
  // Loaded jurisdiction-specific prompt (if available)
  loadedPrompt?: LoadedPrompt;
}

export interface ELVData {
  parameter: string;
  parameter_name: string;
  limit_value: number;
  unit: string;
  averaging_period: string;
  reference_conditions: string | null;
  emission_point: string | null;
  compliance_date: string | null;
  condition_reference: string | null;
  page_reference: number | null;
  confidence_score: number;
}
