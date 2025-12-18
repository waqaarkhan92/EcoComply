-- Migration: Add notification system infrastructure
-- Description: This migration documents the notification system setup
-- Note: The notifications table already exists from 20250128000008_create_phase8_system_tables.sql
-- This migration adds indexes specifically optimized for the notification service API

-- The notifications table schema (already exists):
-- CREATE TABLE notifications (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
--   site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
--   recipient_email TEXT NOT NULL,
--   recipient_phone TEXT,
--   notification_type TEXT NOT NULL,
--   channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'IN_APP', 'PUSH')),
--   priority TEXT NOT NULL DEFAULT 'NORMAL',
--   subject TEXT NOT NULL,
--   body_html TEXT,
--   body_text TEXT NOT NULL,
--   entity_type TEXT,
--   entity_id UUID,
--   read_at TIMESTAMP WITH TIME ZONE,
--   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
-- );

-- Add optimized index for getting unread notifications for IN_APP channel
-- This supports the common query pattern in notification-service.ts
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_in_app
  ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND channel = 'IN_APP';

-- Add composite index for efficient cursor-based pagination
CREATE INDEX IF NOT EXISTS idx_notifications_user_channel_created
  ON notifications(user_id, channel, created_at DESC);

-- Comment on the notifications table to document the notification service
COMMENT ON TABLE notifications IS 'Stores user notifications for in-app, email, SMS, and push channels. Used by notification-service.ts for managing user notifications.';
