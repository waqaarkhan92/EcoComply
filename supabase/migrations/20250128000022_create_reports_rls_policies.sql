-- Migration: 20250128000022_create_reports_rls_policies.sql
-- Description: Create RLS policies for reports table
-- Author: Build System
-- Date: 2025-01-28
-- Order: After reports table creation

-- ============================================================================
-- REPORTS TABLE POLICIES
-- ============================================================================

-- SELECT: Users can view reports for their company
CREATE POLICY reports_select_user_access ON reports
FOR SELECT
USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  OR
  -- Consultants: assigned client companies
  company_id IN (
    SELECT client_company_id FROM consultant_client_assignments
    WHERE consultant_id = auth.uid()
    AND status = 'ACTIVE'
  )
);

-- INSERT: Staff+ roles can create reports for their company
CREATE POLICY reports_insert_staff_access ON reports
FOR INSERT
WITH CHECK (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

-- UPDATE: Staff+ roles can update reports for their company
CREATE POLICY reports_update_staff_access ON reports
FOR UPDATE
USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
)
WITH CHECK (
  -- Same condition as USING
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN', 'STAFF')
  )
);

-- DELETE: Admin+ roles can delete reports for their company
CREATE POLICY reports_delete_admin_access ON reports
FOR DELETE
USING (
  company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('OWNER', 'ADMIN')
  )
);

