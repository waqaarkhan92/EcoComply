-- Migration: 20250218000001_create_audit_logs_table.sql
-- Description: Create audit_logs table for tracking all entity changes
-- Author: Build System
-- Date: 2025-02-18

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'obligation', 'evidence', 'document', 'pack', 'corrective_action'
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'status_change'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changes JSONB DEFAULT '{}', -- { field: { old: value, new: value } }
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking all changes to entities across the platform';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being audited (obligation, evidence, document, pack, corrective_action)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity being audited';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, update, delete, status_change)';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing field changes: { field: { old: value, new: value } }';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context about the change';

-- Create RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for entities in their company
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (
    -- Allow users to view audit logs where they have access to the entity
    -- This is a simplified policy - you may want to add more complex logic
    -- based on company_id or site_id from the related entity
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Policy: Only system (service role) can insert audit logs
-- This prevents users from tampering with audit records
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- No update or delete policies - audit logs are immutable
-- Users cannot modify or delete audit logs once created

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;
