-- Migration: 20250201000015_create_module4_validation_tables.sql
-- Description: Create Module 4 validation tables (validation_rules, validation_executions)
-- Author: Build System
-- Date: 2025-02-01
-- Order: After Module 4 core tables (waste_streams, consignment_notes, contractor_licences)

-- 7.7 validation_rules
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
CREATE INDEX idx_validation_rules_is_active ON validation_rules(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_validation_rules_updated_at
    BEFORE UPDATE ON validation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7.8 validation_executions
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
CREATE INDEX idx_validation_executions_validation_date ON validation_executions(validation_date);
CREATE INDEX idx_validation_executions_validation_result ON validation_executions(validation_result);

-- Enable RLS on all tables
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_executions ENABLE ROW LEVEL SECURITY;

