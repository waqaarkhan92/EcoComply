-- Migration: 20250128000016_create_rls_policies_cross_module.sql
-- Description: Create RLS policies for cross-module tables (notifications, audit_logs, review_queue_items, escalations, excel_imports, module_activations, cross_sell_triggers, extraction_logs, consultant_client_assignments, pack_distributions)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - After Module 2 & 3 policies

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY notifications_select_user_access ON notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY notifications_insert_system_access ON notifications
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notifications_update_system_access ON notifications
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY notifications_delete_user_access ON notifications
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

CREATE POLICY audit_logs_select_company_access ON audit_logs
FOR SELECT
USING (
  -- Regular users: their own company
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR
  -- Consultants: assigned client companies
  company_id IN (
    SELECT client_company_id FROM consultant_client_assignments
    WHERE consultant_id = auth.uid()
    AND status = 'ACTIVE'
  )
);

CREATE POLICY audit_logs_insert_system_access ON audit_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Note: No UPDATE or DELETE policies - audit logs are immutable

-- ============================================================================
-- REVIEW QUEUE ITEMS TABLE POLICIES
-- ============================================================================

CREATE POLICY review_queue_items_select_site_access ON review_queue_items
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY review_queue_items_insert_system_access ON review_queue_items
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY review_queue_items_update_staff_access ON review_queue_items
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

CREATE POLICY review_queue_items_delete_system_access ON review_queue_items
FOR DELETE
USING (auth.role() = 'service_role');

-- ============================================================================
-- ESCALATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY escalations_select_site_access ON escalations
FOR SELECT
USING (
  site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  OR escalated_to = auth.uid()
);

CREATE POLICY escalations_insert_system_access ON escalations
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY escalations_update_staff_access ON escalations
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
  OR escalated_to = auth.uid()
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
  OR escalated_to = auth.uid()
);

CREATE POLICY escalations_delete_owner_admin_access ON escalations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_site_assignments
    WHERE user_id = auth.uid()
    AND site_id = escalations.site_id
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

-- ============================================================================
-- EXCEL IMPORTS TABLE POLICIES
-- ============================================================================

CREATE POLICY excel_imports_select_user_access ON excel_imports
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY excel_imports_insert_user_access ON excel_imports
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND site_id IN (
    SELECT site_id FROM user_site_assignments
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
);

CREATE POLICY excel_imports_update_user_access ON excel_imports
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY excel_imports_delete_user_access ON excel_imports
FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- MODULE ACTIVATIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY module_activations_select_company_access ON module_activations
FOR SELECT
USING (
  (
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

CREATE POLICY module_activations_insert_owner_admin_access ON module_activations
FOR INSERT
WITH CHECK (
  (
    -- Regular users: Owner/Admin of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY module_activations_update_owner_admin_access ON module_activations
FOR UPDATE
USING (
  (
    -- Regular users: Owner/Admin of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
)
WITH CHECK (
  (
    -- Regular users: Owner/Admin of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY module_activations_delete_owner_access ON module_activations
FOR DELETE
USING (
  -- Only Owner of their own company can deactivate modules (consultants cannot)
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
);

-- ============================================================================
-- CROSS-SELL TRIGGERS TABLE POLICIES
-- ============================================================================

CREATE POLICY cross_sell_triggers_select_company_access ON cross_sell_triggers
FOR SELECT
USING (
  (
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

CREATE POLICY cross_sell_triggers_insert_system_access ON cross_sell_triggers
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY cross_sell_triggers_update_owner_admin_access ON cross_sell_triggers
FOR UPDATE
USING (
  (
    -- Regular users: Owner/Admin of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
)
WITH CHECK (
  (
    -- Regular users: Owner/Admin of their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY cross_sell_triggers_delete_owner_admin_access ON cross_sell_triggers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = cross_sell_triggers.company_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- EXTRACTION LOGS TABLE POLICIES
-- ============================================================================

CREATE POLICY extraction_logs_select_site_access ON extraction_logs
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

CREATE POLICY extraction_logs_insert_system_access ON extraction_logs
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY extraction_logs_update_system_access ON extraction_logs
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY extraction_logs_delete_owner_admin_access ON extraction_logs
FOR DELETE
USING (
  document_id IN (
    SELECT id FROM documents
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
-- CONSULTANT CLIENT ASSIGNMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY consultant_client_assignments_select_consultant_access ON consultant_client_assignments
FOR SELECT
USING (
  consultant_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = consultant_client_assignments.client_company_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY consultant_client_assignments_insert_owner_admin_access ON consultant_client_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = consultant_client_assignments.client_company_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'ADMIN')
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = consultant_client_assignments.consultant_id
    AND ur2.role = 'CONSULTANT'
  )
);

CREATE POLICY consultant_client_assignments_update_owner_admin_access ON consultant_client_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = consultant_client_assignments.client_company_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
)
WITH CHECK (
  -- Only Owner/Admin of the client company can update assignments
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = consultant_client_assignments.client_company_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY consultant_client_assignments_delete_owner_admin_access ON consultant_client_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.company_id = consultant_client_assignments.client_company_id
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- ============================================================================
-- PACK DISTRIBUTIONS TABLE POLICIES
-- ============================================================================

CREATE POLICY pack_distributions_select_pack_access ON pack_distributions
FOR SELECT
USING (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE (
      -- Site-level access
      site_id IN (
        SELECT site_id FROM user_site_assignments
        WHERE user_id = auth.uid()
      )
      OR
      -- Regular users: Owner/Admin of their own company (for Board Pack)
      (
        company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        AND EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
          AND role IN ('OWNER', 'ADMIN')
        )
      )
      OR
      -- Consultants: assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
    )
  )
);

CREATE POLICY pack_distributions_insert_staff_access ON pack_distributions
FOR INSERT
WITH CHECK (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR (
      -- Board Pack: company-level access
      pack_type = 'BOARD_MULTI_SITE_RISK'
      AND site_id IS NULL
      AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF', 'CONSULTANT')
  )
  -- Distribution method access validated at application level (Growth Plan required)
);

CREATE POLICY pack_distributions_update_staff_access ON pack_distributions
FOR UPDATE
USING (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR (
      -- Board Pack: company-level access
      pack_type = 'BOARD_MULTI_SITE_RISK'
      AND site_id IS NULL
      AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR (
      -- Board Pack: company-level access
      pack_type = 'BOARD_MULTI_SITE_RISK'
      AND site_id IS NULL
      AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

CREATE POLICY pack_distributions_delete_owner_admin_access ON pack_distributions
FOR DELETE
USING (
  pack_id IN (
    SELECT id FROM audit_packs
    WHERE site_id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR (
      -- Board Pack: company-level access
      pack_type = 'BOARD_MULTI_SITE_RISK'
      AND site_id IS NULL
      AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

