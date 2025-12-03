-- Regulation Thresholds Tables
-- Module 3: MCPD/Generators

-- ============================================================================
-- 1. REGULATION THRESHOLDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS regulation_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    threshold_type TEXT NOT NULL
        CHECK (threshold_type IN ('MCPD_1_5MW', 'MCPD_5_50MW', 'SPECIFIED_GENERATOR', 'CUSTOM')),
    capacity_min_mw DECIMAL(8, 4) NOT NULL,
    capacity_max_mw DECIMAL(8, 4),
    monitoring_frequency TEXT NOT NULL
        CHECK (monitoring_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CONTINUOUS')),
    stack_test_frequency TEXT NOT NULL
        CHECK (stack_test_frequency IN ('ANNUAL', 'BIENNIAL', 'AS_REQUIRED')),
    reporting_frequency TEXT NOT NULL
        CHECK (reporting_frequency IN ('ANNUAL', 'QUARTERLY', 'MONTHLY')),
    regulation_reference TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulation_thresholds_company_id ON regulation_thresholds(company_id);
CREATE INDEX IF NOT EXISTS idx_regulation_thresholds_threshold_type ON regulation_thresholds(threshold_type);
CREATE INDEX IF NOT EXISTS idx_regulation_thresholds_capacity_range ON regulation_thresholds(capacity_min_mw, capacity_max_mw);
CREATE INDEX IF NOT EXISTS idx_regulation_thresholds_is_active ON regulation_thresholds(is_active);

-- ============================================================================
-- 2. THRESHOLD COMPLIANCE RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS threshold_compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_threshold_id UUID NOT NULLid) ON DELETE CASCADE,
    generator_id UUID REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL
        CHECK (rule_type IN ('MONITORING_FREQUENCY', 'STACK_TEST_FREQUENCY', 'REPORTING_FREQUENCY', 'RUN_HOUR_LIMIT', 'CUSTOM')),
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_regulation_threshold_id ON threshold_compliance_rules(regulation_threshold_id);
CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_generator_id ON threshold_compliance_rules(generator_id);
CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_company_id ON threshold_compliance_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_site_id ON threshold_compliance_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_rule_type ON threshold_compliance_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_threshold_compliance_rules_is_active ON threshold_compliance_rules(is_active);

-- ============================================================================
-- 3. FREQUENCY CALCULATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS frequency_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    regulation_threshold_id UUID NOT NULLid) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    generator_capacity_mw DECIMAL(8, 4) NOT NULL,
    calculated_monitoring_frequency TEXT NOT NULL,
    calculated_stack_test_frequency TEXT NOT NULL,
    calculated_reporting_frequency TEXT NOT NULL,
    calculation_details JSONB NOT NULL DEFAULT '{}',
    is_applied BOOLEAN NOT NULL DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frequency_calculations_generator_id ON frequency_calculations(generator_id);
CREATE INDEX IF NOT EXISTS idx_frequency_calculations_regulation_threshold_id ON frequency_calculations(regulation_threshold_id);
CREATE INDEX IF NOT EXISTS idx_frequency_calculations_company_id ON frequency_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_frequency_calculations_site_id ON frequency_calculations(site_id);
CREATE INDEX IF NOT EXISTS idx_frequency_calculations_calculation_date ON frequency_calculations(calculation_date);
CREATE INDEX IF NOT EXISTS idx_frequency_calculations_is_applied ON frequency_calculations(is_applied);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE regulation_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE threshold_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequency_calculations ENABLE ROW LEVEL SECURITY;

-- regulation_thresholds policies
CREATE POLICY IF NOT EXISTS regulation_thresholds_select_company_module ON regulation_thresholds
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            JOIN module_activations ma ON ma.company_id = uca.company_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = regulation_thresholds.company_id
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS regulation_thresholds_insert_staff_module ON regulation_thresholds
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            JOIN module_activations ma ON ma.company_id = uca.company_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = regulation_thresholds.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS regulation_thresholds_update_staff_module ON regulation_thresholds
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            JOIN module_activations ma ON ma.company_id = uca.company_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = regulation_thresholds.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS regulation_thresholds_delete_owner_admin_module ON regulation_thresholds
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            JOIN module_activations ma ON ma.company_id = uca.company_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = regulation_thresholds.company_id
            AND uca.role IN ('OWNER', 'ADMIN')
            AND ma.is_active = true
        )
    );

-- threshold_compliance_rules policies
CREATE POLICY IF NOT EXISTS threshold_compliance_rules_select_site_module ON threshold_compliance_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = threshold_compliance_rules.site_id
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS threshold_compliance_rules_insert_staff_module ON threshold_compliance_rules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = threshold_compliance_rules.site_id
            AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS threshold_compliance_rules_update_staff_module ON threshold_compliance_rules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = threshold_compliance_rules.site_id
            AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

-- frequency_calculations policies
CREATE POLICY IF NOT EXISTS frequency_calculations_select_site_module ON frequency_calculations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = frequency_calculations.site_id
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS frequency_calculations_insert_staff_module ON frequency_calculations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = frequency_calculations.site_id
            AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

CREATE POLICY IF NOT EXISTS frequency_calculations_update_staff_module ON frequency_calculations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access usa
            JOIN module_activations ma ON ma.site_id = usa.site_id
            JOIN modules m ON m.id = ma.module_id AND m.module_code = 'MODULE_3'
            WHERE usa.user_id = auth.uid()
            AND usa.site_id = frequency_calculations.site_id
            AND usa.role IN ('OWNER', 'ADMIN', 'STAFF')
            AND ma.is_active = true
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for regulation_thresholds
CREATE OR REPLACE FUNCTION update_regulation_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_regulation_thresholds_updated_at
    BEFORE UPDATE ON regulation_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_thresholds_updated_at();

-- Update updated_at for threshold_compliance_rules
CREATE OR REPLACE FUNCTION update_threshold_compliance_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_threshold_compliance_rules_updated_at
    BEFORE UPDATE ON threshold_compliance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_threshold_compliance_rules_updated_at();

-- Update updated_at for frequency_calculations
CREATE OR REPLACE FUNCTION update_frequency_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_frequency_calculations_updated_at
    BEFORE UPDATE ON frequency_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_frequency_calculations_updated_at();



-- Deferred Foreign Key Constraints
-- Deferred FK: regulation_threshold_id -> regulation_thresholds
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_thresholds') THEN
    ALTER TABLE regulation_thresholds 
    ADD CONSTRAINT fk_regulation_thresholds_regulation_threshold_id
    FOREIGN KEY (regulation_threshold_id) REFERENCES regulation_thresholds(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Deferred FK: regulation_threshold_id -> regulation_thresholds
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'regulation_thresholds') THEN
    ALTER TABLE regulation_thresholds 
    ADD CONSTRAINT fk_regulation_thresholds_regulation_threshold_id
    FOREIGN KEY (regulation_threshold_id) REFERENCES regulation_thresholds(id) ON DELETE CASCADE;
  END IF;
END $$;