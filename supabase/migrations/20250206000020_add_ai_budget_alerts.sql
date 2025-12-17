-- Migration: 20250206000020_add_ai_budget_alerts.sql
-- Description: Add AI budget tracking and alert configuration
-- Author: Build System
-- Date: 2025-02-06

-- Add AI budget configuration columns to companies table
ALTER TABLE companies
ADD COLUMN ai_budget_monthly_usd DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN ai_budget_alert_threshold_percent INTEGER DEFAULT 80 CHECK (ai_budget_alert_threshold_percent > 0 AND ai_budget_alert_threshold_percent <= 100),
ADD COLUMN ai_budget_hard_limit BOOLEAN DEFAULT false,
ADD COLUMN ai_budget_alert_emails TEXT[] DEFAULT '{}';

COMMENT ON COLUMN companies.ai_budget_monthly_usd IS 'Monthly AI budget limit in USD (NULL = no limit)';
COMMENT ON COLUMN companies.ai_budget_alert_threshold_percent IS 'Percentage of budget at which to send alert (default 80%)';
COMMENT ON COLUMN companies.ai_budget_hard_limit IS 'If true, block AI operations when budget exceeded';
COMMENT ON COLUMN companies.ai_budget_alert_emails IS 'Additional email addresses to receive budget alerts';

-- Create AI usage tracking table for aggregated monthly costs
CREATE TABLE ai_usage_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- Format: YYYY-MM
    total_tokens_input BIGINT NOT NULL DEFAULT 0,
    total_tokens_output BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
    document_count INTEGER NOT NULL DEFAULT 0,
    extraction_count INTEGER NOT NULL DEFAULT 0,

    -- Cost breakdown by model
    cost_gpt4o_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
    cost_gpt4o_mini_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
    cost_other_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,

    -- Usage counts by operation type
    extractions_permit INTEGER NOT NULL DEFAULT 0,
    extractions_consent INTEGER NOT NULL DEFAULT 0,
    extractions_mcpd INTEGER NOT NULL DEFAULT 0,
    title_generations INTEGER NOT NULL DEFAULT 0,
    validations INTEGER NOT NULL DEFAULT 0,
    other_operations INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE(company_id, year_month)
);

CREATE INDEX idx_ai_usage_monthly_company ON ai_usage_monthly(company_id);
CREATE INDEX idx_ai_usage_monthly_year_month ON ai_usage_monthly(year_month);

COMMENT ON TABLE ai_usage_monthly IS 'Aggregated monthly AI usage and costs per company';

-- Create AI budget alerts table
CREATE TABLE ai_budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('THRESHOLD_WARNING', 'BUDGET_EXCEEDED', 'HARD_LIMIT_BLOCKED')),
    year_month TEXT NOT NULL,
    threshold_percent INTEGER NOT NULL,
    current_usage_usd DECIMAL(10, 4) NOT NULL,
    budget_limit_usd DECIMAL(10, 2) NOT NULL,
    usage_percent DECIMAL(5, 2) NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_budget_alerts_company ON ai_budget_alerts(company_id);
CREATE INDEX idx_ai_budget_alerts_year_month ON ai_budget_alerts(year_month);
CREATE INDEX idx_ai_budget_alerts_type ON ai_budget_alerts(alert_type);

COMMENT ON TABLE ai_budget_alerts IS 'Log of AI budget alerts sent to companies';

-- Create view for current month AI usage with budget status
CREATE OR REPLACE VIEW ai_budget_status AS
SELECT
    c.id as company_id,
    c.name as company_name,
    c.ai_budget_monthly_usd as budget_limit,
    c.ai_budget_alert_threshold_percent as alert_threshold,
    c.ai_budget_hard_limit,
    COALESCE(u.total_cost_usd, 0) as current_usage,
    COALESCE(u.total_tokens, 0) as total_tokens,
    COALESCE(u.document_count, 0) as documents_processed,
    CASE
        WHEN c.ai_budget_monthly_usd IS NULL THEN NULL
        WHEN c.ai_budget_monthly_usd = 0 THEN 100
        ELSE ROUND((COALESCE(u.total_cost_usd, 0) / c.ai_budget_monthly_usd * 100)::numeric, 2)
    END as usage_percent,
    CASE
        WHEN c.ai_budget_monthly_usd IS NULL THEN 'NO_LIMIT'
        WHEN COALESCE(u.total_cost_usd, 0) >= c.ai_budget_monthly_usd THEN 'EXCEEDED'
        WHEN COALESCE(u.total_cost_usd, 0) >= (c.ai_budget_monthly_usd * c.ai_budget_alert_threshold_percent / 100) THEN 'WARNING'
        ELSE 'OK'
    END as budget_status,
    u.year_month as current_month
FROM companies c
LEFT JOIN ai_usage_monthly u ON c.id = u.company_id
    AND u.year_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
WHERE c.is_active = true AND c.deleted_at IS NULL;

COMMENT ON VIEW ai_budget_status IS 'Current month AI budget status for all companies';

-- Function to update AI usage when document extraction completes
CREATE OR REPLACE FUNCTION update_ai_usage_on_extraction()
RETURNS TRIGGER AS $$
DECLARE
    v_year_month TEXT;
    v_cost DECIMAL(10, 4);
    v_model TEXT;
BEGIN
    -- Only process if extraction cost is set
    IF NEW.extraction_cost_usd IS NOT NULL AND NEW.extraction_cost_usd > 0 THEN
        v_year_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
        v_cost := NEW.extraction_cost_usd;
        v_model := COALESCE(NEW.extraction_model, 'other');

        -- Upsert into ai_usage_monthly
        INSERT INTO ai_usage_monthly (
            company_id,
            year_month,
            total_tokens_input,
            total_tokens_output,
            total_tokens,
            total_cost_usd,
            document_count,
            extraction_count,
            cost_gpt4o_usd,
            cost_gpt4o_mini_usd,
            cost_other_usd,
            extractions_permit,
            extractions_consent,
            extractions_mcpd
        )
        VALUES (
            NEW.company_id,
            v_year_month,
            COALESCE(NEW.extraction_tokens_input, 0),
            COALESCE(NEW.extraction_tokens_output, 0),
            COALESCE(NEW.extraction_tokens_total, 0),
            v_cost,
            1,
            1,
            CASE WHEN v_model = 'gpt-4o' THEN v_cost ELSE 0 END,
            CASE WHEN v_model = 'gpt-4o-mini' THEN v_cost ELSE 0 END,
            CASE WHEN v_model NOT IN ('gpt-4o', 'gpt-4o-mini') THEN v_cost ELSE 0 END,
            CASE WHEN NEW.document_type = 'PERMIT' THEN 1 ELSE 0 END,
            CASE WHEN NEW.document_type = 'CONSENT' THEN 1 ELSE 0 END,
            CASE WHEN NEW.document_type = 'MCPD_REGISTRATION' THEN 1 ELSE 0 END
        )
        ON CONFLICT (company_id, year_month)
        DO UPDATE SET
            total_tokens_input = ai_usage_monthly.total_tokens_input + COALESCE(NEW.extraction_tokens_input, 0),
            total_tokens_output = ai_usage_monthly.total_tokens_output + COALESCE(NEW.extraction_tokens_output, 0),
            total_tokens = ai_usage_monthly.total_tokens + COALESCE(NEW.extraction_tokens_total, 0),
            total_cost_usd = ai_usage_monthly.total_cost_usd + v_cost,
            document_count = ai_usage_monthly.document_count + 1,
            extraction_count = ai_usage_monthly.extraction_count + 1,
            cost_gpt4o_usd = ai_usage_monthly.cost_gpt4o_usd + CASE WHEN v_model = 'gpt-4o' THEN v_cost ELSE 0 END,
            cost_gpt4o_mini_usd = ai_usage_monthly.cost_gpt4o_mini_usd + CASE WHEN v_model = 'gpt-4o-mini' THEN v_cost ELSE 0 END,
            cost_other_usd = ai_usage_monthly.cost_other_usd + CASE WHEN v_model NOT IN ('gpt-4o', 'gpt-4o-mini') THEN v_cost ELSE 0 END,
            extractions_permit = ai_usage_monthly.extractions_permit + CASE WHEN NEW.document_type = 'PERMIT' THEN 1 ELSE 0 END,
            extractions_consent = ai_usage_monthly.extractions_consent + CASE WHEN NEW.document_type = 'CONSENT' THEN 1 ELSE 0 END,
            extractions_mcpd = ai_usage_monthly.extractions_mcpd + CASE WHEN NEW.document_type = 'MCPD_REGISTRATION' THEN 1 ELSE 0 END,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on documents table
DROP TRIGGER IF EXISTS trigger_update_ai_usage ON documents;
CREATE TRIGGER trigger_update_ai_usage
    AFTER INSERT OR UPDATE OF extraction_cost_usd
    ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_on_extraction();

-- RLS Policies
ALTER TABLE ai_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_alerts ENABLE ROW LEVEL SECURITY;

-- ai_usage_monthly policies
CREATE POLICY "ai_usage_monthly_select_own_company" ON ai_usage_monthly
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "ai_usage_monthly_admin_insert" ON ai_usage_monthly
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            WHERE u.id = auth.uid()
            AND u.company_id = ai_usage_monthly.company_id
            AND ur.role IN ('OWNER', 'ADMIN')
        )
    );

-- ai_budget_alerts policies
CREATE POLICY "ai_budget_alerts_select_own_company" ON ai_budget_alerts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "ai_budget_alerts_update_acknowledge" ON ai_budget_alerts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    ) WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- RPC function to record AI usage (called from service layer)
CREATE OR REPLACE FUNCTION record_ai_usage(
    p_company_id UUID,
    p_year_month TEXT,
    p_input_tokens BIGINT,
    p_output_tokens BIGINT,
    p_cost_usd DECIMAL(10, 4),
    p_model TEXT,
    p_operation_type TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_usage_monthly (
        company_id,
        year_month,
        total_tokens_input,
        total_tokens_output,
        total_tokens,
        total_cost_usd,
        cost_gpt4o_usd,
        cost_gpt4o_mini_usd,
        cost_other_usd,
        title_generations,
        validations,
        other_operations
    )
    VALUES (
        p_company_id,
        p_year_month,
        p_input_tokens,
        p_output_tokens,
        p_input_tokens + p_output_tokens,
        p_cost_usd,
        CASE WHEN p_model = 'gpt-4o' THEN p_cost_usd ELSE 0 END,
        CASE WHEN p_model = 'gpt-4o-mini' THEN p_cost_usd ELSE 0 END,
        CASE WHEN p_model NOT IN ('gpt-4o', 'gpt-4o-mini') THEN p_cost_usd ELSE 0 END,
        CASE WHEN p_operation_type = 'title_generation' THEN 1 ELSE 0 END,
        CASE WHEN p_operation_type = 'validation' THEN 1 ELSE 0 END,
        CASE WHEN p_operation_type = 'other' THEN 1 ELSE 0 END
    )
    ON CONFLICT (company_id, year_month)
    DO UPDATE SET
        total_tokens_input = ai_usage_monthly.total_tokens_input + p_input_tokens,
        total_tokens_output = ai_usage_monthly.total_tokens_output + p_output_tokens,
        total_tokens = ai_usage_monthly.total_tokens + p_input_tokens + p_output_tokens,
        total_cost_usd = ai_usage_monthly.total_cost_usd + p_cost_usd,
        cost_gpt4o_usd = ai_usage_monthly.cost_gpt4o_usd + CASE WHEN p_model = 'gpt-4o' THEN p_cost_usd ELSE 0 END,
        cost_gpt4o_mini_usd = ai_usage_monthly.cost_gpt4o_mini_usd + CASE WHEN p_model = 'gpt-4o-mini' THEN p_cost_usd ELSE 0 END,
        cost_other_usd = ai_usage_monthly.cost_other_usd + CASE WHEN p_model NOT IN ('gpt-4o', 'gpt-4o-mini') THEN p_cost_usd ELSE 0 END,
        title_generations = ai_usage_monthly.title_generations + CASE WHEN p_operation_type = 'title_generation' THEN 1 ELSE 0 END,
        validations = ai_usage_monthly.validations + CASE WHEN p_operation_type = 'validation' THEN 1 ELSE 0 END,
        other_operations = ai_usage_monthly.other_operations + CASE WHEN p_operation_type = 'other' THEN 1 ELSE 0 END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on RPC function
GRANT EXECUTE ON FUNCTION record_ai_usage TO authenticated;

-- Grant permissions
GRANT SELECT ON ai_budget_status TO authenticated;
