-- Migration: Create user_onboarding_progress table
-- Purpose: Track onboarding progress for users

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flow_type TEXT NOT NULL 
        CHECK (flow_type IN ('FIRST_TIME', 'PERMIT_UPLOAD', 'EVIDENCE_CAPTURE', 'MULTI_SITE', 'MODULE_ACTIVATION')),
    step TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped BOOLEAN NOT NULL DEFAULT false,
    skipped_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX idx_user_onboarding_progress_flow_type ON user_onboarding_progress(flow_type);
CREATE INDEX idx_user_onboarding_progress_step ON user_onboarding_progress(step);
CREATE INDEX idx_user_onboarding_progress_user_flow ON user_onboarding_progress(user_id, flow_type);

-- Add onboarding_completed_at to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own onboarding progress
CREATE POLICY "Users can view own onboarding progress"
    ON user_onboarding_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own onboarding progress
CREATE POLICY "Users can insert own onboarding progress"
    ON user_onboarding_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own onboarding progress
CREATE POLICY "Users can update own onboarding progress"
    ON user_onboarding_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

