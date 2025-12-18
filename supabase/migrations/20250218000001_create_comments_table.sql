-- Migration: Create comments table for collaboration
-- Description: Enable users to comment on obligations, evidence, documents, and packs
-- Author: EcoComply Team
-- Date: 2025-02-18

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('obligation', 'evidence', 'document', 'pack')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[], -- Array of user IDs mentioned in the comment
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Create composite index for getting comments by entity with pagination
CREATE INDEX idx_comments_entity_created ON comments(entity_type, entity_id, created_at DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER set_updated_at_comments
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE comments IS 'Stores comments for collaboration on obligations, evidence, documents, and packs. Supports threaded replies and mentions.';

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view comments for entities they have access to
-- Note: This assumes users have access to entities through their company_id
-- Actual implementation should verify entity access based on entity_type
CREATE POLICY comments_select_policy ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = comments.user_id
      AND users.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can insert comments
CREATE POLICY comments_insert_policy ON comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- RLS Policy: Users can update their own comments
CREATE POLICY comments_update_policy ON comments
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- RLS Policy: Users can delete their own comments
CREATE POLICY comments_delete_policy ON comments
  FOR DELETE
  USING (
    auth.uid() = user_id
  );
