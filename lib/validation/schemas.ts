/**
 * Centralized Validation Schemas
 * Using Zod for runtime type validation
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email address');

export const urlSchema = z.string().url('Invalid URL format');

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Invalid date format (expected YYYY-MM-DD)'
);

// ============================================================================
// OBLIGATION SCHEMAS
// ============================================================================

export const obligationCategorySchema = z.enum([
  'OPERATIONAL',
  'MONITORING',
  'REPORTING',
  'RECORD_KEEPING',
  'MAINTENANCE',
  'TRAINING',
  'EMISSIONS',
  'WASTE',
  'ENVIRONMENTAL',
  'HEALTH_SAFETY',
]);

export const obligationFrequencySchema = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'ANNUAL',
  'ONE_TIME',
  'AS_REQUIRED',
]);

export const obligationConditionTypeSchema = z.enum([
  'STANDARD',
  'IMPROVEMENT',
  'PRE_OPERATIONAL',
  'OPERATIONAL',
  'PARAMETER_LIMIT',
  'RUN_HOUR_LIMIT',
]);

// Extended condition types for ingestion (multi-valued array)
// Aligned with: docs/09-regulatory/01-methodology-handbook.md Section 6.2 (21-value ENUM)
// and docs/09-regulatory/prompts/environmental-permits/ea-env-ingest-001_v1.3.md
export const conditionTypesSchema = z.array(
  z.enum([
    // Core condition types (all modules)
    'STANDARD',
    'IMPROVEMENT',
    'PRE_OPERATIONAL',
    'OPERATIONAL',
    'NOTIFICATION',
    'MONITORING',
    'REPORTING',
    'RECORD_KEEPING',
    // Environmental permit types (Module 1)
    'EMISSION_LIMIT',
    'BAT_COMPLIANCE',
    'BAT_REQUIREMENT',
    'CESSATION',
    'FINANCIAL_PROVISION',
    'SITE_PROTECTION',
    'MANAGEMENT_SYSTEM',
    'POLLUTION_PREVENTION',
    'RESOURCE_EFFICIENCY',
    'ACCIDENT_MANAGEMENT',
    'NOISE_VIBRATION',
    'ODOUR',
    'CLIMATE_ADAPTATION',
    // Trade effluent types (Module 2)
    'PARAMETER_LIMIT',
    'DISCHARGE_LIMIT',
    'QUARTERLY_RETURN',
    'ANNUAL_RETURN',
    // Generator types (Module 3)
    'RUN_HOUR_LIMIT',
    'STACK_TEST',
    'EQUIPMENT_MAINTENANCE',
    'CALIBRATION',
    // Waste management types (Module 4)
    'WASTE_ACCEPTANCE',
    'WASTE_HANDLING',
    'STORAGE_LIMIT',
    'TRANSFER_REQUIREMENT',
    'INCIDENT_NOTIFICATION',
  ])
).default([]);

export const createObligationSchema = z.object({
  document_id: uuidSchema,
  site_id: uuidSchema,
  condition_reference: z.string().max(50).optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  category: obligationCategorySchema,
  frequency: obligationFrequencySchema.optional(),
  deadline_date: dateSchema.optional(),
  deadline_relative: z.string().max(100).optional(),
  is_subjective: z.boolean().default(false),
  is_improvement: z.boolean().default(false),
  confidence_score: z.number().min(0).max(1).optional(),
  evidence_suggestions: z.array(z.string()).default([]),
  condition_type: obligationConditionTypeSchema.default('STANDARD'),
  page_reference: z.string().max(50).optional(),
});

export const updateObligationSchema = createObligationSchema.partial().omit({
  document_id: true,
  site_id: true,
});

// ============================================================================
// EVIDENCE SCHEMAS
// ============================================================================

export const evidenceTypeSchema = z.enum([
  'DOCUMENT',
  'PHOTO',
  'VIDEO',
  'CERTIFICATE',
  'LAB_RESULT',
  'METER_READING',
  'INSPECTION_REPORT',
  'MAINTENANCE_RECORD',
  'OTHER',
]);

export const createEvidenceSchema = z.object({
  site_id: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  evidence_type: evidenceTypeSchema,
  file_url: urlSchema.optional(),
  file_size_bytes: z.number().int().positive().optional(),
  file_mime_type: z.string().max(100).optional(),
  captured_at: z.string().datetime().optional(),
  expiry_date: dateSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export const updateEvidenceSchema = createEvidenceSchema.partial().omit({
  site_id: true,
});

// ============================================================================
// SITE SCHEMAS
// ============================================================================

export const createSiteSchema = z.object({
  company_id: uuidSchema,
  site_name: z.string().min(1).max(200),
  site_address: z.string().min(1),
  site_postcode: z.string().max(20).optional(),
  site_type: z.string().max(100).optional(),
  site_reference: z.string().max(100).optional(),
  primary_contact_name: z.string().max(200).optional(),
  primary_contact_email: emailSchema.optional(),
  primary_contact_phone: z.string().max(50).optional(),
  is_active: z.boolean().default(true),
});

export const updateSiteSchema = createSiteSchema.partial().omit({
  company_id: true,
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const documentTypeSchema = z.enum([
  'ENVIRONMENTAL_PERMIT',
  'TRADE_EFFLUENT_CONSENT',
  'MCPD_REGISTRATION',
  'OTHER',
]);

export const documentStatusSchema = z.enum([
  'UPLOADED',
  'PROCESSING',
  'EXTRACTED',
  'FAILED',
  'REVIEWED',
]);

export const createDocumentSchema = z.object({
  site_id: uuidSchema,
  document_type: documentTypeSchema,
  permit_reference: z.string().max(100).optional(),
  regulator: z.string().max(200).optional(),
  issue_date: dateSchema.optional(),
  expiry_date: dateSchema.optional(),
  file_url: urlSchema,
  file_size_bytes: z.number().int().positive(),
  file_mime_type: z.string().max(100),
  original_filename: z.string().max(500),
});

// ============================================================================
// PACK SCHEMAS
// ============================================================================

export const packTypeSchema = z.enum([
  'AUDIT_PACK',
  'REGULATOR_INSPECTION',
  'TENDER_CLIENT_ASSURANCE',
  'BOARD_MULTI_SITE_RISK',
  'INSURER_BROKER',
  'COMBINED',
]);

export const createPackSchema = z.object({
  site_id: uuidSchema,
  pack_type: packTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  from_date: dateSchema,
  to_date: dateSchema,
  obligation_ids: z.array(uuidSchema).min(1, 'At least one obligation required'),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const userRoleSchema = z.enum([
  'OWNER',
  'ADMIN',
  'STAFF',
  'CONSULTANT',
  'VIEWER',
]);

export const createUserSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(1).max(200),
  role: userRoleSchema,
  company_id: uuidSchema.optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  email: emailSchema.optional(),
  notification_preferences: z.record(z.string(), z.boolean()).optional(),
});

// ============================================================================
// MODULE SCHEMAS
// ============================================================================

// Module 2: Trade Effluent
export const parameterTypeSchema = z.enum([
  'BOD',
  'COD',
  'SS',
  'PH',
  'TEMPERATURE',
  'FOG',
  'AMMONIA',
  'PHOSPHORUS',
]);

export const createLabResultSchema = z.object({
  site_id: uuidSchema,
  parameter_id: uuidSchema,
  sample_date: dateSchema,
  result_value: z.number(),
  unit: z.string().max(20),
  limit_value: z.number().optional(),
  status: z.enum(['COMPLIANT', 'EXCEEDANCE', 'PENDING']),
  lab_reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});

// Module 3: Generators
export const createGeneratorSchema = z.object({
  site_id: uuidSchema,
  generator_name: z.string().min(1).max(200),
  generator_type: z.string().max(100),
  manufacturer: z.string().max(200).optional(),
  model_number: z.string().max(100).optional(),
  serial_number: z.string().max(100).optional(),
  rated_thermal_input_mw: z.number().positive().optional(),
  annual_run_hour_limit: z.number().int().positive().optional(),
  is_active: z.boolean().default(true),
});

export const createRunHourRecordSchema = z.object({
  generator_id: uuidSchema,
  site_id: uuidSchema,
  record_date: dateSchema,
  run_hours: z.number().min(0),
  cumulative_hours: z.number().min(0),
  notes: z.string().optional(),
});

// Module 4: Waste Management
export const createWasteStreamSchema = z.object({
  site_id: uuidSchema,
  waste_description: z.string().min(1).max(500),
  ewc_code: z.string().regex(/^\d{2}\s\d{2}\s\d{2}$/, 'Invalid EWC code format (e.g., 01 01 01)'),
  hazard_code: z.string().max(20).optional(),
  is_hazardous: z.boolean(),
  estimated_annual_tonnage: z.number().positive().optional(),
});

export const createConsignmentNoteSchema = z.object({
  site_id: uuidSchema,
  waste_stream_id: uuidSchema,
  contractor_licence_id: uuidSchema,
  consignment_reference: z.string().min(1).max(100),
  transfer_date: dateSchema,
  quantity_tonnes: z.number().positive(),
  vehicle_registration: z.string().max(20).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

// ============================================================================
// INGESTION SCHEMAS
// ============================================================================

// Grid reference schemas
export const ukGridReferenceSchema = z.string().regex(
  /^[A-HJ-Z]{2}\s?\d{4,10}$/i,
  'Invalid UK OS grid reference format'
);

export const irishGridReferenceSchema = z.string().regex(
  /^[A-HJ-Z]\s?\d{4,10}$/i,
  'Invalid Irish grid reference format'
);

export const gridReferenceTypeSchema = z.enum(['UK_OS', 'IRISH_GRID', 'WGS84']);

// EWC code schema (Module 4)
export const ewcCodeSchema = z.string().regex(
  /^\d{2}\s\d{2}\s\d{2}(\*)?$/,
  'Invalid EWC code format (expected XX XX XX or XX XX XX*)'
);

// Permit reference schemas per regulator
export const permitReferenceSchemas = {
  EA: z.string().regex(/^EPR\/[A-Z]{2}\d{4}[A-Z]{2}\/[A-Z]\d{3}$/i, 'Invalid EA permit reference'),
  SEPA: z.string().regex(/^PPC\/[A-Z]\/\d+$/i, 'Invalid SEPA permit reference'),
  NRW: z.string().regex(/^EPR\/[A-Z]{2}\d{4}[A-Z]{2}\/[A-Z]\d{3}$/i, 'Invalid NRW permit reference'),
  NIEA: z.string().regex(/^[A-Z]+\/\d+\/\d+$/i, 'Invalid NIEA permit reference'),
};

// Confidence components schema (for AI extraction)
export const confidenceComponentsSchema = z.object({
  textClarity: z.number().min(0).max(1),
  structureMatch: z.number().min(0).max(1),
  keywordPresence: z.number().min(0).max(1),
  contextRelevance: z.number().min(0).max(1),
});

// Mogden formula schema (for Trade Effluent consents)
export const mogdenFormulaSchema = z.object({
  ot: z.number().positive(),
  os: z.number().positive(),
  st: z.number().positive(),
  ss: z.number().positive(),
  formula_version: z.string().optional(),
});

// Subjective phrases schema
export const subjectivePhraseSchema = z.object({
  phrase: z.string().min(1),
  context: z.string().optional(),
  suggested_interpretation: z.string().optional(),
});

// Bilingual content schema (for Welsh/Irish permits)
export const bilingualContentSchema = z.object({
  primary_language: z.enum(['EN', 'CY', 'GA']),
  primary_text: z.string().min(1),
  secondary_language: z.enum(['EN', 'CY', 'GA']).optional(),
  secondary_text: z.string().optional(),
});

// Ingestion session schema
export const createIngestionSessionSchema = z.object({
  document_id: uuidSchema,
  company_id: uuidSchema,
  site_id: uuidSchema,
  prompt_id: z.string().min(1),
  prompt_version: z.string().min(1),
  model_identifier: z.string().min(1),
});

export const updateIngestionSessionSchema = z.object({
  processing_completed_at: z.string().datetime().optional(),
  processing_time_ms: z.number().int().positive().optional(),
  total_obligations_extracted: z.number().int().min(0).optional(),
  high_confidence_count: z.number().int().min(0).optional(),
  medium_confidence_count: z.number().int().min(0).optional(),
  low_confidence_count: z.number().int().min(0).optional(),
  subjective_count: z.number().int().min(0).optional(),
  flagged_for_review_count: z.number().int().min(0).optional(),
  raw_extraction_output: z.record(z.string(), z.unknown()).optional(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
});

// Subjective interpretation schema
export const createSubjectiveInterpretationSchema = z.object({
  obligation_id: uuidSchema,
  company_id: uuidSchema,
  phrase: z.string().min(1).max(500),
  interpretation: z.string().min(1),
  operational_definition: z.string().optional(),
  checklist_items: z.array(z.string()).default([]),
});

export const updateSubjectiveInterpretationSchema = z.object({
  interpretation: z.string().min(1).optional(),
  operational_definition: z.string().optional(),
  checklist_items: z.array(z.string()).optional(),
});

// Review status schema (extended)
export const reviewStatusSchema = z.enum([
  'PENDING',
  'PENDING_INTERPRETATION',
  'APPROVED',
  'REJECTED',
  'NEEDS_CLARIFICATION',
]);

// Jurisdiction schema
export const jurisdictionSchema = z.enum([
  'ENGLAND',
  'WALES',
  'SCOTLAND',
  'NORTHERN_IRELAND',
  'REPUBLIC_OF_IRELAND',
]);

// Regulator schema
export const regulatorSchema = z.enum([
  'EA',      // Environment Agency (England)
  'NRW',     // Natural Resources Wales
  'SEPA',    // Scottish Environment Protection Agency
  'NIEA',    // Northern Ireland Environment Agency
  'EPA',     // Environmental Protection Agency (Ireland)
]);

// Water company schema (for Trade Effluent consents - Module 2)
// Aligned with: docs/09-regulatory/prompts/README.md (Prompt_Index_v2.0)
export const waterCompanySchema = z.enum([
  // England
  'THAMES_WATER',
  'SEVERN_TRENT',
  'UNITED_UTILITIES',
  'ANGLIAN_WATER',
  'YORKSHIRE_WATER',
  'NORTHUMBRIAN_WATER',
  'SOUTHERN_WATER',
  'SOUTH_WEST_WATER',
  'WESSEX_WATER',
  // Wales
  'DWR_CYMRU',           // Welsh Water (Dŵr Cymru)
  // Scotland
  'SCOTTISH_WATER',
]);

// Water company metadata for validation and routing
export const waterCompanyConfig = {
  THAMES_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: true, code: 'TW' },
  SEVERN_TRENT: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'ST' },
  UNITED_UTILITIES: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'UU' },
  ANGLIAN_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'AW' },
  YORKSHIRE_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'YW' },
  NORTHUMBRIAN_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'NW' },
  SOUTHERN_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'SW' },
  SOUTH_WEST_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'SWW' },
  WESSEX_WATER: { jurisdiction: 'ENGLAND', hasMogdenFormula: false, code: 'WW' },
  DWR_CYMRU: { jurisdiction: 'WALES', hasMogdenFormula: false, code: 'DC', requiresWelshLanguage: true },
  SCOTTISH_WATER: { jurisdiction: 'SCOTLAND', hasMogdenFormula: false, code: 'SCW' },
} as const;

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const schemas = {
  // Common
  uuid: uuidSchema,
  email: emailSchema,
  url: urlSchema,
  date: dateSchema,

  // Obligations
  createObligation: createObligationSchema,
  updateObligation: updateObligationSchema,

  // Evidence
  createEvidence: createEvidenceSchema,
  updateEvidence: updateEvidenceSchema,

  // Sites
  createSite: createSiteSchema,
  updateSite: updateSiteSchema,

  // Documents
  createDocument: createDocumentSchema,

  // Packs
  createPack: createPackSchema,

  // Users
  createUser: createUserSchema,
  updateUser: updateUserSchema,

  // Module 2
  createLabResult: createLabResultSchema,

  // Module 3
  createGenerator: createGeneratorSchema,
  createRunHourRecord: createRunHourRecordSchema,

  // Module 4
  createWasteStream: createWasteStreamSchema,
  createConsignmentNote: createConsignmentNoteSchema,

  // Ingestion
  conditionTypes: conditionTypesSchema,
  ukGridReference: ukGridReferenceSchema,
  irishGridReference: irishGridReferenceSchema,
  gridReferenceType: gridReferenceTypeSchema,
  ewcCode: ewcCodeSchema,
  confidenceComponents: confidenceComponentsSchema,
  mogdenFormula: mogdenFormulaSchema,
  subjectivePhrase: subjectivePhraseSchema,
  bilingualContent: bilingualContentSchema,
  createIngestionSession: createIngestionSessionSchema,
  updateIngestionSession: updateIngestionSessionSchema,
  createSubjectiveInterpretation: createSubjectiveInterpretationSchema,
  updateSubjectiveInterpretation: updateSubjectiveInterpretationSchema,
  reviewStatus: reviewStatusSchema,
  jurisdiction: jurisdictionSchema,
  regulator: regulatorSchema,
};

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  company_name: z.string().min(2, 'Company name must be at least 2 characters').max(200),
});
