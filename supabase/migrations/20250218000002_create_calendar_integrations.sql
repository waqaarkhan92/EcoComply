-- Migration: 20250218000002_create_calendar_integrations.sql
-- Description: Create calendar integrations table for Google Calendar and Outlook sync
-- Author: Build System
-- Date: 2025-02-18

-- Create calendar_integrations table
CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255), -- Selected calendar
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);

-- Create calendar_event_mappings table to track synced events
CREATE TABLE calendar_event_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255) NOT NULL, -- Event ID from Google/Outlook
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, obligation_id)
);

-- Create index for event mappings
CREATE INDEX idx_calendar_event_mappings_integration_id ON calendar_event_mappings(integration_id);
CREATE INDEX idx_calendar_event_mappings_obligation_id ON calendar_event_mappings(obligation_id);
CREATE INDEX idx_calendar_event_mappings_external_id ON calendar_event_mappings(external_event_id);

-- Enable RLS on calendar_integrations
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own integrations
CREATE POLICY calendar_integrations_select_policy ON calendar_integrations
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY calendar_integrations_insert_policy ON calendar_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY calendar_integrations_update_policy ON calendar_integrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY calendar_integrations_delete_policy ON calendar_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- Enable RLS on calendar_event_mappings
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access mappings for their integrations
CREATE POLICY calendar_event_mappings_select_policy ON calendar_event_mappings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations
      WHERE calendar_integrations.id = calendar_event_mappings.integration_id
        AND calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_event_mappings_insert_policy ON calendar_event_mappings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_integrations
      WHERE calendar_integrations.id = calendar_event_mappings.integration_id
        AND calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_event_mappings_update_policy ON calendar_event_mappings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations
      WHERE calendar_integrations.id = calendar_event_mappings.integration_id
        AND calendar_integrations.user_id = auth.uid()
    )
  );

CREATE POLICY calendar_event_mappings_delete_policy ON calendar_event_mappings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM calendar_integrations
      WHERE calendar_integrations.id = calendar_event_mappings.integration_id
        AND calendar_integrations.user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_event_mappings_updated_at
  BEFORE UPDATE ON calendar_event_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
