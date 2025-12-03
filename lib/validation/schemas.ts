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
  notification_preferences: z.record(z.boolean()).optional(),
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
};
