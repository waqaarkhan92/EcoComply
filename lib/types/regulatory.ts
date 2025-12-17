/**
 * EA Regulatory Data Model Types
 * Based on Phase 4/5 Canonical Data Model v2.0
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PackType = 'REGULATOR_PACK' | 'INTERNAL_AUDIT_PACK' | 'BOARD_PACK' | 'TENDER_PACK';

export type PackStatus = 'DRAFT' | 'GENERATING' | 'READY' | 'FAILED' | 'EXPIRED';

export type RiskCategory = '1' | '2' | '3' | '4';

export type ComplianceBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type AdoptionMode = 'FIRST_YEAR' | 'STANDARD';

export type AssessedBy = 'EA_OFFICER' | 'SELF_ASSESSMENT' | 'THIRD_PARTY_AUDITOR';

export type CarType = 'INSPECTION' | 'AUDIT' | 'DESK_ASSESSMENT' | 'MONITORING_CHECK' | 'OMA';

export type CapaStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'VERIFIED';

export type IncidentType =
  | 'POLLUTION'
  | 'FIRE'
  | 'EQUIPMENT_FAILURE'
  | 'SPILL'
  | 'ODOUR_COMPLAINT'
  | 'NOISE_COMPLAINT'
  | 'FLOODING'
  | 'VANDALISM'
  | 'OTHER';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export type BoardPackDetailLevel = 'AGGREGATED' | 'SUMMARY' | 'DETAILED';

export type IncidentDisclosureLevel = 'AGGREGATE' | 'SEVERITY_BREAKDOWN' | 'FULL';

export type RuleResult = 'PASS' | 'FAIL' | 'WARNING' | 'INFO';

// ============================================================================
// CCS (COMPLIANCE CLASSIFICATION SCHEME)
// ============================================================================

export interface RiskCategoryDefinition {
  category: RiskCategory;
  points: number;
  ea_definition: string;
  ea_source: string;
}

export interface ComplianceBandDefinition {
  band: ComplianceBand;
  points_min: number;
  points_max: number | null;
  subsistence_multiplier: number;
  ea_interpretation: string;
}

export interface CcsAssessment {
  id: string;
  site_id: string;
  company_id: string;
  document_id?: string;
  compliance_year: number;
  assessment_date: string;
  total_score: number;
  compliance_band: ComplianceBand | null;
  assessed_by: AssessedBy | null;
  car_reference?: string;
  car_issued_date?: string;
  appeal_deadline?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CcsNonCompliance {
  id: string;
  ccs_assessment_id: string;
  obligation_id?: string;
  elv_condition_id?: string;
  condition_reference: string;
  risk_category: RiskCategory;
  ccs_score: number;
  breach_description?: string;
  breach_start_date?: string;
  breach_duration_days?: number;
  is_amenity_breach: boolean;
  evidence_ids: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ELV CONDITIONS (SAFEGUARD 3)
// ============================================================================

export interface ElvCondition {
  id: string;
  obligation_id: string;
  document_id: string;
  site_id: string;
  company_id: string;
  condition_reference: string;
  is_amenity_condition: boolean;
  elv_parameter: string;
  elv_value: number;
  elv_unit: string;
  elv_reference_conditions?: string;
  elv_averaging_period?: string;
  elv_verbatim_text: string;
  monitoring_frequency?: string;
  mcerts_required: boolean;
  next_monitoring_due?: string;
  compliance_deadline?: string;
  plant_thermal_input_mw?: number;
  plant_classification?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ElvMonitoringResult {
  id: string;
  elv_condition_id: string;
  site_id: string;
  company_id: string;
  test_date: string;
  measured_value: number;
  measured_unit: string;
  reference_conditions?: string;
  permit_limit: number;
  is_compliant: boolean;
  exceedance_value?: number;
  exceedance_percentage?: number;
  laboratory_name?: string;
  mcerts_certified: boolean;
  certificate_reference?: string;
  evidence_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ElvComplianceCheckResult {
  status: 'COMPLIANT' | 'NON_COMPLIANT';
  measured: number;
  limit: number;
  limitSource: string;
  verbatim: string;
  exceedance?: number;
  headroom?: number;
  headroomPercentage?: number;
}

// ============================================================================
// COMPLIANCE ASSESSMENT REPORTS (CAR)
// ============================================================================

export interface ComplianceAssessmentReport {
  id: string;
  site_id: string;
  company_id: string;
  document_id?: string;
  ccs_assessment_id?: string;
  car_reference: string;
  assessment_type: CarType;
  assessment_date: string;
  inspector_name?: string;
  findings?: string;
  total_score: number;
  issued_date?: string;
  public_register_date?: string;
  appeal_deadline?: string;
  appeal_submitted: boolean;
  appeal_outcome?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CORRECTIVE & PREVENTIVE ACTIONS (CAPA)
// ============================================================================

export interface RegulatoryCapa {
  id: string;
  car_id: string;
  obligation_id: string;
  ccs_non_compliance_id?: string;
  site_id: string;
  company_id: string;
  root_cause?: string;
  corrective_action?: string;
  preventive_action?: string;
  responsible_person?: string;
  responsible_user_id?: string;
  target_date?: string;
  completion_date?: string;
  verification_method?: string;
  verification_date?: string;
  verified_by?: string;
  status: CapaStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INCIDENTS
// ============================================================================

export interface RegulatoryIncident {
  id: string;
  site_id: string;
  company_id: string;
  document_id?: string;
  incident_date: string;
  incident_type: IncidentType;
  description: string;
  immediate_actions?: string;
  regulatory_notification: boolean;
  notification_date?: string;
  notification_reference?: string;
  linked_car_id?: string;
  linked_capa_id?: string;
  risk_category?: RiskCategory;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PACK GENERATION
// ============================================================================

export interface PackConfiguration {
  // Board Pack (Safeguard 2)
  detailLevel?: BoardPackDetailLevel;
  detailSectionsEnabled?: string[];
  detailAccessApprovedBy?: string;
  detailAccessApprovedDate?: string;

  // Tender Pack (Safeguard 4)
  includeIncidentStatistics?: boolean;
  incidentOptIn?: {
    enabled: boolean;
    approvedBy?: string;
    approvedDate?: string;
    justification?: string;
    disclosureLevel?: IncidentDisclosureLevel;
  };
}

export interface RegulatoryPack {
  id: string;
  company_id: string;
  pack_type: PackType;
  site_ids: string[];
  document_ids: string[];
  generation_date: string;
  status: PackStatus;
  configuration: PackConfiguration;
  blocking_failures: RuleEvaluation[];
  warnings: RuleEvaluation[];
  passed_rules: RuleEvaluation[];
  file_reference?: string;
  file_hash?: string;
  expiry_date?: string;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface BoardPackDetailRequest {
  id: string;
  pack_id: string;
  section_requested: string;
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  justification?: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
}

export interface TenderPackIncidentOptIn {
  id: string;
  pack_id: string;
  opt_in_decision: 'INCLUDED' | 'EXCLUDED';
  disclosure_level?: IncidentDisclosureLevel;
  approved_by?: string;
  approved_at?: string;
  justification?: string;
  incident_data_snapshot?: any;
  created_at: string;
}

// ============================================================================
// READINESS RULES
// ============================================================================

export interface ReadinessRule {
  id: string;
  rule_id: string;
  pack_types: PackType[];
  description: string;
  is_blocking: boolean;
  standard_lookback_months?: number;
  ea_source?: string;
  query_template?: string;
  is_active: boolean;
}

export interface RuleEvaluation {
  ruleId: string;
  description: string;
  result: RuleResult;
  blocking: boolean;
  details?: string;
  recommendation?: string;
}

export interface PackGenerationRequest {
  companyId: string;
  packType: PackType;
  siteIds: string[];
  documentIds?: string[];
  generationDate?: Date;
  configuration?: PackConfiguration;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface PackGenerationResult {
  packId: string;
  canGenerate: boolean;
  blockingFailures: RuleEvaluation[];
  warnings: RuleEvaluation[];
  passedRules: RuleEvaluation[];
  packMetadata: PackMetadata;
}

export interface PackMetadata {
  sectionsIncluded: string[];
  dataCoverage: {
    sitesIncluded: number;
    obligationsAssessed: number;
    obligationsTotal: number;
    evidenceItems: number;
    ccsAssessmentsCurrent: boolean;
  };
}

// ============================================================================
// FIRST-YEAR ADOPTION MODE (SAFEGUARD 1)
// ============================================================================

export interface CompanyAdoptionConfig {
  adoptionMode: AdoptionMode;
  adoptionModeExpiry: string | null;
  onboardingDate: string;
  relaxedRules: RelaxedRule[];
}

export interface RelaxedRule {
  id: string;
  company_id: string;
  rule_id: string;
  standard_lookback_months?: number;
  relaxed_lookback_start?: string;
  is_active: boolean;
}

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export interface CcsDashboardData {
  currentBand: ComplianceBand | null;
  currentScore: number;
  previousYearBand: ComplianceBand | null;
  previousYearScore: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'NEW';
  nonCompliancesByCategory: {
    category1: number;
    category2: number;
    category3: number;
    category4: number;
  };
  subsistenceMultiplier: number;
  openCapas: number;
  overdueCapas: number;
}

export interface ComplianceBandDistribution {
  band: ComplianceBand;
  count: number;
  percentage: number;
  sites: { id: string; name: string }[];
}

export interface RegulatoryDashboardStats {
  totalSites: number;
  sitesWithCcsAssessment: number;
  complianceBandDistribution: ComplianceBandDistribution[];
  activeIncidents: number;
  openCapas: number;
  overdueCapas: number;
  upcomingMonitoring: number;
  packsPendingGeneration: number;
  firstYearModeActive: boolean;
  firstYearModeExpiry?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
