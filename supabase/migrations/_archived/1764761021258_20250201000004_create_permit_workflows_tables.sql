-- Permit Workflows, Variations, and Surrenders Tables
-- Module 1: Permit Lifecycle Management

-- ============================================================================
-- 1. PERMIT WORKFLOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS permit_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL
        CHECK (workflow_type IN ('VARIATION', 'RENEWAL', 'SURRENDER')),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
    submitted_date DATE,
    regulator_response_deadline DATE,
    regulator_response_date DATE,
    regulator_comments TEXT,
    approval_date DATE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    workflow_notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permit_workflows_document_id ON permit_workflows(document_id);
CREATE INDEX IF NOT EXISTS idx_permit_workflows_company_id ON permit_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_permit_workflows_site_id ON permit_workflows(site_id);
CREATE INDEX IF NOT EXISTS idx_permit_workflows_status ON permit_workflows(status);
CREATE INDEX IF NOT EXISTS idx_permit_workflows_workflow_type ON permit_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_permit_workflows_submitted_date ON permit_workflows(submitted_date);

-- ============================================================================
-- 2. PERMIT VARIATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS permit_variations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULLid) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    variation_type TEXT NOT NULL,
    variation_description TEXT NOT NULL,
    requested_changes JSONB NOT NULL DEFAULT '{}',
    impact_assessment JSONB NOT NULL DEFAULT '{}',
    obligations_affected UUID[] NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permit_variations_document_id ON permit_variations(document_id);
CREATE INDEX IF NOT EXISTS idx_permit_variations_workflow_id ON permit_variations(workflow_id);
CREATE INDEX IF NOT EXISTS idx_permit_variations_company_id ON permit_variations(company_id);
CREATE INDEX IF NOT EXISTS idx_permit_variations_site_id ON permit_variations(site_id);
CREATE INDEX IF NOT EXISTS idx_permit_variations_variation_type ON permit_variations(variation_type);

-- ============================================================================
-- 3. PERMIT SURRENDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS permit_surrenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULLid) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    surrender_reason TEXT NOT NULL,
    surrender_date DATE,
    final_inspection_date DATE,
    final_report_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    obligations_closed UUID[] NOT NULL DEFAULT '{}',
    site_decommission_complete BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permit_surrenders_document_id ON permit_surrenders(document_id);
CREATE INDEX IF NOT EXISTS idx_permit_surrenders_workflow_id ON permit_surrenders(workflow_id);
CREATE INDEX IF NOT EXISTS idx_permit_surrenders_company_id ON permit_surrenders(company_id);
CREATE INDEX IF NOT EXISTS idx_permit_surrenders_site_id ON permit_surrenders(site_id);
CREATE INDEX IF NOT EXISTS idx_permit_surrenders_surrender_date ON permit_surrenders(surrender_date);
CREATE INDEX IF NOT EXISTS idx_permit_surrenders_site_decommission_complete ON permit_surrenders(site_decommission_complete);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE permit_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_surrenders ENABLE ROW LEVEL SECURITY;

-- permit_workflows policies
CREATE POLICY IF NOT EXISTS permit_workflows_select_site_access ON permit_workflows
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_workflows.site_id
        )
    );

CREATE POLICY IF NOT EXISTS permit_workflows_insert_staff_access ON permit_workflows
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_workflows.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS permit_workflows_update_staff_access ON permit_workflows
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_workflows.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- permit_variations policies
CREATE POLICY IF NOT EXISTS permit_variations_select_site_access ON permit_variations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_variations.site_id
        )
    );

CREATE POLICY IF NOT EXISTS permit_variations_insert_staff_access ON permit_variations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_variations.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS permit_variations_update_staff_access ON permit_variations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_variations.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- permit_surrenders policies
CREATE POLICY IF NOT EXISTS permit_surrenders_select_site_access ON permit_surrenders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_surrenders.site_id
        )
    );

CREATE POLICY IF NOT EXISTS permit_surrenders_insert_staff_access ON permit_surrenders
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_surrenders.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS permit_surrenders_update_staff_access ON permit_surrenders
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = permit_surrenders.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for permit_workflows
CREATE OR REPLACE FUNCTION update_permit_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permit_workflows_updated_at
    BEFORE UPDATE ON permit_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_permit_workflows_updated_at();

-- Update updated_at for permit_variations
CREATE OR REPLACE FUNCTION update_permit_variations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permit_variations_updated_at
    BEFORE UPDATE ON permit_variations
    FOR EACH ROW
    EXECUTE FUNCTION update_permit_variations_updated_at();

-- Update updated_at for permit_surrenders
CREATE OR REPLACE FUNCTION update_permit_surrenders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permit_surrenders_updated_at
    BEFORE UPDATE ON permit_surrenders
    FOR EACH ROW
    EXECUTE FUNCTION update_permit_surrenders_updated_at();



-- Deferred Foreign Key Constraints
-- Deferred FK: workflow_id -> permit_workflows
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_workflows') THEN
    ALTER TABLE permit_workflows 
    ADD CONSTRAINT fk_permit_workflows_workflow_id
    FOREIGN KEY (workflow_id) REFERENCES permit_workflows(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Deferred FK: workflow_id -> permit_workflows
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'permit_workflows') THEN
    ALTER TABLE permit_workflows 
    ADD CONSTRAINT fk_permit_workflows_workflow_id
    FOREIGN KEY (workflow_id) REFERENCES permit_workflows(id) ON DELETE CASCADE;
  END IF;
END $$;