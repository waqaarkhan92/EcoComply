-- Migration: 20250128000011_create_rls_helper_functions.sql
-- Description: Create RLS helper functions for permission checks
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - Before RLS policies

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

-- Function: has_company_access
-- Purpose: Check if user has access to a company
-- Regular users: Access to their own company (via users.company_id)
-- Consultants: Access to assigned client companies (via consultant_client_assignments)
CREATE OR REPLACE FUNCTION has_company_access(user_id UUID, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Regular users: their own company
    has_company_access.company_id = (SELECT u.company_id FROM users u WHERE u.id = has_company_access.user_id)
    OR
    -- Consultants: assigned client companies
    EXISTS (
      SELECT 1 FROM consultant_client_assignments cca
      WHERE cca.consultant_id = has_company_access.user_id
      AND cca.client_company_id = has_company_access.company_id
      AND cca.status = 'ACTIVE'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: has_site_access
-- Purpose: Check if user has access to a site
-- Direct assignment via user_site_assignments
-- Regular users: Sites in their own company
-- Consultants: Sites in assigned client companies
CREATE OR REPLACE FUNCTION has_site_access(user_id UUID, site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Direct site assignment
    EXISTS (
      SELECT 1 FROM user_site_assignments
      WHERE user_site_assignments.user_id = has_site_access.user_id
      AND user_site_assignments.site_id = has_site_access.site_id
    )
    OR
    -- Regular users: sites in their own company
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN users u ON s.company_id = u.company_id
      WHERE s.id = has_site_access.site_id
      AND u.id = has_site_access.user_id
    )
    OR
    -- Consultants: sites in assigned client companies
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN consultant_client_assignments cca ON s.company_id = cca.client_company_id
      WHERE s.id = has_site_access.site_id
      AND cca.consultant_id = has_site_access.user_id
      AND cca.status = 'ACTIVE'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: role_has_permission
-- Purpose: Check if user's role has permission for an operation on an entity type
CREATE OR REPLACE FUNCTION role_has_permission(
  user_id UUID,
  entity_type TEXT,
  operation TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user's role (users can have multiple roles, get first one)
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = role_has_permission.user_id
  ORDER BY CASE role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'STAFF' THEN 3
    WHEN 'CONSULTANT' THEN 4
    WHEN 'VIEWER' THEN 5
    ELSE 6
  END
  LIMIT 1;
  
  -- Check permission based on role and operation (UPPERCASE roles)
  CASE user_role
    WHEN 'OWNER' THEN
      RETURN TRUE; -- Owner has all permissions
    WHEN 'ADMIN' THEN
      RETURN operation != 'DELETE' OR entity_type IN ('companies', 'users'); -- Admin can delete most, but not companies/users
    WHEN 'STAFF' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type NOT IN ('users', 'user_roles', 'module_activations');
    WHEN 'VIEWER' THEN
      RETURN operation = 'READ'; -- Viewer is read-only
    WHEN 'CONSULTANT' THEN
      RETURN operation IN ('CREATE', 'READ', 'UPDATE') AND entity_type IN ('documents', 'obligations', 'evidence_items', 'audit_packs');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_module_activated
-- Purpose: Check if a module is activated for a company
CREATE OR REPLACE FUNCTION is_module_activated(
  company_id UUID,
  module_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM module_activations
    WHERE module_activations.company_id = is_module_activated.company_id
    AND module_activations.module_id = is_module_activated.module_id
    AND module_activations.status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

