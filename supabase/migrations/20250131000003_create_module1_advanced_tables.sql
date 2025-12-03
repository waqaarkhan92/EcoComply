-- Migration: 20250131000003_create_module1_advanced_tables.sql
-- Description: Create Module 1 advanced feature tables (permit versions, enforcement notices, compliance decisions)
-- Author: Build System
-- Date: 2025-01-31
-- Order: Phase 3 - After Module 1 core tables exist

-- ============================================================================
-- MODULE 1 ADVANCED FEATURES: PERMIT VERSION TRACKING, ENFORCEMENT NOTICES, COMPLIANCE DECISIONS
-- ============================================================================

-- 1. permit_versions table
CREATE TABLE permit_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_date DATE NOT NULL,
    effective_date DATE,
    expiry_date DATE,
    version_type TEXT NOT NULL CHECK (version_type IN ('INITIAL', 'VARIATION', 'REVOCATION', 'SURRENDER', 'TRANSFER')),
    change_summary TEXT,
    redline_document_url TEXT,
    impact_analysis JSONB NOT NULL DEFAULT '{}',
    is_current BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(document_id, version_number)
);

CREATE INDEX idx_permit_versions_document_id ON permit_versions(document_id);
CREATE INDEX idx_permit_versions_company_id ON permit_versions(company_id);
CREATE INDEX idx_permit_versions_site_id ON permit_versions(site_id);
CREATE INDEX idx_permit_versions_is_current ON permit_versions(is_current) WHERE is_current = true;
CREATE INDEX idx_permit_versions_version_date ON permit_versions(version_date);
CREATE INDEX idx_permit_versions_version_type ON permit_versions(version_type);

-- 2. obligation_versions table
CREATE TABLE obligation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    permit_version_id UUID NOT NULL REFERENCES permit_versions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    obligation_text TEXT NOT NULL,
    obligation_type TEXT,
    condition_reference TEXT,
    is_new BOOLEAN NOT NULL DEFAULT false,
    is_modified BOOLEAN NOT NULL DEFAULT false,
    is_removed BOOLEAN NOT NULL DEFAULT false,
    change_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(obligation_id, permit_version_id, version_number)
);

CREATE INDEX idx_obligation_versions_obligation_id ON obligation_versions(obligation_id);
CREATE INDEX idx_obligation_versions_permit_version_id ON obligation_versions(permit_version_id);
CREATE INDEX idx_obligation_versions_is_new ON obligation_versions(is_new) WHERE is_new = true;
CREATE INDEX idx_obligation_versions_is_modified ON obligation_versions(is_modified) WHERE is_modified = true;
CREATE INDEX idx_obligation_versions_is_removed ON obligation_versions(is_removed) WHERE is_removed = true;

-- 3. enforcement_notices table
CREATE TABLE enforcement_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    notice_number TEXT NOT NULL,
    notice_date DATE NOT NULL,
    notice_type TEXT NOT NULL CHECK (notice_type IN ('WARNING', 'NOTICE', 'VARIATION', 'SUSPENSION', 'REVOCATION', 'PROSECUTION')),
    regulator TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    deadline_date DATE,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESPONDED', 'CLOSED', 'APPEALED')),
    response_submitted_at TIMESTAMP WITH TIME ZONE,
    response_document_url TEXT,
    response_notes TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closure_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_enforcement_notices_company_id ON enforcement_notices(company_id);
CREATE INDEX idx_enforcement_notices_site_id ON enforcement_notices(site_id);
CREATE INDEX idx_enforcement_notices_document_id ON enforcement_notices(document_id);
CREATE INDEX idx_enforcement_notices_status ON enforcement_notices(status);
CREATE INDEX idx_enforcement_notices_notice_type ON enforcement_notices(notice_type);
CREATE INDEX idx_enforcement_notices_notice_date ON enforcement_notices(notice_date);
CREATE INDEX idx_enforcement_notices_deadline_date ON enforcement_notices(deadline_date) WHERE deadline_date IS NOT NULL;

-- 4. compliance_decisions table
CREATE TABLE compliance_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    decision_type TEXT NOT NULL CHECK (decision_type IN ('COMPLIANCE', 'NON_COMPLIANCE', 'PARTIAL_COMPLIANCE', 'NOT_APPLICABLE', 'DEFERRED')),
    decision_date DATE NOT NULL,
    decision_maker UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rationale TEXT NOT NULL,
    evidence_references TEXT[],
    impact_assessment TEXT,
    review_date DATE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_compliance_decisions_company_id ON compliance_decisions(company_id);
CREATE INDEX idx_compliance_decisions_site_id ON compliance_decisions(site_id);
CREATE INDEX idx_compliance_decisions_obligation_id ON compliance_decisions(obligation_id);
CREATE INDEX idx_compliance_decisions_decision_type ON compliance_decisions(decision_type);
CREATE INDEX idx_compliance_decisions_decision_date ON compliance_decisions(decision_date);
CREATE INDEX idx_compliance_decisions_is_active ON compliance_decisions(is_active) WHERE is_active = true;
CREATE INDEX idx_compliance_decisions_decision_maker ON compliance_decisions(decision_maker);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE permit_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_decisions ENABLE ROW LEVEL SECURITY;

-- permit_versions RLS policies
CREATE POLICY "Users can view permit versions for their company sites"
    ON permit_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = permit_versions.company_id
        )
    );

CREATE POLICY "Staff can create permit versions for their company sites"
    ON permit_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = permit_versions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update permit versions for their company sites"
    ON permit_versions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = permit_versions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- obligation_versions RLS policies
CREATE POLICY "Users can view obligation versions for their company"
    ON obligation_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM permit_versions pv
            JOIN user_company_access uca ON uca.company_id = pv.company_id
            WHERE pv.id = obligation_versions.permit_version_id
            AND uca.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can create obligation versions for their company"
    ON obligation_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM permit_versions pv
            JOIN user_company_access uca ON uca.company_id = pv.company_id
            WHERE pv.id = obligation_versions.permit_version_id
            AND uca.user_id = auth.uid()
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- enforcement_notices RLS policies
CREATE POLICY "Users can view enforcement notices for their company sites"
    ON enforcement_notices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = enforcement_notices.company_id
        )
    );

CREATE POLICY "Staff can create enforcement notices for their company sites"
    ON enforcement_notices FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = enforcement_notices.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update enforcement notices for their company sites"
    ON enforcement_notices FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = enforcement_notices.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- compliance_decisions RLS policies
CREATE POLICY "Users can view compliance decisions for their company sites"
    ON compliance_decisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = compliance_decisions.company_id
        )
    );

CREATE POLICY "Staff can create compliance decisions for their company sites"
    ON compliance_decisions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = compliance_decisions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update compliance decisions for their company sites"
    ON compliance_decisions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = compliance_decisions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER update_permit_versions_updated_at
    BEFORE UPDATE ON permit_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_obligation_versions_updated_at
    BEFORE UPDATE ON obligation_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enforcement_notices_updated_at
    BEFORE UPDATE ON enforcement_notices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_decisions_updated_at
    BEFORE UPDATE ON compliance_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one current version per document
CREATE OR REPLACE FUNCTION ensure_single_current_permit_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = true THEN
        UPDATE permit_versions
        SET is_current = false
        WHERE document_id = NEW.document_id
        AND id != NEW.id
        AND is_current = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_current_permit_version_trigger
    BEFORE INSERT OR UPDATE ON permit_versions
    FOR EACH ROW
    WHEN (NEW.is_current = true)
    EXECUTE FUNCTION ensure_single_current_permit_version();



