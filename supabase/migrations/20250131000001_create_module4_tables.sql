-- Migration: 20250131000001_create_module4_tables.sql
-- Description: Create Module 4 (Hazardous Waste Chain of Custody) database tables
-- Author: Build System
-- Date: 2025-01-31
-- Order: Phase 1.1 - After modules table exists

-- ============================================================================
-- MODULE 4: HAZARDOUS WASTE CHAIN OF CUSTODY TABLES
-- ============================================================================

-- 1. waste_streams table
CREATE TABLE waste_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE RESTRICT,
    ewc_code TEXT NOT NULL,
    waste_description TEXT NOT NULL,
    waste_category TEXT,
    hazard_code TEXT,
    permit_reference TEXT,
    volume_limit_m3 DECIMAL(12, 4),
    storage_duration_limit_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_waste_streams_company_id ON waste_streams(company_id);
CREATE INDEX idx_waste_streams_site_id ON waste_streams(site_id);
CREATE INDEX idx_waste_streams_module_id ON waste_streams(module_id);
CREATE INDEX idx_waste_streams_ewc_code ON waste_streams(ewc_code);
CREATE INDEX idx_waste_streams_is_active ON waste_streams(is_active) WHERE is_active = true;
CREATE INDEX idx_waste_streams_deleted_at ON waste_streams(deleted_at) WHERE deleted_at IS NULL;

-- 2. contractor_licences table
CREATE TABLE contractor_licences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contractor_name TEXT NOT NULL,
    licence_number TEXT NOT NULL,
    licence_type TEXT NOT NULL,
    waste_types_allowed TEXT[] NOT NULL DEFAULT '{}',
    issued_date DATE,
    expiry_date DATE NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_contractor_licences_company_id ON contractor_licences(company_id);
CREATE INDEX idx_contractor_licences_licence_number ON contractor_licences(licence_number);
CREATE INDEX idx_contractor_licences_expiry_date ON contractor_licences(expiry_date);
CREATE INDEX idx_contractor_licences_is_valid ON contractor_licences(is_valid) WHERE is_valid = true;

-- 3. consignment_notes table
CREATE TABLE consignment_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waste_stream_id UUID NOT NULL REFERENCES waste_streams(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    consignment_note_number TEXT NOT NULL UNIQUE,
    consignment_date DATE NOT NULL,
    carrier_id UUID REFERENCES contractor_licences(id) ON DELETE SET NULL,
    carrier_name TEXT NOT NULL,
    carrier_licence_number TEXT,
    destination_site TEXT NOT NULL,
    waste_description TEXT NOT NULL,
    ewc_code TEXT NOT NULL,
    quantity_m3 DECIMAL(12, 4) NOT NULL,
    quantity_kg DECIMAL(12, 4),
    validation_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED', 'REQUIRES_REVIEW')),
    validation_errors JSONB NOT NULL DEFAULT '[]',
    pre_validation_status TEXT
        CHECK (pre_validation_status IN ('NOT_VALIDATED', 'VALIDATION_PENDING', 'PASSED', 'FAILED')),
    pre_validation_errors JSONB,
    pre_validated_at TIMESTAMP WITH TIME ZONE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consignment_notes_waste_stream_id ON consignment_notes(waste_stream_id);
CREATE INDEX idx_consignment_notes_company_id ON consignment_notes(company_id);
CREATE INDEX idx_consignment_notes_site_id ON consignment_notes(site_id);
CREATE INDEX idx_consignment_notes_consignment_note_number ON consignment_notes(consignment_note_number);
CREATE INDEX idx_consignment_notes_consignment_date ON consignment_notes(consignment_date);
CREATE INDEX idx_consignment_notes_carrier_id ON consignment_notes(carrier_id);
CREATE INDEX idx_consignment_notes_validation_status ON consignment_notes(validation_status);
CREATE INDEX idx_consignment_notes_pre_validation_status ON consignment_notes(pre_validation_status);

-- 4. chain_of_custody table
CREATE TABLE chain_of_custody (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    chain_position INTEGER NOT NULL,
    transfer_date DATE NOT NULL,
    from_party TEXT NOT NULL,
    to_party TEXT NOT NULL,
    transfer_method TEXT,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_complete BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_chain_of_custody_consignment_note_id ON chain_of_custody(consignment_note_id);
CREATE INDEX idx_chain_of_custody_company_id ON chain_of_custody(company_id);
CREATE INDEX idx_chain_of_custody_site_id ON chain_of_custody(site_id);
CREATE INDEX idx_chain_of_custody_is_complete ON chain_of_custody(is_complete) WHERE is_complete = false;

-- 5. end_point_proofs table
CREATE TABLE end_point_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    end_point_type TEXT NOT NULL 
        CHECK (end_point_type IN ('DESTRUCTION', 'RECYCLING', 'RECOVERY', 'DISPOSAL')),
    end_point_facility TEXT NOT NULL,
    completion_date DATE NOT NULL,
    certificate_reference TEXT,
    certificate_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_end_point_proofs_consignment_note_id ON end_point_proofs(consignment_note_id);
CREATE INDEX idx_end_point_proofs_company_id ON end_point_proofs(company_id);
CREATE INDEX idx_end_point_proofs_site_id ON end_point_proofs(site_id);
CREATE INDEX idx_end_point_proofs_end_point_type ON end_point_proofs(end_point_type);
CREATE INDEX idx_end_point_proofs_completion_date ON end_point_proofs(completion_date);
CREATE INDEX idx_end_point_proofs_is_verified ON end_point_proofs(is_verified) WHERE is_verified = false;

-- 6. chain_break_alerts table
CREATE TABLE chain_break_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID REFERENCES consignment_notes(id) ON DELETE CASCADE,
    chain_of_custody_id UUID REFERENCES chain_of_custody(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL 
        CHECK (alert_type IN ('MISSING_EVIDENCE', 'CONTRACTOR_NON_COMPLIANT', 'CHAIN_GAP', 'VALIDATION_FAILURE', 'EXPIRED_LICENCE')),
    alert_severity TEXT NOT NULL DEFAULT 'WARNING' 
        CHECK (alert_severity IN ('INFO', 'WARNING', 'CRITICAL')),
    alert_message TEXT NOT NULL,
    gap_description TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chain_break_alerts_consignment_note_id ON chain_break_alerts(consignment_note_id);
CREATE INDEX idx_chain_break_alerts_chain_of_custody_id ON chain_break_alerts(chain_of_custody_id);
CREATE INDEX idx_chain_break_alerts_company_id ON chain_break_alerts(company_id);
CREATE INDEX idx_chain_break_alerts_site_id ON chain_break_alerts(site_id);
CREATE INDEX idx_chain_break_alerts_alert_type ON chain_break_alerts(alert_type);
CREATE INDEX idx_chain_break_alerts_is_resolved ON chain_break_alerts(is_resolved) WHERE is_resolved = false;

-- 7. validation_rules table
CREATE TABLE validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    waste_stream_id UUID REFERENCES waste_streams(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL
        CHECK (rule_type IN ('CARRIER_LICENCE', 'VOLUME_LIMIT', 'STORAGE_DURATION', 'EWC_CODE', 'DESTINATION', 'CUSTOM')),
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    rule_config JSONB NOT NULL,
    severity TEXT NOT NULL
        CHECK (severity IN ('ERROR', 'WARNING', 'INFO')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_rules_company_id ON validation_rules(company_id);
CREATE INDEX idx_validation_rules_waste_stream_id ON validation_rules(waste_stream_id);
CREATE INDEX idx_validation_rules_rule_type ON validation_rules(rule_type);
CREATE INDEX idx_validation_rules_is_active ON validation_rules(is_active) WHERE is_active = true;

-- 8. validation_executions table
CREATE TABLE validation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consignment_note_id UUID NOT NULL REFERENCES consignment_notes(id) ON DELETE CASCADE,
    validation_rule_id UUID NOT NULL REFERENCES validation_rules(id) ON DELETE CASCADE,
    validation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    validation_result TEXT NOT NULL
        CHECK (validation_result IN ('PASS', 'FAIL', 'WARNING')),
    validation_message TEXT,
    validation_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_validation_executions_consignment_note_id ON validation_executions(consignment_note_id);
CREATE INDEX idx_validation_executions_validation_rule_id ON validation_executions(validation_rule_id);
CREATE INDEX idx_validation_executions_validation_result ON validation_executions(validation_result);
CREATE INDEX idx_validation_executions_validation_date ON validation_executions(validation_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE waste_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_licences ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_of_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_point_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_break_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_executions ENABLE ROW LEVEL SECURITY;

-- waste_streams RLS policies
CREATE POLICY "Users can view waste streams for their company sites"
    ON waste_streams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = waste_streams.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can insert waste streams for their company sites"
    ON waste_streams FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = waste_streams.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update waste streams for their company sites"
    ON waste_streams FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = waste_streams.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can delete waste streams for their company sites"
    ON waste_streams FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = waste_streams.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- contractor_licences RLS policies
CREATE POLICY "Users can view contractor licences for their company"
    ON contractor_licences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = contractor_licences.company_id
            AND user_company_access.is_active = true
        )
    );

CREATE POLICY "Users can insert contractor licences for their company"
    ON contractor_licences FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = contractor_licences.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update contractor licences for their company"
    ON contractor_licences FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = contractor_licences.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can delete contractor licences for their company"
    ON contractor_licences FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = contractor_licences.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- consignment_notes RLS policies
CREATE POLICY "Users can view consignment notes for their company sites"
    ON consignment_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = consignment_notes.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can insert consignment notes for their company sites"
    ON consignment_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = consignment_notes.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update consignment notes for their company sites"
    ON consignment_notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = consignment_notes.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- chain_of_custody RLS policies
CREATE POLICY "Users can view chain of custody for their company sites"
    ON chain_of_custody FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_of_custody.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can insert chain of custody for their company sites"
    ON chain_of_custody FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_of_custody.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update chain of custody for their company sites"
    ON chain_of_custody FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_of_custody.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- end_point_proofs RLS policies
CREATE POLICY "Users can view end point proofs for their company sites"
    ON end_point_proofs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = end_point_proofs.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can insert end point proofs for their company sites"
    ON end_point_proofs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = end_point_proofs.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update end point proofs for their company sites"
    ON end_point_proofs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = end_point_proofs.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- chain_break_alerts RLS policies
CREATE POLICY "Users can view chain break alerts for their company sites"
    ON chain_break_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_break_alerts.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can insert chain break alerts for their company sites"
    ON chain_break_alerts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_break_alerts.site_id
            AND user_site_access.is_active = true
        )
    );

CREATE POLICY "Users can update chain break alerts for their company sites"
    ON chain_break_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = chain_break_alerts.site_id
            AND user_site_access.is_active = true
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- validation_rules RLS policies
CREATE POLICY "Users can view validation rules for their company"
    ON validation_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = validation_rules.company_id
            AND user_company_access.is_active = true
        )
    );

CREATE POLICY "Users can insert validation rules for their company"
    ON validation_rules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = validation_rules.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can update validation rules for their company"
    ON validation_rules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = validation_rules.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Users can delete validation rules for their company"
    ON validation_rules FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access
            WHERE user_company_access.user_id = auth.uid()
            AND user_company_access.company_id = validation_rules.company_id
            AND user_company_access.is_active = true
            AND user_company_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- validation_executions RLS policies (read-only, system-generated)
CREATE POLICY "Users can view validation executions for their company"
    ON validation_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM consignment_notes
            JOIN user_site_access ON user_site_access.site_id = consignment_notes.site_id
            WHERE consignment_notes.id = validation_executions.consignment_note_id
            AND user_site_access.user_id = auth.uid()
            AND user_site_access.is_active = true
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waste_streams_updated_at
    BEFORE UPDATE ON waste_streams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_licences_updated_at
    BEFORE UPDATE ON contractor_licences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consignment_notes_updated_at
    BEFORE UPDATE ON consignment_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chain_of_custody_updated_at
    BEFORE UPDATE ON chain_of_custody
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_end_point_proofs_updated_at
    BEFORE UPDATE ON end_point_proofs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chain_break_alerts_updated_at
    BEFORE UPDATE ON chain_break_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_validation_rules_updated_at
    BEFORE UPDATE ON validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'waste_streams',
        'contractor_licences',
        'consignment_notes',
        'chain_of_custody',
        'end_point_proofs',
        'chain_break_alerts',
        'validation_rules',
        'validation_executions'
    );
    
    IF table_count != 8 THEN
        RAISE EXCEPTION 'Expected 8 Module 4 tables, found %', table_count;
    END IF;
    
    RAISE NOTICE 'Module 4 tables created successfully: % tables', table_count;
END $$;

