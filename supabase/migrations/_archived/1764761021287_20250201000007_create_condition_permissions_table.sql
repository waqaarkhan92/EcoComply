-- Condition-Level Permissions Table
-- Module 1: Environmental Permits

-- ============================================================================
-- CONDITION PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS condition_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    condition_reference TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL
        CHECK (permission_type IN ('VIEW', 'EDIT', 'MANAGE', 'FULL')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condition_permissions_user_id ON condition_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_condition_permissions_document_id ON condition_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_condition_permissions_condition_reference ON condition_permissions(condition_reference);
CREATE INDEX IF NOT EXISTS idx_condition_permissions_company_id ON condition_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_condition_permissions_site_id ON condition_permissions(site_id);
CREATE INDEX IF NOT EXISTS idx_condition_permissions_is_active ON condition_permissions(is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_condition_permissions ON condition_permissions(user_id, document_id, condition_reference) 
    WHERE is_active = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE condition_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS condition_permissions_select_site_access ON condition_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = condition_permissions.site_id
        )
    );

CREATE POLICY IF NOT EXISTS condition_permissions_insert_staff_access ON condition_permissions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = condition_permissions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS condition_permissions_update_staff_access ON condition_permissions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = condition_permissions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS condition_permissions_delete_owner_admin_access ON condition_permissions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = condition_permissions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for condition_permissions
CREATE OR REPLACE FUNCTION update_condition_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_condition_permissions_updated_at
    BEFORE UPDATE ON condition_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_condition_permissions_updated_at();

