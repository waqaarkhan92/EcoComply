-- Add Missing RLS Policies for pack_sharing table
-- Audit identified that pack_sharing only had SELECT policy

-- Ensure RLS is enabled
ALTER TABLE pack_sharing ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy - Only users with access to the pack's site can create shares
CREATE POLICY IF NOT EXISTS pack_sharing_insert_site_access ON pack_sharing
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_packs
      WHERE audit_packs.id = pack_sharing.pack_id
      AND EXISTS (
        SELECT 1 FROM user_site_access
        WHERE user_site_access.user_id = auth.uid()
        AND user_site_access.site_id = audit_packs.site_id
        AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
      )
    )
  );

-- Add UPDATE policy - Only users with access to the pack's site can update shares
CREATE POLICY IF NOT EXISTS pack_sharing_update_site_access ON pack_sharing
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM audit_packs
      WHERE audit_packs.id = pack_sharing.pack_id
      AND EXISTS (
        SELECT 1 FROM user_site_access
        WHERE user_site_access.user_id = auth.uid()
        AND user_site_access.site_id = audit_packs.site_id
        AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
      )
    )
  );

-- Add DELETE policy - Only OWNER/ADMIN can delete pack shares
CREATE POLICY IF NOT EXISTS pack_sharing_delete_owner_admin_access ON pack_sharing
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM audit_packs
      WHERE audit_packs.id = pack_sharing.pack_id
      AND EXISTS (
        SELECT 1 FROM user_site_access
        WHERE user_site_access.user_id = auth.uid()
        AND user_site_access.site_id = audit_packs.site_id
        AND user_site_access.role IN ('OWNER', 'ADMIN')
      )
    )
  );
