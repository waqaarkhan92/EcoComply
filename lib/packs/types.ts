/**
 * Pack Generation Types
 * Shared types for the modular pack generation system
 */

import type PDFKit from 'pdfkit';

// Pack Types
export type PackType =
  | 'AUDIT_PACK'
  | 'REGULATOR_INSPECTION'
  | 'TENDER_CLIENT_ASSURANCE'
  | 'BOARD_MULTI_SITE_RISK'
  | 'INSURER_BROKER';

// Job Data Interface
export interface PackGenerationJobData {
  pack_id: string;
  pack_type: PackType;
  company_id: string;
  site_id?: string;
  document_id?: string;
  date_range_start?: string;
  date_range_end?: string;
  filters?: {
    status?: string[];
    category?: string[];
  };
  watermark?: WatermarkOptions;
}

// Watermark Configuration
export interface WatermarkOptions {
  enabled: boolean;
  text?: string;
  recipientName?: string;
  expirationDate?: string;
  opacity?: number;
  angle?: number;
  fontSize?: number;
  color?: string;
}

// Pack Data (collected from database)
export interface PackData {
  company: {
    id: string;
    name: string;
    company_number?: string;
    adoption_mode?: string;
  } | null;
  site?: {
    id: string;
    name: string;
    site_type?: string;
    address?: string;
  } | null;
  sites?: Array<{
    id: string;
    name: string;
    site_type?: string;
    compliance_score?: number;
  }>;
  obligations: Obligation[];
  evidence: Evidence[];
  ccsAssessment?: CCSAssessment | null;
  incidents: Incident[];
  permits: Permit[];
  dateRange: {
    start: string;
    end: string;
  };
  scorecard?: ComplianceScorecard;
  scorecardData?: any; // From calculateSiteComplianceScore
  previousScorecard?: { score: number; updated_at: string };
  financialImpact?: FinancialImpactData | null;
  elvSummary?: ELVSummaryData | null;
  changeHistory?: ChangeHistoryItem[];
}

// Obligation Data
export interface Obligation {
  id: string;
  original_text?: string;
  obligation_title?: string;
  obligation_description?: string;
  deadline_date?: string;
  status: string;
  category?: string;
  confidence_score?: number;
  evidence_count?: number;
  sites?: {
    id: string;
    name: string;
  };
}

// Evidence Data
export interface Evidence {
  id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_path?: string;
  uploaded_at?: string;
  obligation_id?: string;
  validation_status?: string;
}

// CCS Assessment
export interface CCSAssessment {
  id: string;
  compliance_band: string;
  assessment_year: number;
  total_points?: number;
  non_compliance_count?: number;
}

// Incident Data
export interface Incident {
  id: string;
  incident_type: string;
  description?: string;
  severity?: string;
  status?: string;
  occurred_at?: string;
  resolved_at?: string;
  site_id?: string;
}

// Permit Data
export interface Permit {
  id: string;
  permit_number: string;
  permit_type?: string;
  regulator?: string;
  status?: string;
  expiry_date?: string;
}

// Compliance Scorecard
export interface ComplianceScorecard {
  score: number;
  ragStatus: 'RED' | 'AMBER' | 'GREEN';
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  topActions: Array<{
    id: string;
    title: string;
    deadline?: string;
    urgency: string;
  }>;
  evidenceCoverage: number;
  obligationStats: {
    total: number;
    completed: number;
    overdue: number;
  };
}

// Financial Impact Data
export interface FinancialImpactData {
  totalFineExposure: number;
  fineBreakdown: Array<{
    obligationId: string;
    maxFine: number;
    regulation: string;
    likelihood: string;
  }>;
  remediationCost: number;
  insuranceRisk: string;
}

// ELV Summary Data
export interface ELVSummaryData {
  siteId: string;
  totalParameters: number;
  parametersWithinLimits: number;
  parametersExceeded: number;
  worstParameter?: {
    parameterName: string;
    status: string;
    headroomPercent: number;
  };
  recentExceedances: Array<{
    parameterName: string;
    occurredAt: string;
    exceedancePercentage: number;
  }>;
}

// Change History Item
export interface ChangeHistoryItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by?: string;
  changed_at: string;
  changes?: Record<string, any>;
}

// Section tracking for TOC
export interface Section {
  title: string;
  page: number;
}

// Render Context (passed to all renderers)
export interface RenderContext {
  doc: PDFKit.PDFDocument;
  packType: PackType;
  packData: PackData;
  pack: PackRecord;
  sections: Section[];
  currentPage: number;
}

// Pack Record (from database)
export interface PackRecord {
  id: string;
  company_id: string;
  site_id?: string;
  pack_type: PackType;
  title: string;
  status: string;
  storage_path?: string;
  generated_at?: string;
  generated_by?: string;
}

// Renderer Function Type
export type PackRenderer = (ctx: RenderContext) => Promise<number>;

// Section Renderer Type
export type SectionRenderer = (
  doc: PDFKit.PDFDocument,
  packData: PackData,
  pack: PackRecord,
  sections: Section[],
  currentPage: number
) => Promise<number>;
