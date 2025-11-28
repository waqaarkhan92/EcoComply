-- Migration: 20250128000014_create_rls_policies_module1.sql
-- Description: Create RLS policies for Module 1 tables (documents, obligations, schedules, deadlines, evidence_items, etc.)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - After core entity policies

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY documents_select_site_access ON documents
FOR SELECT
USING (
  deleted_at IS NULL
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY documents_insert_staff_access ON documents
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY documents_update_staff_access ON documents
FOR UPDATE
USING (
  deleted_at IS NULL
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY documents_delete_owner_admin_access ON documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = documents.site_id
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- DOCUMENT SITE ASSIGNMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY document_site_assignments_select_site_access ON document_site_assignments
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM documents
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY document_site_assignments_insert_staff_access ON document_site_assignments
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY document_site_assignments_update_staff_access ON document_site_assignments
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY document_site_assignments_delete_owner_admin_access ON document_site_assignments
FOR DELETE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- OBLIGATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY obligations_select_site_access ON obligations
FOR SELECT
USING (
  deleted_at IS NULL
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY obligations_insert_staff_access ON obligations
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY obligations_update_staff_access ON obligations
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY obligations_delete_owner_admin_access ON obligations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = obligations.site_id
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- SCHEDULES TABLE POLICIES
-- ============================================================================

CREATE POLICY schedules_select_site_access ON schedules
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY schedules_insert_staff_access ON schedules
FOR INSERT
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY schedules_update_staff_access ON schedules
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY schedules_delete_owner_admin_access ON schedules
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- DEADLINES TABLE POLICIES
-- ============================================================================

CREATE POLICY deadlines_select_site_access ON deadlines
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY deadlines_insert_system_access ON deadlines
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY deadlines_update_staff_access ON deadlines
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY deadlines_delete_owner_admin_access ON deadlines
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- EVIDENCE ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY evidence_items_select_site_access ON evidence_items
FOR SELECT
USING (
  is_archived = false
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY evidence_items_insert_staff_access ON evidence_items
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY evidence_items_update_staff_access ON evidence_items
FOR UPDATE
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

-- Note: No DELETE policy - evidence cannot be deleted by any role
-- Evidence is archived by system after retention period

-- ============================================================================
-- OBLIGATION EVIDENCE LINKS TABLE POLICIES
-- ============================================================================

CREATE POLICY obligation_evidence_links_select_site_access ON obligation_evidence_links
FOR SELECT
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE deleted_at IS NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY obligation_evidence_links_insert_staff_access ON obligation_evidence_links
FOR INSERT
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY obligation_evidence_links_update_staff_access ON obligation_evidence_links
FOR UPDATE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY obligation_evidence_links_delete_staff_access ON obligation_evidence_links
FOR DELETE
USING (
  obligation_id IN (
    SELECT id FROM obligations
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

-- ============================================================================
-- AUDIT PACKS TABLE POLICIES (with Board Pack exception)
-- ============================================================================

CREATE POLICY audit_packs_select_site_access ON audit_packs
FOR SELECT
USING (
  -- Board Pack: company-level access (site_id = NULL, Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND (
      -- Regular users: Owner/Admin of their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'CONSULTANT'
      )
    )
  )
  OR
  -- Other Pack Types: site-level access
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
  )
  OR
  -- Consultants: client assignment check
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND client_company_id = company_id
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY audit_packs_insert_staff_access ON audit_packs
FOR INSERT
WITH CHECK (
  -- Board Pack: company-level access (site_id = NULL, Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND (
      -- Regular users: Owner/Admin of their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'CONSULTANT'
      )
    )
  )
  OR
  -- Regular users: site-level access (site_id required)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
  OR
  -- Consultants: client assignment check (site_id required, not Board Pack)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND client_company_id = company_id
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY audit_packs_update_staff_access ON audit_packs
FOR UPDATE
USING (
  -- Board Pack: company-level access (Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND (
      -- Regular users: Owner/Admin of their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'CONSULTANT'
      )
    )
  )
  OR
  -- Other Pack Types: site-level access
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND (
      -- Regular users: Owner/Admin of their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'CONSULTANT'
      )
    )
  )
  OR
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
);

CREATE POLICY audit_packs_delete_owner_admin_access ON audit_packs
FOR DELETE
USING (
  -- Board Pack: company-level access (Owner/Admin only)
  (
    pack_type = 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NULL
    AND (
      -- Regular users: Owner/Admin of their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'CONSULTANT'
      )
    )
  )
  OR
  -- Other Pack Types: site-level access (Owner/Admin only)
  (
    pack_type != 'BOARD_MULTI_SITE_RISK'
    AND site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_site_assignments
      WHERE user_id = auth.uid()
      AND site_id = audit_packs.site_id
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- REGULATOR QUESTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY regulator_questions_select_site_access ON regulator_questions
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  OR (
    -- Regular users: their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR
    -- Consultants: assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY regulator_questions_insert_staff_access ON regulator_questions
FOR INSERT
WITH CHECK (
  (
    site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
  OR (
    -- Regular users: Owner/Admin/Staff of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
    OR
    -- Consultants: assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'CONSULTANT'
    )
  )
);

CREATE POLICY regulator_questions_update_staff_access ON regulator_questions
FOR UPDATE
USING (
  (
    site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
  OR (
    -- Regular users: Owner/Admin/Staff of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
    OR
    -- Consultants: assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'CONSULTANT'
    )
  )
)
WITH CHECK (
  (
    site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
  )
  OR (
    -- Regular users: Owner/Admin/Staff of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'STAFF')
    )
    OR
    -- Consultants: assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'CONSULTANT'
    )
  )
);

CREATE POLICY regulator_questions_delete_owner_admin_access ON regulator_questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (
      company_id = regulator_questions.company_id
      OR company_id IN (
        SELECT company_id FROM sites
        WHERE id = regulator_questions.site_id
      )
    )
    AND role IN ('OWNER', 'ADMIN')
  )
);

