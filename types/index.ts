/**
 * TypeScript Type Definitions for EcoComply
 *
 * Generated from Database Schema (docs/specs/20_Database_Schema.md)
 *
 * This file provides type-safe interfaces for all database entities,
 * API responses, and common application types.
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format
export type JsonB = Record<string, any>; // For JSONB fields

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMetadata {
  request_id?: string;
  timestamp?: string;
  pagination?: PaginationMetadata;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// =============================================================================
// ENUM TYPES
// =============================================================================

export type UserRoleType = 'OWNER' | 'ADMIN' | 'STAFF' | 'CONSULTANT' | 'VIEWER';

export type ObligationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLIANT'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMPLETED';

export type DocumentType =
  | 'PERMIT'
  | 'CONSENT'
  | 'MCPD_REGISTRATION'
  | 'WASTE_LICENSE'
  | 'OTHER';

export type DocumentStatus =
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'PROCESSING'
  | 'EXTRACTION_COMPLETE'
  | 'EXTRACTION_FAILED'
  | 'ARCHIVED';

export type ExtractionStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'REQUIRES_REVIEW';

export type EvidenceType =
  | 'LAB_RESULT'
  | 'CALIBRATION_CERTIFICATE'
  | 'MAINTENANCE_LOG'
  | 'PHOTO'
  | 'REPORT'
  | 'INVOICE'
  | 'OTHER';

export type EvidenceEnforcementStatus =
  | 'UNLINKED'
  | 'LINKED'
  | 'ARCHIVED';

export type DeadlineStatus =
  | 'PENDING'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED';

export type BackgroundJobStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRY';

export type ModuleCode =
  | 'MODULE_1' // Environmental Permits
  | 'MODULE_2' // Trade Effluent
  | 'MODULE_3' // MCPD/Generators
  | 'MODULE_4'; // Hazardous Waste

export type ActivationStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TRIAL'
  | 'EXPIRED';

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

export interface Company {
  id: UUID;
  name: string;
  registration_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  industry_sector?: string;
  subscription_tier?: string;
  subscription_status?: string;
  trial_ends_at?: Timestamp;
  compliance_score?: number;
  compliance_score_updated_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface Site {
  id: UUID;
  company_id: UUID;
  name: string;
  address?: string;
  postcode?: string;
  site_reference?: string;
  lat?: number;
  lng?: number;
  compliance_score?: number;
  compliance_score_updated_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface User {
  id: UUID;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: UUID;
  auth_id?: string;
  last_login_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface UserRole {
  id: UUID;
  user_id: UUID;
  role: UserRoleType;
  granted_by?: UUID;
  granted_at: Timestamp;
  created_at: Timestamp;
}

export interface UserSiteAssignment {
  id: UUID;
  user_id: UUID;
  site_id: UUID;
  assigned_by?: UUID;
  assigned_at: Timestamp;
  created_at: Timestamp;
}

// =============================================================================
// MODULE 1 TYPES (Environmental Permits)
// =============================================================================

export interface Document {
  id: UUID;
  company_id: UUID;
  site_id: UUID;
  document_type: DocumentType;
  status: DocumentStatus;
  extraction_status: ExtractionStatus;
  extraction_error?: string;
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  uploaded_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface DocumentSiteAssignment {
  id: UUID;
  document_id: UUID;
  site_id: UUID;
  is_primary: boolean;
  obligations_shared: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Obligation {
  id: UUID;
  document_id: UUID;
  site_id: UUID;
  company_id: UUID;
  obligation_title?: string;
  obligation_description?: string;
  original_text?: string;
  category?: string;
  status: ObligationStatus;
  confidence_score?: number;
  is_subjective?: boolean;
  requires_evidence?: boolean;
  frequency?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface Schedule {
  id: UUID;
  obligation_id: UUID;
  site_id: UUID;
  recurrence_pattern: string;
  next_due_date?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Deadline {
  id: UUID;
  obligation_id: UUID;
  site_id: UUID;
  due_date: Timestamp;
  status: DeadlineStatus;
  completed_at?: Timestamp;
  completed_by?: UUID;
  sla_target_date?: Timestamp;
  sla_breached_at?: Timestamp;
  sla_breach_duration_hours?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface EvidenceItem {
  id: UUID;
  site_id: UUID;
  company_id: UUID;
  evidence_type: EvidenceType;
  title?: string;
  description?: string;
  file_path?: string;
  file_name?: string;
  file_size_bytes?: number;
  enforcement_status: EvidenceEnforcementStatus;
  expiry_date?: Timestamp;
  uploaded_by?: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface ObligationEvidenceLink {
  id: UUID;
  obligation_id: UUID;
  evidence_id: UUID;
  linked_by?: UUID;
  linked_at: Timestamp;
  unlinked_at?: Timestamp;
  created_at: Timestamp;
}

export interface RegulatorQuestion {
  id: UUID;
  site_id: UUID;
  company_id: UUID;
  question_text: string;
  response_text?: string;
  received_at?: Timestamp;
  responded_at?: Timestamp;
  responder_id?: UUID;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuditPack {
  id: UUID;
  site_id: UUID;
  company_id: UUID;
  pack_name: string;
  generated_by?: UUID;
  generated_at: Timestamp;
  compliance_score?: number;
  compliance_score_breakdown?: JsonB;
  obligation_summary?: JsonB;
  evidence_summary?: JsonB;
  file_path?: string;
  secure_access_token?: string;
  secure_access_expires_at?: Timestamp;
  created_at: Timestamp;
}

// =============================================================================
// MODULE 2 TYPES (Trade Effluent)
// =============================================================================

export interface Parameter {
  id: UUID;
  site_id: UUID;
  parameter_name: string;
  unit: string;
  limit_value?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface LabResult {
  id: UUID;
  site_id: UUID;
  parameter_id: UUID;
  sample_date: Timestamp;
  result_value: number;
  result_unit?: string;
  lab_reference?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Exceedance {
  id: UUID;
  site_id: UUID;
  lab_result_id: UUID;
  parameter_id: UUID;
  exceedance_percentage: number;
  flagged_at: Timestamp;
  resolved_at?: Timestamp;
  resolution_notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DischargeVolume {
  id: UUID;
  site_id: UUID;
  measurement_date: Timestamp;
  volume_m3: number;
  meter_reading?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =============================================================================
// MODULE 3 TYPES (MCPD/Generators)
// =============================================================================

export interface Generator {
  id: UUID;
  site_id: UUID;
  generator_name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  rated_thermal_input_mw?: number;
  fuel_type?: string;
  installation_date?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: Timestamp;
}

export interface RunHourRecord {
  id: UUID;
  generator_id: UUID;
  site_id: UUID;
  record_date: Timestamp;
  hours_run: number;
  notes?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface StackTest {
  id: UUID;
  generator_id: UUID;
  site_id: UUID;
  test_date: Timestamp;
  test_results?: JsonB;
  test_provider?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MaintenanceRecord {
  id: UUID;
  generator_id: UUID;
  site_id: UUID;
  maintenance_date: Timestamp;
  maintenance_type?: string;
  description?: string;
  performed_by?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AERDocument {
  id: UUID;
  site_id: UUID;
  generator_id?: UUID;
  reporting_year: number;
  file_path?: string;
  submitted_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// =============================================================================
// SYSTEM & CROSS-MODULE TYPES
// =============================================================================

export interface Module {
  id: UUID;
  module_code: ModuleCode;
  module_name: string;
  description?: string;
  pricing_per_site?: number;
  is_active: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ModuleActivation {
  id: UUID;
  company_id: UUID;
  site_id: UUID;
  module_id: UUID;
  status: ActivationStatus;
  activated_at?: Timestamp;
  deactivated_at?: Timestamp;
  compliance_score?: number;
  compliance_score_updated_at?: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface BackgroundJob {
  id: UUID;
  job_type: string;
  payload: JsonB;
  status: BackgroundJobStatus;
  attempts: number;
  max_attempts: number;
  scheduled_at?: Timestamp;
  started_at?: Timestamp;
  completed_at?: Timestamp;
  failed_at?: Timestamp;
  error_message?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Notification {
  id: UUID;
  user_id: UUID;
  company_id: UUID;
  title: string;
  message: string;
  notification_type: string;
  related_entity_type?: string;
  related_entity_id?: UUID;
  read_at?: Timestamp;
  created_at: Timestamp;
}

export interface AuditLog {
  id: UUID;
  user_id?: UUID;
  company_id?: UUID;
  action_type: string;
  entity_type: string;
  entity_id?: UUID;
  changes?: JsonB;
  ip_address?: string;
  user_agent?: string;
  created_at: Timestamp;
}

export interface ExtractionLog {
  id: UUID;
  document_id: UUID;
  extraction_type: string;
  status: string;
  extracted_data?: JsonB;
  error_message?: string;
  processing_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  model_version?: string;
  created_at: Timestamp;
}

// =============================================================================
// REACT QUERY TYPES
// =============================================================================

export interface MutationCallbacks<TData = any, TVariables = any> {
  onSuccess?: (response: TData) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface QueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface DocumentUploadFormData {
  file: File;
  site_id: UUID;
  document_type: DocumentType;
  additional_site_ids?: UUID[];
  obligations_shared?: boolean;
}

export interface ObligationFormData {
  obligation_title: string;
  obligation_description?: string;
  category?: string;
  frequency?: string;
  requires_evidence?: boolean;
}

export interface EvidenceUploadFormData {
  file: File;
  evidence_type: EvidenceType;
  title?: string;
  description?: string;
  site_id: UUID;
  expiry_date?: string;
}

// =============================================================================
// DASHBOARD & UI TYPES
// =============================================================================

export interface DashboardStats {
  totals: {
    sites: number;
    obligations: number;
    overdue: number;
    upcoming_deadlines: number;
    documents: number;
  };
  compliance: {
    score: number;
    status: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  };
}

export interface ComplianceScore {
  score: number;
  updated_at: Timestamp;
  breakdown?: {
    compliant: number;
    due_soon: number;
    overdue: number;
    total: number;
  };
}

// =============================================================================
// EVIDENCE LINKING VALIDATION TYPES
// =============================================================================

export interface EvidenceLinkingValidationError {
  evidence_site_id: UUID;
  evidence_site_name: string;
  obligation_site_id: UUID;
  obligation_site_name: string;
  obligations_shared: boolean;
  is_multi_site: boolean;
  validation_rule: 'site_match_required' | 'evidence_must_be_from_assigned_site';
  assigned_site_ids?: UUID[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make all properties of T required and non-nullable
 */
export type Required<T> = {
  [P in keyof T]-?: NonNullable<T[P]>;
};

/**
 * Make all properties of T optional
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Pick only the properties that are not functions
 */
export type DataOnly<T> = {
  [P in keyof T as T[P] extends Function ? never : P]: T[P];
};
