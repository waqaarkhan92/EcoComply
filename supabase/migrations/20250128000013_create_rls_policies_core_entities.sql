-- Migration: 20250128000013_create_rls_policies_core_entities.sql
-- Description: Create RLS policies for core entity tables (companies, sites, users, user_roles, user_site_assignments, modules)
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - After enabling RLS

-- ============================================================================
-- COMPANIES TABLE POLICIES
-- ============================================================================

CREATE POLICY companies_select_user_access ON companies
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: their own company
    id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR
    -- Consultants: assigned client companies
    id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY companies_insert_owner_access ON companies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
);

CREATE POLICY companies_update_owner_admin_access ON companies
FOR UPDATE
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: Owner/Admin of their own company
    (
      id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
    OR
    -- Consultants: assigned client companies (read-only, cannot update)
    FALSE
  )
)
WITH CHECK (
  -- Same condition as USING
  deleted_at IS NULL
  AND (
    id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY companies_delete_owner_access ON companies
FOR DELETE
USING (
  -- Only Owner of their own company can delete
  id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
  AND NOT EXISTS (
    SELECT 1 FROM sites
    WHERE company_id = companies.id
    AND deleted_at IS NULL
  )
);

-- ============================================================================
-- SITES TABLE POLICIES
-- ============================================================================

CREATE POLICY sites_select_user_access ON sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: sites in their company OR directly assigned sites
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR id IN (
      SELECT site_id FROM user_site_assignments
      WHERE user_id = auth.uid()
    )
    OR
    -- Consultants: sites in assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY sites_insert_owner_admin_access ON sites
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
  OR
  (
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

CREATE POLICY sites_update_owner_admin_access ON sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: Owner/Admin of their own company
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
    (
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
)
WITH CHECK (
  -- Same condition as USING
  deleted_at IS NULL
  AND (
    (
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
    OR
    (
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
);

CREATE POLICY sites_delete_owner_admin_access ON sites
FOR DELETE
USING (
  -- Only Owner/Admin of their own company can delete (consultants cannot delete)
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
  AND NOT EXISTS (
    SELECT 1 FROM documents
    WHERE site_id = sites.id
    AND deleted_at IS NULL
  )
);

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY users_select_company_access ON users
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: users in their own company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR
    -- Consultants: users in assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
  )
);

CREATE POLICY users_insert_owner_admin_access ON users
FOR INSERT
WITH CHECK (
  -- Only Owner/Admin of their own company can create users
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

CREATE POLICY users_update_owner_admin_access ON users
FOR UPDATE
USING (
  (
    -- Owner/Admin of their own company can update users in their company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
  OR
  -- Users can update their own profile
  id = auth.uid()
)
WITH CHECK (
  -- Same condition as USING
  (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
  OR
  id = auth.uid()
);

CREATE POLICY users_delete_owner_access ON users
FOR DELETE
USING (
  -- Only Owner of their own company can delete users
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
);

-- ============================================================================
-- USER ROLES TABLE POLICIES
-- ============================================================================

CREATE POLICY user_roles_select_company_access ON user_roles
FOR SELECT
USING (
  -- Regular users: role assignments for users in their own company
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_roles.user_id
    AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  )
  OR
  -- Consultants: role assignments for users in assigned client companies
  EXISTS (
    SELECT 1 FROM users u
    INNER JOIN consultant_client_assignments cca ON u.company_id = cca.client_company_id
    WHERE u.id = user_roles.user_id
    AND cca.consultant_id = auth.uid()
    AND cca.status = 'ACTIVE'
  )
);

CREATE POLICY user_roles_insert_owner_admin_access ON user_roles
FOR INSERT
WITH CHECK (
  -- Owner/Admin of their own company can assign roles to users in their company
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_roles.user_id
    AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY user_roles_update_owner_admin_access ON user_roles
FOR UPDATE
USING (
  -- Owner/Admin of their own company can update role assignments in their company
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_roles.user_id
    AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'ADMIN')
    )
  )
)
WITH CHECK (
  -- Same condition as USING
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_roles.user_id
    AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'ADMIN')
    )
  )
);

CREATE POLICY user_roles_delete_owner_access ON user_roles
FOR DELETE
USING (
  -- Only Owner of their own company can delete role assignments
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = user_roles.user_id
    AND u.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'OWNER'
    )
  )
);

-- ============================================================================
-- USER SITE ASSIGNMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY user_site_assignments_select_company_access ON user_site_assignments
FOR SELECT
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE (
      -- Regular users: sites in their own company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      OR
      -- Consultants: sites in assigned client companies
      company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
    )
  )
);

CREATE POLICY user_site_assignments_insert_owner_admin_access ON user_site_assignments
FOR INSERT
WITH CHECK (
  site_id IN (
    SELECT id FROM sites
    WHERE (
      -- Owner/Admin of their own company can assign users to sites in their company
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
);

CREATE POLICY user_site_assignments_update_owner_admin_access ON user_site_assignments
FOR UPDATE
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE (
      -- Owner/Admin of their own company can manage site assignments
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
)
WITH CHECK (
  site_id IN (
    SELECT id FROM sites
    WHERE (
      -- Owner/Admin of their own company can manage site assignments
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
);

CREATE POLICY user_site_assignments_delete_owner_admin_access ON user_site_assignments
FOR DELETE
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE (
      -- Owner/Admin of their own company can manage site assignments
      company_id = (SELECT company_id FROM users WHERE id = auth.uid())
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
);

-- ============================================================================
-- MODULES TABLE POLICIES
-- ============================================================================

CREATE POLICY modules_select_all_access ON modules
FOR SELECT
USING (TRUE);

CREATE POLICY modules_insert_system_access ON modules
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY modules_update_system_access ON modules
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY modules_delete_system_access ON modules
FOR DELETE
USING (auth.role() = 'service_role');

