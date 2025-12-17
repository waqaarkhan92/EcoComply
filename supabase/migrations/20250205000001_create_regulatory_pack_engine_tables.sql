-- Migration: 20250205000001_create_regulatory_pack_engine_tables.sql
-- Description: Create EA Regulatory Data Model tables for Pack Engine
-- Based on: Phase 4/5 Build Outputs - Canonical Data Model v2.0
-- Author: EcoComply Build System
-- Date: 2025-02-05

-- ============================================================================
-- SECTION 1: TENANT CONFIGURATION (First-Year Adoption Mode - Safeguard 1)
-- ============================================================================

-- Adoption mode for tenant onboarding
ALTER TABLE companies ADD COLUMN IF NOT EXISTS adoption_mode VARCHAR(20) DEFAULT 'FIRST_YEAR'
    CHECK (adoption_mode IN ('FIRST_YEAR', 'STANDARD'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS adoption_mode_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_date DATE DEFAULT CURRENT_DATE;

-- Auto-calculate adoption mode expiry trigger
CREATE OR REPLACE FUNCTION set_company_adoption_mode_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adoption_mode = 'FIRST_YEAR' AND NEW.adoption_mode_expiry IS NULL THEN
        NEW.adoption_mode_expiry := COALESCE(NEW.onboarding_date, CURRENT_DATE) + INTERVAL '12 months';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_company_adoption_expiry ON companies;
CREATE TRIGGER trigger_set_company_adoption_expiry
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_company_adoption_mode_expiry();

-- First-Year Adoption Mode: Relaxed rules configuration
CREATE TABLE IF NOT EXISTS company_relaxed_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    rule_id VARCHAR(20) NOT NULL,
    standard_lookback_months INTEGER,
    relaxed_lookback_start DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, rule_id)
);

CREATE INDEX IF NOT EXISTS idx_company_relaxed_rules_company ON company_relaxed_rules(company_id);

-- ============================================================================
-- SECTION 2: EA PERMIT CONDITIONS EXTENSION (ELV - Safeguard 3)
-- ============================================================================

-- Add ELV-specific fields to existing permit conditions (via documents/obligations)
-- Since obligations already exist, we add ELV tracking to a new table

CREATE TABLE IF NOT EXISTS elv_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- ELV identification
    condition_reference VARCHAR(100) NOT NULL,
    is_amenity_condition BOOLEAN NOT NULL DEFAULT FALSE,

    -- ELV parameters (Safeguard 3: Permit-Verbatim)
    elv_parameter VARCHAR(100) NOT NULL,
    elv_value DECIMAL(15,6) NOT NULL,
    elv_unit VARCHAR(50) NOT NULL,
    elv_reference_conditions VARCHAR(255),
    elv_averaging_period VARCHAR(100),
    elv_verbatim_text TEXT NOT NULL,

    -- Monitoring requirements
    monitoring_frequency VARCHAR(50),
    mcerts_required BOOLEAN NOT NULL DEFAULT FALSE,
    next_monitoring_due DATE,

    -- Compliance deadlines (MCPD)
    compliance_deadline DATE,
    plant_thermal_input_mw DECIMAL(10,2),
    plant_classification VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_elv_conditions_obligation ON elv_conditions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_elv_conditions_site ON elv_conditions(site_id);
CREATE INDEX IF NOT EXISTS idx_elv_conditions_company ON elv_conditions(company_id);
CREATE INDEX IF NOT EXISTS idx_elv_conditions_parameter ON elv_conditions(elv_parameter);
CREATE INDEX IF NOT EXISTS idx_elv_conditions_next_monitoring ON elv_conditions(next_monitoring_due);

-- ELV condition validation trigger (Safeguard 3)
CREATE OR REPLACE FUNCTION validate_elv_condition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.elv_verbatim_text IS NULL OR NEW.elv_verbatim_text = '' THEN
        RAISE EXCEPTION 'ELV conditions must include verbatim text from permit';
    END IF;
    IF NEW.elv_value IS NULL THEN
        RAISE EXCEPTION 'ELV conditions must include the limit value';
    END IF;
    IF NEW.elv_unit IS NULL OR NEW.elv_unit = '' THEN
        RAISE EXCEPTION 'ELV conditions must include the unit of measurement';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_elv ON elv_conditions;
CREATE TRIGGER trigger_validate_elv
    BEFORE INSERT OR UPDATE ON elv_conditions
    FOR EACH ROW EXECUTE FUNCTION validate_elv_condition();

-- ============================================================================
-- SECTION 3: COMPLIANCE CLASSIFICATION SCHEME (CCS)
-- ============================================================================

-- Risk category definitions with exact EA wording
CREATE TABLE IF NOT EXISTS ccs_risk_categories (
    category VARCHAR(1) PRIMARY KEY CHECK (category IN ('1', '2', '3', '4')),
    points DECIMAL(5,1) NOT NULL,
    ea_definition TEXT NOT NULL,
    ea_source VARCHAR(255) NOT NULL
);

-- Insert EA-defined risk categories (exact wording)
INSERT INTO ccs_risk_categories (category, points, ea_definition, ea_source) VALUES
('1', 60, 'major impact on human health, quality of life or the environment', 'Source #3: Assessing and Scoring Environmental Permit Compliance'),
('2', 31, 'significant impact on human health, quality of life or the environment', 'Source #3: Assessing and Scoring Environmental Permit Compliance'),
('3', 4, 'minor impact on human health, quality of life or the environment', 'Source #3: Assessing and Scoring Environmental Permit Compliance'),
('4', 0.1, 'no impact on human health, quality of life or the environment', 'Source #3: Assessing and Scoring Environmental Permit Compliance')
ON CONFLICT (category) DO NOTHING;

-- Compliance band definitions
CREATE TABLE IF NOT EXISTS ccs_compliance_bands (
    band VARCHAR(1) PRIMARY KEY CHECK (band IN ('A', 'B', 'C', 'D', 'E', 'F')),
    points_min DECIMAL(6,1) NOT NULL,
    points_max DECIMAL(6,1),
    subsistence_multiplier DECIMAL(4,2) NOT NULL,
    ea_interpretation TEXT NOT NULL
);

INSERT INTO ccs_compliance_bands (band, points_min, points_max, subsistence_multiplier, ea_interpretation) VALUES
('A', 0, 0, 0.95, 'Full compliance'),
('B', 0.1, 10, 1.00, 'Acceptable compliance'),
('C', 10.1, 30, 1.10, 'must improve in order to achieve permit compliance'),
('D', 30.1, 60, 1.25, 'must improve in order to achieve permit compliance'),
('E', 60.1, 149.9, 1.50, 'must significantly improve in order to achieve permit compliance'),
('F', 150, NULL, 3.00, 'must significantly improve...more likely to have permit revoked')
ON CONFLICT (band) DO NOTHING;

-- CCS assessments per permit per year
CREATE TABLE IF NOT EXISTS ccs_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    compliance_year INTEGER NOT NULL,
    assessment_date DATE NOT NULL,

    -- Scoring
    total_score DECIMAL(6,1) NOT NULL DEFAULT 0,
    compliance_band VARCHAR(1) REFERENCES ccs_compliance_bands(band),

    -- Assessment details
    assessed_by VARCHAR(50) CHECK (assessed_by IN ('EA_OFFICER', 'SELF_ASSESSMENT', 'THIRD_PARTY_AUDITOR')),
    car_reference VARCHAR(100),
    car_issued_date DATE,
    appeal_deadline DATE,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(site_id, compliance_year)
);

CREATE INDEX IF NOT EXISTS idx_ccs_assessments_site ON ccs_assessments(site_id);
CREATE INDEX IF NOT EXISTS idx_ccs_assessments_company ON ccs_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_ccs_assessments_year ON ccs_assessments(compliance_year);
CREATE INDEX IF NOT EXISTS idx_ccs_assessments_band ON ccs_assessments(compliance_band);

-- Auto-calculate compliance band from score
CREATE OR REPLACE FUNCTION calculate_ccs_band()
RETURNS TRIGGER AS $$
BEGIN
    SELECT band INTO NEW.compliance_band
    FROM ccs_compliance_bands
    WHERE NEW.total_score >= points_min
      AND (points_max IS NULL OR NEW.total_score <= points_max)
    ORDER BY points_min DESC
    LIMIT 1;

    -- Set appeal deadline (28 days from CAR issue)
    IF NEW.car_issued_date IS NOT NULL AND NEW.appeal_deadline IS NULL THEN
        NEW.appeal_deadline := NEW.car_issued_date + INTERVAL '28 days';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_ccs_band ON ccs_assessments;
CREATE TRIGGER trigger_calculate_ccs_band
    BEFORE INSERT OR UPDATE ON ccs_assessments
    FOR EACH ROW EXECUTE FUNCTION calculate_ccs_band();

-- Individual non-compliance records
CREATE TABLE IF NOT EXISTS ccs_non_compliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ccs_assessment_id UUID NOT NULL REFERENCES ccs_assessments(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    elv_condition_id UUID REFERENCES elv_conditions(id) ON DELETE SET NULL,

    condition_reference VARCHAR(100) NOT NULL,
    risk_category VARCHAR(1) NOT NULL REFERENCES ccs_risk_categories(category),
    ccs_score DECIMAL(5,1) NOT NULL,

    breach_description TEXT,
    breach_start_date DATE,
    breach_duration_days INTEGER,
    is_amenity_breach BOOLEAN NOT NULL DEFAULT FALSE,

    -- Evidence
    evidence_ids UUID[] DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccs_non_compliances_assessment ON ccs_non_compliances(ccs_assessment_id);
CREATE INDEX IF NOT EXISTS idx_ccs_non_compliances_obligation ON ccs_non_compliances(obligation_id);
CREATE INDEX IF NOT EXISTS idx_ccs_non_compliances_category ON ccs_non_compliances(risk_category);

-- Auto-set score from risk category
CREATE OR REPLACE FUNCTION set_non_compliance_score()
RETURNS TRIGGER AS $$
BEGIN
    SELECT points INTO NEW.ccs_score
    FROM ccs_risk_categories
    WHERE category = NEW.risk_category;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_non_compliance_score ON ccs_non_compliances;
CREATE TRIGGER trigger_set_non_compliance_score
    BEFORE INSERT OR UPDATE ON ccs_non_compliances
    FOR EACH ROW EXECUTE FUNCTION set_non_compliance_score();

-- ============================================================================
-- SECTION 4: COMPLIANCE ASSESSMENT REPORTS (CAR)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_assessment_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    ccs_assessment_id UUID REFERENCES ccs_assessments(id) ON DELETE SET NULL,

    car_reference VARCHAR(100) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN (
        'INSPECTION', 'AUDIT', 'DESK_ASSESSMENT', 'MONITORING_CHECK', 'OMA'
    )),
    assessment_date DATE NOT NULL,

    inspector_name VARCHAR(255),
    findings TEXT,
    total_score DECIMAL(6,1) NOT NULL DEFAULT 0,

    issued_date DATE,
    public_register_date DATE,
    appeal_deadline DATE,
    appeal_submitted BOOLEAN DEFAULT FALSE,
    appeal_outcome VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_site ON compliance_assessment_reports(site_id);
CREATE INDEX IF NOT EXISTS idx_cars_company ON compliance_assessment_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_cars_date ON compliance_assessment_reports(assessment_date);
CREATE INDEX IF NOT EXISTS idx_cars_type ON compliance_assessment_reports(assessment_type);

-- ============================================================================
-- SECTION 5: CORRECTIVE & PREVENTIVE ACTIONS (CAPA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_capas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id UUID NOT NULL REFERENCES compliance_assessment_reports(id) ON DELETE CASCADE,
    obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
    ccs_non_compliance_id UUID REFERENCES ccs_non_compliances(id) ON DELETE SET NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,

    responsible_person VARCHAR(255),
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    target_date DATE,
    completion_date DATE,

    verification_method TEXT,
    verification_date DATE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'IN_PROGRESS', 'CLOSED', 'VERIFIED'
    )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_capas_car ON regulatory_capas(car_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_capas_obligation ON regulatory_capas(obligation_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_capas_site ON regulatory_capas(site_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_capas_status ON regulatory_capas(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_capas_target ON regulatory_capas(target_date) WHERE status IN ('OPEN', 'IN_PROGRESS');

-- ============================================================================
-- SECTION 6: INCIDENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

    incident_date TIMESTAMPTZ NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'POLLUTION', 'FIRE', 'EQUIPMENT_FAILURE', 'SPILL',
        'ODOUR_COMPLAINT', 'NOISE_COMPLAINT', 'FLOODING', 'VANDALISM', 'OTHER'
    )),

    description TEXT NOT NULL,
    immediate_actions TEXT,

    regulatory_notification BOOLEAN NOT NULL DEFAULT FALSE,
    notification_date TIMESTAMPTZ,
    notification_reference VARCHAR(100),

    linked_car_id UUID REFERENCES compliance_assessment_reports(id) ON DELETE SET NULL,
    linked_capa_id UUID REFERENCES regulatory_capas(id) ON DELETE SET NULL,

    risk_category VARCHAR(1) REFERENCES ccs_risk_categories(category),

    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'
    )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_incidents_site ON regulatory_incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_incidents_company ON regulatory_incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_incidents_date ON regulatory_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_regulatory_incidents_type ON regulatory_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_incidents_status ON regulatory_incidents(status);

-- ============================================================================
-- SECTION 7: PACK GENERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulatory_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    pack_type VARCHAR(50) NOT NULL CHECK (pack_type IN (
        'REGULATOR_PACK', 'INTERNAL_AUDIT_PACK', 'BOARD_PACK', 'TENDER_PACK'
    )),

    site_ids UUID[] NOT NULL,
    document_ids UUID[] DEFAULT '{}',

    generation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'GENERATING', 'READY', 'FAILED', 'EXPIRED'
    )),

    -- Configuration (includes safeguard settings)
    configuration JSONB NOT NULL DEFAULT '{}',

    -- Readiness evaluation results
    blocking_failures JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    passed_rules JSONB DEFAULT '[]',

    -- Output
    file_reference VARCHAR(500),
    file_hash VARCHAR(64),
    expiry_date DATE,

    -- Audit
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulatory_packs_company ON regulatory_packs(company_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_packs_type ON regulatory_packs(pack_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_packs_status ON regulatory_packs(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_packs_date ON regulatory_packs(generation_date);

-- Board Pack detail access audit (Safeguard 2)
CREATE TABLE IF NOT EXISTS board_pack_detail_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES regulatory_packs(id) ON DELETE CASCADE,
    section_requested VARCHAR(20) NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    justification TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED'))
);

CREATE INDEX IF NOT EXISTS idx_board_pack_requests_pack ON board_pack_detail_requests(pack_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_requests_status ON board_pack_detail_requests(status);

-- Tender Pack incident opt-in audit (Safeguard 4)
CREATE TABLE IF NOT EXISTS tender_pack_incident_optins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES regulatory_packs(id) ON DELETE CASCADE,
    opt_in_decision VARCHAR(20) NOT NULL CHECK (opt_in_decision IN ('INCLUDED', 'EXCLUDED')),
    disclosure_level VARCHAR(30) CHECK (disclosure_level IN ('AGGREGATE', 'SEVERITY_BREAKDOWN', 'FULL')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    justification TEXT,
    incident_data_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_pack_optins_pack ON tender_pack_incident_optins(pack_id);

-- ============================================================================
-- SECTION 8: READINESS RULES CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS pack_readiness_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(20) NOT NULL UNIQUE,
    pack_types VARCHAR(50)[] NOT NULL,
    description TEXT NOT NULL,
    is_blocking BOOLEAN NOT NULL DEFAULT TRUE,
    standard_lookback_months INTEGER,
    ea_source VARCHAR(255),
    query_template TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default readiness rules
INSERT INTO pack_readiness_rules (rule_id, pack_types, description, is_blocking, standard_lookback_months, ea_source) VALUES
('RA-001', ARRAY['REGULATOR_PACK'], 'All permit conditions must have compliance status assessed', TRUE, NULL, 'Source #3: Assessing and Scoring'),
('RA-002', ARRAY['REGULATOR_PACK'], 'Monitoring returns must exist for current reporting period', TRUE, NULL, 'Source #16: MCERTS'),
('RA-003', ARRAY['REGULATOR_PACK'], 'Waste transfer notes must cover required retention period (2 years)', TRUE, 24, 'Source #9: Duty of Care'),
('RA-004', ARRAY['REGULATOR_PACK'], 'Consignment notes must cover required retention period (3 years)', TRUE, 36, 'Source #9: Duty of Care'),
('RA-005', ARRAY['REGULATOR_PACK'], 'Management review must exist within last 12 months', FALSE, 12, 'Source #7: Management System'),
('RA-006', ARRAY['REGULATOR_PACK', 'INTERNAL_AUDIT_PACK'], 'Climate adaptation plan required for permits issued on/after 1 April 2023', TRUE, NULL, 'Source #7: Management System'),
('RA-007', ARRAY['REGULATOR_PACK'], 'Climate risk assessment required by 1 April 2024 for pre-2023 permits', TRUE, NULL, 'Source #7: Management System'),
('RA-008', ARRAY['REGULATOR_PACK'], 'TCM attendance records required for waste operations', TRUE, NULL, 'Source #8: Competence Requirements'),
('RA-009', ARRAY['REGULATOR_PACK'], 'All non-compliances must have linked CAPA', FALSE, NULL, 'Source #7: Management System'),
('RA-010', ARRAY['REGULATOR_PACK'], 'MCP monitoring records must cover 6 years', TRUE, 72, 'Source #15: MCP How to Comply'),
('RB-001', ARRAY['INTERNAL_AUDIT_PACK'], 'Environmental policy must be current (reviewed within 12 months)', TRUE, 12, 'ISO 14001:2015 §5.2'),
('RB-005', ARRAY['INTERNAL_AUDIT_PACK'], 'Management review must be completed within review cycle', TRUE, 12, 'ISO 14001:2015 §9.3'),
('RB-007', ARRAY['INTERNAL_AUDIT_PACK'], 'Emergency preparedness plan must exist', TRUE, NULL, 'Source #7: Management System'),
('RC-001', ARRAY['BOARD_PACK'], 'At least 90% of obligations must have compliance status assessed', TRUE, NULL, 'Internal requirement'),
('RC-002', ARRAY['BOARD_PACK'], 'CCS band must be calculated for current compliance year', TRUE, NULL, 'Source #3: Assessing and Scoring'),
('RC-003', ARRAY['BOARD_PACK'], 'All Category 1-2 breaches must have linked CAPA', TRUE, NULL, 'Source #3: Assessing and Scoring'),
('RC-006', ARRAY['BOARD_PACK'], 'Trend data requires minimum 2 years of history', FALSE, 24, 'Internal requirement'),
('RD-001', ARRAY['TENDER_PACK'], 'All permits must have ACTIVE status', TRUE, NULL, 'Source #2: EPR 2016'),
('RD-002', ARRAY['TENDER_PACK'], 'Compliance band should be A, B, or C', FALSE, NULL, 'Commercial requirement'),
('RD-004', ARRAY['TENDER_PACK'], 'No active prosecutions', TRUE, NULL, 'Source #9: Duty of Care'),
('RD-005', ARRAY['TENDER_PACK'], 'No Category 1 breaches in current compliance year', FALSE, NULL, 'Commercial requirement'),
('RD-006', ARRAY['TENDER_PACK'], 'Environmental policy must be current', TRUE, 12, 'ISO 14001:2015 §5.2'),
('RD-008', ARRAY['TENDER_PACK'], 'Data must be current (within 30 days)', TRUE, NULL, 'Commercial requirement')
ON CONFLICT (rule_id) DO NOTHING;

-- ============================================================================
-- SECTION 9: ELV MONITORING RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS elv_monitoring_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    elv_condition_id UUID NOT NULL REFERENCES elv_conditions(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    test_date DATE NOT NULL,
    measured_value DECIMAL(15,6) NOT NULL,
    measured_unit VARCHAR(50) NOT NULL,
    reference_conditions VARCHAR(255),

    -- Compliance check (against permit-verbatim values)
    permit_limit DECIMAL(15,6) NOT NULL,
    is_compliant BOOLEAN NOT NULL,
    exceedance_value DECIMAL(15,6),
    exceedance_percentage DECIMAL(8,4),

    -- Testing details
    laboratory_name VARCHAR(255),
    mcerts_certified BOOLEAN NOT NULL DEFAULT FALSE,
    certificate_reference VARCHAR(100),

    -- Evidence link
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_elv_results_condition ON elv_monitoring_results(elv_condition_id);
CREATE INDEX IF NOT EXISTS idx_elv_results_site ON elv_monitoring_results(site_id);
CREATE INDEX IF NOT EXISTS idx_elv_results_date ON elv_monitoring_results(test_date);
CREATE INDEX IF NOT EXISTS idx_elv_results_compliant ON elv_monitoring_results(is_compliant);

-- Auto-calculate compliance status
CREATE OR REPLACE FUNCTION check_elv_compliance()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the permit limit from the ELV condition
    SELECT elv_value INTO NEW.permit_limit
    FROM elv_conditions
    WHERE id = NEW.elv_condition_id;

    -- Calculate compliance
    NEW.is_compliant := NEW.measured_value <= NEW.permit_limit;

    IF NOT NEW.is_compliant THEN
        NEW.exceedance_value := NEW.measured_value - NEW.permit_limit;
        NEW.exceedance_percentage := ((NEW.measured_value - NEW.permit_limit) / NEW.permit_limit) * 100;
    ELSE
        NEW.exceedance_value := NULL;
        NEW.exceedance_percentage := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_elv_compliance ON elv_monitoring_results;
CREATE TRIGGER trigger_check_elv_compliance
    BEFORE INSERT OR UPDATE ON elv_monitoring_results
    FOR EACH ROW EXECUTE FUNCTION check_elv_compliance();

-- ============================================================================
-- SECTION 10: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE company_relaxed_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE elv_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccs_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccs_non_compliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_pack_detail_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_pack_incident_optins ENABLE ROW LEVEL SECURITY;
ALTER TABLE elv_monitoring_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using existing company-based isolation pattern)
CREATE POLICY company_relaxed_rules_policy ON company_relaxed_rules
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY elv_conditions_policy ON elv_conditions
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY ccs_assessments_policy ON ccs_assessments
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY ccs_non_compliances_policy ON ccs_non_compliances
    FOR ALL USING (ccs_assessment_id IN (
        SELECT id FROM ccs_assessments WHERE company_id IN (SELECT get_user_company_ids())
    ));

CREATE POLICY cars_policy ON compliance_assessment_reports
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY regulatory_capas_policy ON regulatory_capas
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY regulatory_incidents_policy ON regulatory_incidents
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY regulatory_packs_policy ON regulatory_packs
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

CREATE POLICY board_pack_requests_policy ON board_pack_detail_requests
    FOR ALL USING (pack_id IN (
        SELECT id FROM regulatory_packs WHERE company_id IN (SELECT get_user_company_ids())
    ));

CREATE POLICY tender_pack_optins_policy ON tender_pack_incident_optins
    FOR ALL USING (pack_id IN (
        SELECT id FROM regulatory_packs WHERE company_id IN (SELECT get_user_company_ids())
    ));

CREATE POLICY elv_monitoring_results_policy ON elv_monitoring_results
    FOR ALL USING (company_id IN (SELECT get_user_company_ids()));

-- ============================================================================
-- SECTION 11: UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER set_updated_at_company_relaxed_rules
    BEFORE UPDATE ON company_relaxed_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_elv_conditions
    BEFORE UPDATE ON elv_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ccs_assessments
    BEFORE UPDATE ON ccs_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ccs_non_compliances
    BEFORE UPDATE ON ccs_non_compliances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_cars
    BEFORE UPDATE ON compliance_assessment_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_regulatory_capas
    BEFORE UPDATE ON regulatory_capas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_regulatory_incidents
    BEFORE UPDATE ON regulatory_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_regulatory_packs
    BEFORE UPDATE ON regulatory_packs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_elv_monitoring_results
    BEFORE UPDATE ON elv_monitoring_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
