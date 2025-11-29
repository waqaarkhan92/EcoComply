
-- ============================================================================
-- Reports Storage Bucket RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "reports_select_user_access" ON storage.objects;
DROP POLICY IF EXISTS "reports_insert_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_update_service_role" ON storage.objects;
DROP POLICY IF EXISTS "reports_delete_admin_access" ON storage.objects;

-- ============================================================================
-- SELECT POLICY - Download Reports
-- ============================================================================

CREATE POLICY "reports_select_user_access" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports'
  AND (
    -- Extract report_id from path: reports/{report_id}/...
    -- Users can access reports for their company
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR
    -- Consultants: assigned client companies
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id IN (
        SELECT client_company_id FROM consultant_client_assignments
        WHERE consultant_id = auth.uid()
        AND status = 'ACTIVE'
      )
    )
  )
);

-- ============================================================================
-- INSERT POLICY - Upload Reports (Service Role Only)
-- ============================================================================

CREATE POLICY "reports_insert_service_role" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

-- ============================================================================
-- UPDATE POLICY - Update Reports (Service Role Only)
-- ============================================================================

CREATE POLICY "reports_update_service_role" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'reports'
  AND auth.role() = 'service_role'
);

-- ============================================================================
-- DELETE POLICY - Delete Reports (Admin+ Only)
-- ============================================================================

CREATE POLICY "reports_delete_admin_access" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'reports'
  AND (
    -- Extract report_id from path
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM reports
      WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN')
      )
    )
  )
);
