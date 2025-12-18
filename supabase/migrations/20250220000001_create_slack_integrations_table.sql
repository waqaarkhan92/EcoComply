-- Migration: 20250220000001_create_slack_integrations_table.sql
-- Description: Create table for storing Slack integration settings
-- Author: Build System
-- Date: 2025-02-20

-- Create slack_integrations table
CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id VARCHAR(50) NOT NULL,
  team_name VARCHAR(255),
  access_token TEXT NOT NULL,
  bot_user_id VARCHAR(50),
  default_channel_id VARCHAR(50),
  default_channel_name VARCHAR(255),
  notification_settings JSONB DEFAULT '{
    "deadline_reminders": true,
    "overdue_alerts": true,
    "compliance_alerts": true,
    "evidence_uploads": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Add comments for documentation
COMMENT ON TABLE slack_integrations IS 'Stores Slack workspace integrations and notification settings for companies';
COMMENT ON COLUMN slack_integrations.id IS 'Primary key';
COMMENT ON COLUMN slack_integrations.company_id IS 'Reference to the company that owns this integration';
COMMENT ON COLUMN slack_integrations.team_id IS 'Slack workspace/team ID';
COMMENT ON COLUMN slack_integrations.team_name IS 'Slack workspace/team name';
COMMENT ON COLUMN slack_integrations.access_token IS 'Encrypted Slack OAuth access token';
COMMENT ON COLUMN slack_integrations.bot_user_id IS 'Slack bot user ID';
COMMENT ON COLUMN slack_integrations.default_channel_id IS 'Default Slack channel ID for notifications';
COMMENT ON COLUMN slack_integrations.default_channel_name IS 'Default Slack channel name';
COMMENT ON COLUMN slack_integrations.notification_settings IS 'JSON object containing notification preferences';
COMMENT ON COLUMN slack_integrations.created_at IS 'Timestamp when integration was created';
COMMENT ON COLUMN slack_integrations.updated_at IS 'Timestamp when integration was last updated';

-- Create indexes
CREATE INDEX idx_slack_integrations_company_id ON slack_integrations(company_id);
CREATE INDEX idx_slack_integrations_team_id ON slack_integrations(team_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_slack_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_integrations_updated_at
  BEFORE UPDATE ON slack_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_integrations_updated_at();

-- Enable RLS
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own company's Slack integration
CREATE POLICY slack_integrations_select_policy ON slack_integrations
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Only admins can insert Slack integrations
CREATE POLICY slack_integrations_insert_policy ON slack_integrations
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT u.company_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Only admins can update their company's Slack integration
CREATE POLICY slack_integrations_update_policy ON slack_integrations
  FOR UPDATE
  USING (
    company_id IN (
      SELECT u.company_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Only admins can delete their company's Slack integration
CREATE POLICY slack_integrations_delete_policy ON slack_integrations
  FOR DELETE
  USING (
    company_id IN (
      SELECT u.company_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
