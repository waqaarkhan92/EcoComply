-- Migration: Create helper views for RLS policies
-- Description: Create user_site_access and user_company_access views used by RLS policies
-- Date: 2025-02-01
-- Order: Must run before migrations that reference these views

-- ============================================================================
-- HELPER VIEWS FOR RLS POLICIES
-- ============================================================================

-- View: user_site_access
-- Purpose: Provides user_id, site_id, role, and is_active for RLS policies
-- This view combines user_roles, user_site_assignments, and consultant access
CREATE OR REPLACE VIEW user_site_access AS
SELECT DISTINCT
  u.id AS user_id,
  s.id AS site_id,
  COALESCE(
    -- Get role from user_roles table
    (SELECT role FROM user_roles WHERE user_id = u.id ORDER BY 
      CASE role
        WHEN 'OWNER' THEN 1
        WHEN 'ADMIN' THEN 2
        WHEN 'STAFF' THEN 3
        WHEN 'CONSULTANT' THEN 4
        WHEN 'VIEWER' THEN 5
        ELSE 6
      END
    LIMIT 1),
    'VIEWER'
  ) AS role,
  CASE 
    WHEN EXISTS (
      -- Direct site assignment
      SELECT 1 FROM user_site_assignments usa
      WHERE usa.user_id = u.id 
      AND usa.site_id = s.id
    ) THEN true
    WHEN EXISTS (
      -- Users can access sites in their company
      SELECT 1 FROM users u2
      WHERE u2.id = u.id
      AND u2.company_id = s.company_id
    ) THEN true
    WHEN EXISTS (
      -- Consultants can access sites in assigned client companies
      SELECT 1 FROM consultant_client_assignments cca
      WHERE cca.consultant_id = u.id
      AND cca.client_company_id = s.company_id
      AND cca.status = 'ACTIVE'
    ) THEN true
    ELSE false
  END AS is_active
FROM users u
CROSS JOIN sites s
WHERE (
  -- User's company owns the site
  u.company_id = s.company_id
  OR
  -- User has direct site assignment
  EXISTS (
    SELECT 1 FROM user_site_assignments usa
    WHERE usa.user_id = u.id AND usa.site_id = s.id
  )
  OR
  -- Consultant has access to client company
  EXISTS (
    SELECT 1 FROM consultant_client_assignments cca
    WHERE cca.consultant_id = u.id
    AND cca.client_company_id = s.company_id
    AND cca.status = 'ACTIVE'
  )
);

-- View: user_company_access
-- Purpose: Provides user_id, company_id, role, and is_active for RLS policies
CREATE OR REPLACE VIEW user_company_access AS
SELECT DISTINCT
  u.id AS user_id,
  c.id AS company_id,
  COALESCE(
    (SELECT role FROM user_roles WHERE user_id = u.id ORDER BY 
      CASE role
        WHEN 'OWNER' THEN 1
        WHEN 'ADMIN' THEN 2
        WHEN 'STAFF' THEN 3
        WHEN 'CONSULTANT' THEN 4
        WHEN 'VIEWER' THEN 5
        ELSE 6
      END
    LIMIT 1),
    'VIEWER'
  ) AS role,
  CASE 
    WHEN u.company_id = c.id THEN true
    WHEN EXISTS (
      SELECT 1 FROM consultant_client_assignments cca
      WHERE cca.consultant_id = u.id
      AND cca.client_company_id = c.id
      AND cca.status = 'ACTIVE'
    ) THEN true
    ELSE false
  END AS is_active
FROM users u
CROSS JOIN companies c
WHERE (
  u.company_id = c.id
  OR
  EXISTS (
    SELECT 1 FROM consultant_client_assignments cca
    WHERE cca.consultant_id = u.id
    AND cca.client_company_id = c.id
    AND cca.status = 'ACTIVE'
  )
);

-- Grant permissions on views
GRANT SELECT ON user_site_access TO authenticated;
GRANT SELECT ON user_company_access TO authenticated;
