-- Enhanced Features V2 Migration
-- Creates tables for: Evidence Gaps, Content Embeddings, Risk Scores, Cost Tracking,
-- Activity Feed, Calendar Tokens, Evidence Suggestions, Completion Metrics, Webhook Deliveries

-- ============================================
-- 1. EVIDENCE GAPS TABLE
-- Tracks obligations with upcoming deadlines but missing evidence
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    deadline_id UUID REFERENCES deadlines(id) ON DELETE SET NULL,
    gap_type TEXT NOT NULL CHECK (gap_type IN ('NO_EVIDENCE', 'EXPIRED_EVIDENCE', 'INSUFFICIENT_EVIDENCE')),
    days_until_deadline INTEGER NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    dismiss_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_gaps_company ON evidence_gaps(company_id);
CREATE INDEX idx_evidence_gaps_site ON evidence_gaps(site_id);
CREATE INDEX idx_evidence_gaps_obligation ON evidence_gaps(obligation_id);
CREATE INDEX idx_evidence_gaps_unresolved ON evidence_gaps(company_id) WHERE resolved_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX idx_evidence_gaps_severity ON evidence_gaps(severity) WHERE resolved_at IS NULL;

-- ============================================
-- 2. CONTENT EMBEDDINGS TABLE
-- Stores OpenAI embeddings for semantic search
-- ============================================
-- Note: Requires pgvector extension - enable if not already enabled
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'vector extension not available, skipping embedding table';
END $$;

CREATE TABLE IF NOT EXISTS content_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('obligation', 'document', 'evidence', 'site')),
    entity_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_embeddings_company ON content_embeddings(company_id);
CREATE INDEX idx_embeddings_entity ON content_embeddings(entity_type, entity_id);
-- Vector index for similarity search (using ivfflat for better performance)
CREATE INDEX idx_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- 3. COMPLIANCE RISK SCORES TABLE
-- Stores calculated risk scores for sites and obligations
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL CHECK (score_type IN ('SITE', 'OBLIGATION', 'COMPANY')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    factors JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_company ON compliance_risk_scores(company_id);
CREATE INDEX idx_risk_scores_site ON compliance_risk_scores(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_risk_scores_obligation ON compliance_risk_scores(obligation_id) WHERE obligation_id IS NOT NULL;
CREATE INDEX idx_risk_scores_valid ON compliance_risk_scores(valid_until) WHERE valid_until > NOW();

-- Risk score history for trending
CREATE TABLE IF NOT EXISTS compliance_risk_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    score_type TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_history_company ON compliance_risk_history(company_id, recorded_at DESC);
CREATE INDEX idx_risk_history_site ON compliance_risk_history(site_id, recorded_at DESC) WHERE site_id IS NOT NULL;

-- ============================================
-- 4. OBLIGATION COSTS TABLE
-- Tracks costs associated with compliance activities
-- ============================================
CREATE TABLE IF NOT EXISTS obligation_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    cost_type TEXT NOT NULL CHECK (cost_type IN ('LABOR', 'CONTRACTOR', 'EQUIPMENT', 'LAB_FEES', 'CONSULTING', 'SOFTWARE', 'OTHER')),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    description TEXT,
    incurred_date DATE NOT NULL,
    compliance_period_start DATE,
    compliance_period_end DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_obligation_costs_company ON obligation_costs(company_id);
CREATE INDEX idx_obligation_costs_obligation ON obligation_costs(obligation_id);
CREATE INDEX idx_obligation_costs_site ON obligation_costs(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_obligation_costs_date ON obligation_costs(incurred_date);

-- Compliance budgets
CREATE TABLE IF NOT EXISTS compliance_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    budget_type TEXT NOT NULL CHECK (budget_type IN ('COMPANY', 'SITE', 'OBLIGATION')),
    annual_budget DECIMAL(12, 2) NOT NULL,
    fiscal_year INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, site_id, obligation_id, fiscal_year)
);

CREATE INDEX idx_compliance_budgets_company ON compliance_budgets(company_id);
CREATE INDEX idx_compliance_budgets_site ON compliance_budgets(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_compliance_budgets_year ON compliance_budgets(fiscal_year);

-- ============================================
-- 5. ACTIVITY FEED TABLE
-- Real-time activity tracking for collaboration
-- ============================================
CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    entity_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_company ON activity_feed(company_id, created_at DESC);
CREATE INDEX idx_activity_feed_site ON activity_feed(site_id, created_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

-- Auto-cleanup trigger for old activities (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activities() RETURNS trigger AS $$
BEGIN
    DELETE FROM activity_feed WHERE created_at < NOW() - INTERVAL '90 days';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup weekly (triggered by any insert)
DROP TRIGGER IF EXISTS trigger_cleanup_activities ON activity_feed;
CREATE TRIGGER trigger_cleanup_activities
    AFTER INSERT ON activity_feed
    FOR EACH STATEMENT
    WHEN (random() < 0.01) -- 1% chance to run on each insert batch
    EXECUTE FUNCTION cleanup_old_activities();

-- ============================================
-- 6. CALENDAR TOKENS TABLE
-- Stores tokens for iCal feed access
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL CHECK (token_type IN ('USER', 'SITE', 'COMPANY')),
    name TEXT,
    expires_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_tokens_token ON calendar_tokens(token);
CREATE INDEX idx_calendar_tokens_user ON calendar_tokens(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_calendar_tokens_site ON calendar_tokens(site_id) WHERE site_id IS NOT NULL;

-- ============================================
-- 7. EVIDENCE SUGGESTIONS TABLE
-- Caches AI-generated evidence suggestions
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    suggestions JSONB NOT NULL,
    required_evidence JSONB DEFAULT '[]',
    recommended_evidence JSONB DEFAULT '[]',
    specific_requirements JSONB DEFAULT '[]',
    confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    model_used TEXT DEFAULT 'gpt-4o',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_evidence_suggestions_obligation ON evidence_suggestions(obligation_id);
CREATE INDEX idx_evidence_suggestions_company ON evidence_suggestions(company_id);
CREATE INDEX idx_evidence_suggestions_expires ON evidence_suggestions(expires_at);

-- ============================================
-- 8. OBLIGATION COMPLETION METRICS TABLE
-- Tracks completion times for resource forecasting
-- ============================================
CREATE TABLE IF NOT EXISTS obligation_completion_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    deadline_id UUID REFERENCES deadlines(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ NOT NULL,
    time_to_complete_hours DECIMAL(8, 2),
    was_late BOOLEAN NOT NULL DEFAULT FALSE,
    days_late INTEGER DEFAULT 0,
    complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 5),
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_completion_metrics_company ON obligation_completion_metrics(company_id);
CREATE INDEX idx_completion_metrics_obligation ON obligation_completion_metrics(obligation_id);
CREATE INDEX idx_completion_metrics_site ON obligation_completion_metrics(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX idx_completion_metrics_completed ON obligation_completion_metrics(completed_at DESC);

-- ============================================
-- 9. WEBHOOK DELIVERIES TABLE
-- Tracks webhook delivery attempts and status
-- ============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type, created_at DESC);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(next_retry_at) WHERE delivered_at IS NULL AND failed_at IS NULL;

-- ============================================
-- 10. UPDATE webhooks table with additional fields
-- ============================================
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}';
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 3;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS timeout_ms INTEGER NOT NULL DEFAULT 30000;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================

-- Evidence Gaps RLS
ALTER TABLE evidence_gaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_gaps_company_isolation ON evidence_gaps
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Content Embeddings RLS
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_embeddings_company_isolation ON content_embeddings
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Compliance Risk Scores RLS
ALTER TABLE compliance_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_risk_scores_company_isolation ON compliance_risk_scores
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Compliance Risk History RLS
ALTER TABLE compliance_risk_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_risk_history_company_isolation ON compliance_risk_history
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Obligation Costs RLS
ALTER TABLE obligation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY obligation_costs_company_isolation ON obligation_costs
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Compliance Budgets RLS
ALTER TABLE compliance_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_budgets_company_isolation ON compliance_budgets
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Activity Feed RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_feed_company_isolation ON activity_feed
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Calendar Tokens RLS
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_tokens_company_isolation ON calendar_tokens
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Evidence Suggestions RLS
ALTER TABLE evidence_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY evidence_suggestions_company_isolation ON evidence_suggestions
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Obligation Completion Metrics RLS
ALTER TABLE obligation_completion_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY obligation_completion_metrics_company_isolation ON obligation_completion_metrics
    FOR ALL USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Webhook Deliveries RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_deliveries_company_isolation ON webhook_deliveries
    FOR ALL USING (
        webhook_id IN (
            SELECT id FROM webhooks WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE evidence_gaps IS 'Tracks obligations with upcoming deadlines but missing or insufficient evidence';
COMMENT ON TABLE content_embeddings IS 'Stores OpenAI embeddings for semantic/natural language search';
COMMENT ON TABLE compliance_risk_scores IS 'Calculated risk scores for sites and obligations based on historical patterns';
COMMENT ON TABLE compliance_risk_history IS 'Historical risk score data for trend analysis';
COMMENT ON TABLE obligation_costs IS 'Cost entries associated with compliance activities';
COMMENT ON TABLE compliance_budgets IS 'Annual compliance budgets at company, site, or obligation level';
COMMENT ON TABLE activity_feed IS 'Real-time activity tracking for team collaboration and awareness';
COMMENT ON TABLE calendar_tokens IS 'Access tokens for iCal feed subscriptions';
COMMENT ON TABLE evidence_suggestions IS 'AI-generated evidence requirement suggestions cached per obligation';
COMMENT ON TABLE obligation_completion_metrics IS 'Completion time metrics for resource forecasting';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts, status, and retry tracking';
