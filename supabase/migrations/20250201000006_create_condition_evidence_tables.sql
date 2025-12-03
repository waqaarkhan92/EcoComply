-- Condition-Level Evidence Mapping Tables
-- Module 1: Environmental Permits

-- ============================================================================
-- 1. CONDITION EVIDENCE RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS condition_evidence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    condition_reference TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    allowed_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    required_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    evidence_requirements JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_document_id ON condition_evidence_rules(document_id);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_obligation_id ON condition_evidence_rules(obligation_id);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_condition_reference ON condition_evidence_rules(condition_reference);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_company_id ON condition_evidence_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_site_id ON condition_evidence_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_condition_evidence_rules_is_active ON condition_evidence_rules(is_active);

-- ============================================================================
-- 2. EVIDENCE COMPLETENESS SCORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_completeness_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    condition_reference TEXT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    compliance_period TEXT NOT NULL,
    completeness_score DECIMAL(5, 2) NOT NULL DEFAULT 0 
        CHECK (completeness_score >= 0 AND completeness_score <= 100),
    required_evidence_count INTEGER NOT NULL DEFAULT 0,
    provided_evidence_count INTEGER NOT NULL DEFAULT 0,
    missing_evidence_types TEXT[] NOT NULL DEFAULT '{}',
    scoring_details JSONB NOT NULL DEFAULT '{}',
    last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_completeness_scores_obligation_id ON evidence_completeness_scores(obligation_id);
CREATE INDEX IF NOT EXISTS idx_evidence_completeness_scores_company_id ON evidence_completeness_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_completeness_scores_site_id ON evidence_completeness_scores(site_id);
CREATE INDEX IF NOT EXISTS idx_evidence_completeness_scores_compliance_period ON evidence_completeness_scores(compliance_period);
CREATE INDEX IF NOT EXISTS idx_evidence_completeness_scores_completeness_score ON evidence_completeness_scores(completeness_score);
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_completeness_scores ON evidence_completeness_scores(obligation_id, compliance_period) 
    WHERE condition_reference IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_completeness_scores_condition ON evidence_completeness_scores(obligation_id, condition_reference, compliance_period) 
    WHERE condition_reference IS NOT NULL;

-- ============================================================================
-- RLS POLICIES - CONDITIONAL (Only if view exists)
-- ============================================================================

ALTER TABLE condition_evidence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_completeness_scores ENABLE ROW LEVEL SECURITY;

-- condition_evidence_rules policies (conditional on view existence)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    CREATE POLICY IF NOT EXISTS condition_evidence_rules_select_site_access ON condition_evidence_rules
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = condition_evidence_rules.site_id
        )
      );

    CREATE POLICY IF NOT EXISTS condition_evidence_rules_insert_staff_access ON condition_evidence_rules
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = condition_evidence_rules.site_id
          AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
      );

    CREATE POLICY IF NOT EXISTS condition_evidence_rules_update_staff_access ON condition_evidence_rules
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = condition_evidence_rules.site_id
          AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
      );

    CREATE POLICY IF NOT EXISTS condition_evidence_rules_delete_owner_admin_access ON condition_evidence_rules
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = condition_evidence_rules.site_id
          AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
      );
  END IF;
END $$;

-- evidence_completeness_scores policies (conditional on view existence)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    CREATE POLICY IF NOT EXISTS evidence_completeness_scores_select_site_access ON evidence_completeness_scores
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = evidence_completeness_scores.site_id
        )
      );

    CREATE POLICY IF NOT EXISTS evidence_completeness_scores_insert_system_access ON evidence_completeness_scores
      FOR INSERT
      WITH CHECK (false); -- System only, inserted via triggers/jobs

    CREATE POLICY IF NOT EXISTS evidence_completeness_scores_update_system_access ON evidence_completeness_scores
      FOR UPDATE
      USING (false); -- System only, updated via triggers/jobs

    CREATE POLICY IF NOT EXISTS evidence_completeness_scores_delete_owner_admin_access ON evidence_completeness_scores
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM user_site_access
          WHERE user_site_access.user_id = auth.uid()
          AND user_site_access.site_id = evidence_completeness_scores.site_id
          AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for condition_evidence_rules
CREATE OR REPLACE FUNCTION update_condition_evidence_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_condition_evidence_rules_updated_at
    BEFORE UPDATE ON condition_evidence_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_condition_evidence_rules_updated_at();

-- Update updated_at for evidence_completeness_scores
CREATE OR REPLACE FUNCTION update_evidence_completeness_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evidence_completeness_scores_updated_at
    BEFORE UPDATE ON evidence_completeness_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_completeness_scores_updated_at();

