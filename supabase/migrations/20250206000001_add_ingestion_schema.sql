-- Migration: 20250206000001_add_ingestion_schema.sql
-- Description: Add ingestion-related columns, tables, and indexes
-- Author: Integration Plan v1.0
-- Date: 2025-02-06
-- Approach: Additive only - no breaking changes

BEGIN;

-- ============================================================================
-- SECTION 1: New Columns on Existing Tables
-- ============================================================================

-- 1.1 Add condition_types array to obligations
-- Stores multi-valued condition type classification from ingestion prompts
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS
  condition_types TEXT[] DEFAULT '{}';

COMMENT ON COLUMN obligations.condition_types IS
  'Multi-valued condition type classification from ingestion prompts. Values: STANDARD, IMPROVEMENT, PRE_OPERATIONAL, OPERATIONAL, PARAMETER_LIMIT, RUN_HOUR_LIMIT, NOTIFICATION, STACK_TEST, MONITORING, REPORTING, RECORD_KEEPING, BAT_COMPLIANCE, EMISSION_LIMIT, DISCHARGE_LIMIT, STORAGE_LIMIT, TRANSFER_REQUIREMENT, QUARTERLY_RETURN, ANNUAL_RETURN, INCIDENT_NOTIFICATION, EQUIPMENT_MAINTENANCE, CALIBRATION';

-- 1.2 Add mogden_formula to documents for Trade Effluent consents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS
  mogden_formula JSONB DEFAULT NULL;

COMMENT ON COLUMN documents.mogden_formula IS
  'Mogden formula components for Trade Effluent consents. Structure: { ot: decimal, os: decimal, st: decimal, ss: decimal, formula_version: string }';

-- 1.3 Add grid reference fields to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS
  grid_reference TEXT DEFAULT NULL;

ALTER TABLE sites ADD COLUMN IF NOT EXISTS
  grid_reference_type TEXT DEFAULT NULL;

-- Add check constraint for grid reference type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_sites_grid_reference_type'
  ) THEN
    ALTER TABLE sites ADD CONSTRAINT chk_sites_grid_reference_type
      CHECK (grid_reference_type IS NULL OR grid_reference_type IN ('UK_OS', 'IRISH_GRID', 'WGS84'));
  END IF;
END $$;

COMMENT ON COLUMN sites.grid_reference IS
  'Original grid reference before conversion to lat/lng';

COMMENT ON COLUMN sites.grid_reference_type IS
  'Type of grid reference: UK_OS (UK Ordnance Survey), IRISH_GRID (Irish National Grid), WGS84 (GPS coordinates)';

-- ============================================================================
-- SECTION 2: New Tables
-- ============================================================================

-- 2.1 ingestion_sessions - Tracks document extraction sessions
CREATE TABLE IF NOT EXISTS ingestion_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Prompt identification
  prompt_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,

  -- Processing metadata
  model_identifier TEXT NOT NULL,
  processing_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER,

  -- Results summary
  total_obligations_extracted INTEGER DEFAULT 0,
  high_confidence_count INTEGER DEFAULT 0,
  medium_confidence_count INTEGER DEFAULT 0,
  low_confidence_count INTEGER DEFAULT 0,
  subjective_count INTEGER DEFAULT 0,
  flagged_for_review_count INTEGER DEFAULT 0,

  -- Raw output storage
  raw_extraction_output JSONB NOT NULL DEFAULT '{}',

  -- Error tracking
  errors JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ingestion_sessions
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_document
  ON ingestion_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_company
  ON ingestion_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_site
  ON ingestion_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_prompt
  ON ingestion_sessions(prompt_id, prompt_version);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_created
  ON ingestion_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_sessions_status
  ON ingestion_sessions(processing_completed_at)
  WHERE processing_completed_at IS NULL;

COMMENT ON TABLE ingestion_sessions IS
  'Tracks AI extraction sessions for documents, including prompt versions and results';

-- 2.2 subjective_interpretations - Stores interpretations of subjective phrases
CREATE TABLE IF NOT EXISTS subjective_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- The subjective phrase being interpreted
  phrase TEXT NOT NULL,

  -- The interpretation
  interpretation TEXT NOT NULL,

  -- Context
  operational_definition TEXT,
  checklist_items JSONB DEFAULT '[]',

  -- Audit
  interpreted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  interpreted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  previous_interpretation_id UUID REFERENCES subjective_interpretations(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for subjective_interpretations
CREATE INDEX IF NOT EXISTS idx_subjective_interpretations_obligation
  ON subjective_interpretations(obligation_id);
CREATE INDEX IF NOT EXISTS idx_subjective_interpretations_company
  ON subjective_interpretations(company_id);
CREATE INDEX IF NOT EXISTS idx_subjective_interpretations_phrase
  ON subjective_interpretations(phrase);
CREATE INDEX IF NOT EXISTS idx_subjective_interpretations_user
  ON subjective_interpretations(interpreted_by);

-- Unique constraint for active interpretation per phrase per obligation
CREATE UNIQUE INDEX IF NOT EXISTS uq_subjective_interpretations_active
  ON subjective_interpretations(obligation_id, phrase)
  WHERE previous_interpretation_id IS NULL;

COMMENT ON TABLE subjective_interpretations IS
  'Stores user interpretations of subjective phrases in obligations (e.g., "reasonable", "as soon as practicable")';

-- ============================================================================
-- SECTION 3: New Indexes on Existing Tables
-- ============================================================================

-- 3.1 Confidence-based queries on obligations
CREATE INDEX IF NOT EXISTS idx_obligations_confidence_low
  ON obligations(confidence_score)
  WHERE confidence_score < 0.7 AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_obligations_confidence_medium
  ON obligations(confidence_score)
  WHERE confidence_score >= 0.7 AND confidence_score < 0.85 AND deleted_at IS NULL;

-- 3.2 Subjective obligation queries
CREATE INDEX IF NOT EXISTS idx_obligations_subjective_pending
  ON obligations(is_subjective, review_status)
  WHERE is_subjective = true AND review_status IN ('PENDING', 'PENDING_INTERPRETATION');

-- 3.3 Condition types array queries (GIN index for array contains)
CREATE INDEX IF NOT EXISTS idx_obligations_condition_types
  ON obligations USING GIN (condition_types);

-- 3.4 Multi-site permit queries
CREATE INDEX IF NOT EXISTS idx_document_site_assignments_shared
  ON document_site_assignments(document_id)
  WHERE obligations_shared = true;

-- 3.5 Extraction review queries
CREATE INDEX IF NOT EXISTS idx_extraction_logs_review_needed
  ON extraction_logs(document_id, flagged_for_review)
  WHERE flagged_for_review > 0;

-- 3.6 Mogden formula queries (for Trade Effluent consents)
CREATE INDEX IF NOT EXISTS idx_documents_mogden
  ON documents((mogden_formula IS NOT NULL))
  WHERE mogden_formula IS NOT NULL;

-- ============================================================================
-- SECTION 4: Update Triggers
-- ============================================================================

-- 4.1 Auto-update updated_at for ingestion_sessions
CREATE OR REPLACE FUNCTION update_ingestion_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ingestion_sessions_updated_at ON ingestion_sessions;
CREATE TRIGGER trigger_ingestion_sessions_updated_at
  BEFORE UPDATE ON ingestion_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_ingestion_sessions_updated_at();

-- ============================================================================
-- SECTION 5: Row Level Security (RLS) Policies
-- ============================================================================

-- 5.1 Enable RLS on new tables
ALTER TABLE ingestion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjective_interpretations ENABLE ROW LEVEL SECURITY;

-- 5.2 RLS Policies for ingestion_sessions
CREATE POLICY ingestion_sessions_select_policy ON ingestion_sessions
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY ingestion_sessions_insert_policy ON ingestion_sessions
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY ingestion_sessions_update_policy ON ingestion_sessions
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- 5.3 RLS Policies for subjective_interpretations
CREATE POLICY subjective_interpretations_select_policy ON subjective_interpretations
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY subjective_interpretations_insert_policy ON subjective_interpretations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY subjective_interpretations_update_policy ON subjective_interpretations
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

COMMIT;
