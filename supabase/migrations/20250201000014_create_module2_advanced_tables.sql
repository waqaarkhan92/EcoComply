-- Migration: 20250201000014_create_module2_advanced_tables.sql
-- Description: Create Module 2 advanced tables (reconciliation_rules, breach_likelihood_scores, predictive_breach_alerts, exposure_calculations)
-- Author: Build System
-- Date: 2025-02-01
-- Order: After Module 2 core tables (parameters, lab_results, exceedances, discharge_volumes)

-- 5.9 reconciliation_rules
CREATE TABLE reconciliation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL 
        CHECK (rule_type IN ('CONCENTRATION_VOLUME', 'MONTHLY_AVERAGE', 'PEAK_CONCENTRATION', 'CUSTOM')),
    calculation_formula TEXT NOT NULL,
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reconciliation_rules_parameter_id ON reconciliation_rules(parameter_id);
CREATE INDEX idx_reconciliation_rules_document_id ON reconciliation_rules(document_id);
CREATE INDEX idx_reconciliation_rules_company_id ON reconciliation_rules(company_id);
CREATE INDEX idx_reconciliation_rules_site_id ON reconciliation_rules(site_id);
CREATE INDEX idx_reconciliation_rules_rule_type ON reconciliation_rules(rule_type);
CREATE INDEX idx_reconciliation_rules_is_active ON reconciliation_rules(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_reconciliation_rules_updated_at
    BEFORE UPDATE ON reconciliation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5.10 breach_likelihood_scores
CREATE TABLE breach_likelihood_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    breach_likelihood_score DECIMAL(5, 2) NOT NULL 
        CHECK (breach_likelihood_score >= 0 AND breach_likelihood_score <= 100),
    risk_level TEXT NOT NULL 
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    exposure_value DECIMAL(12, 4),
    calculation_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breach_likelihood_scores_parameter_id ON breach_likelihood_scores(parameter_id);
CREATE INDEX idx_breach_likelihood_scores_company_id ON breach_likelihood_scores(company_id);
CREATE INDEX idx_breach_likelihood_scores_site_id ON breach_likelihood_scores(site_id);
CREATE INDEX idx_breach_likelihood_scores_calculation_date ON breach_likelihood_scores(calculation_date);
CREATE INDEX idx_breach_likelihood_scores_risk_level ON breach_likelihood_scores(risk_level);

-- Add updated_at trigger
CREATE TRIGGER update_breach_likelihood_scores_updated_at
    BEFORE UPDATE ON breach_likelihood_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5.11 predictive_breach_alerts
CREATE TABLE predictive_breach_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    breach_likelihood_score_id UUID REFERENCES breach_likelihood_scores(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    alert_date DATE NOT NULL,
    predicted_breach_date DATE,
    risk_level TEXT NOT NULL 
        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    alert_message TEXT NOT NULL,
    recommended_actions TEXT[] NOT NULL DEFAULT '{}',
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_predictive_breach_alerts_parameter_id ON predictive_breach_alerts(parameter_id);
CREATE INDEX idx_predictive_breach_alerts_company_id ON predictive_breach_alerts(company_id);
CREATE INDEX idx_predictive_breach_alerts_site_id ON predictive_breach_alerts(site_id);
CREATE INDEX idx_predictive_breach_alerts_alert_date ON predictive_breach_alerts(alert_date);
CREATE INDEX idx_predictive_breach_alerts_risk_level ON predictive_breach_alerts(risk_level);
CREATE INDEX idx_predictive_breach_alerts_is_acknowledged ON predictive_breach_alerts(is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX idx_predictive_breach_alerts_is_resolved ON predictive_breach_alerts(is_resolved) WHERE is_resolved = false;

-- Add updated_at trigger
CREATE TRIGGER update_predictive_breach_alerts_updated_at
    BEFORE UPDATE ON predictive_breach_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5.12 exposure_calculations
CREATE TABLE exposure_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
    discharge_volume_id UUID REFERENCES discharge_volumes(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    concentration_value DECIMAL(12, 4) NOT NULL,
    volume_value DECIMAL(12, 4) NOT NULL,
    exposure_value DECIMAL(12, 4) NOT NULL,
    limit_value DECIMAL(12, 4) NOT NULL,
    percentage_of_limit DECIMAL(6, 2) NOT NULL,
    calculation_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exposure_calculations_parameter_id ON exposure_calculations(parameter_id);
CREATE INDEX idx_exposure_calculations_lab_result_id ON exposure_calculations(lab_result_id);
CREATE INDEX idx_exposure_calculations_discharge_volume_id ON exposure_calculations(discharge_volume_id);
CREATE INDEX idx_exposure_calculations_company_id ON exposure_calculations(company_id);
CREATE INDEX idx_exposure_calculations_site_id ON exposure_calculations(site_id);
CREATE INDEX idx_exposure_calculations_calculation_date ON exposure_calculations(calculation_date);
CREATE INDEX idx_exposure_calculations_percentage_of_limit ON exposure_calculations(percentage_of_limit);

-- Add updated_at trigger
CREATE TRIGGER update_exposure_calculations_updated_at
    BEFORE UPDATE ON exposure_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_likelihood_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_breach_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exposure_calculations ENABLE ROW LEVEL SECURITY;

