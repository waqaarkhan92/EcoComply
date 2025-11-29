-- Create webhooks table for webhook management
-- This table stores webhook subscriptions for external integrations

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL, -- Encrypted webhook secret for HMAC signature
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    last_delivery_status TEXT CHECK (last_delivery_status IN ('SUCCESS', 'FAILED', 'PENDING')),
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see webhooks for their company
CREATE POLICY webhooks_company_isolation ON webhooks
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

COMMENT ON TABLE webhooks IS 'Stores webhook subscriptions for external integrations';
COMMENT ON COLUMN webhooks.events IS 'Array of webhook event types: document.extracted, obligation.deadline_approaching, etc.';
COMMENT ON COLUMN webhooks.secret IS 'HMAC secret key for webhook signature verification';

