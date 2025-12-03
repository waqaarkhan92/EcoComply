-- Migration: 20250201000001_create_phase4_advanced_tables.sql
-- Description: Create Phase 4 advanced tables (sampling_logistics, corrective_actions enhancements, runtime_monitoring, exemptions)
-- Author: Build System
-- Date: 2025-02-01
-- Order: Phase 4 - After Module 2 & 3 core tables exist

-- ============================================================================
-- PHASE 4: MODULE 2 & 3 ADVANCED FEATURES
-- ============================================================================

-- 1. sampling_logistics table (Module 2)
CREATE TABLE IF NOT EXISTS sampling_logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES parameters(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    sample_id TEXT,
    stage TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (stage IN ('SCHEDULED', 'REMINDER_SENT', 'COLLECTION_SCHEDULED', 'COLLECTED', 'COURIER_BOOKED', 'IN_TRANSIT', 'LAB_RECEIVED', 'LAB_PROCESSING', 'CERTIFICATE_RECEIVED', 'EVIDENCE_LINKED', 'COMPLETED')),
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    collection_scheduled_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE,
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    courier_booked_at TIMESTAMP WITH TIME ZONE,
    courier_reference TEXT,
    in_transit_at TIMESTAMP WITH TIME ZONE,
    lab_received_at TIMESTAMP WITH TIME ZONE,
    lab_reference TEXT,
    lab_processing_at TIMESTAMP WITH TIME ZONE,
    certificate_received_at TIMESTAMP WITH TIME ZONE,
    certificate_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    evidence_linked_at TIMESTAMP WITH TIME ZONE,
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    lab_result_id UUID REFERENCES lab_results(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sampling_logistics_parameter_id ON sampling_logistics(parameter_id);
CREATE INDEX IF NOT EXISTS idx_sampling_logistics_company_id ON sampling_logistics(company_id);
CREATE INDEX IF NOT EXISTS idx_sampling_logistics_site_id ON sampling_logistics(site_id);
CREATE INDEX IF NOT EXISTS idx_sampling_logistics_scheduled_date ON sampling_logistics(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_sampling_logistics_stage ON sampling_logistics(stage);
CREATE INDEX IF NOT EXISTS idx_sampling_logistics_certificate_document_id ON sampling_logistics(certificate_document_id);

-- 2. Enhance corrective_actions table if it doesn't have all fields
DO $$
BEGIN
    -- Add lifecycle_phase if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'lifecycle_phase'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN lifecycle_phase TEXT
            CHECK (lifecycle_phase IN ('TRIGGER', 'INVESTIGATION', 'ACTION', 'RESOLUTION', 'CLOSURE'));
    END IF;

    -- Add root_cause_analysis if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'root_cause_analysis'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN root_cause_analysis TEXT;
    END IF;

    -- Add impact_assessment if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'impact_assessment'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN impact_assessment JSONB NOT NULL DEFAULT '{}';
    END IF;

    -- Add regulator_notification_required if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'regulator_notification_required'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN regulator_notification_required BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add regulator_justification if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'regulator_justification'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN regulator_justification TEXT;
    END IF;

    -- Add closure_approved_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'closure_approved_by'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN closure_approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- Add closure_approved_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'closure_approved_at'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN closure_approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add closure_requires_approval if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'closure_requires_approval'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN closure_requires_approval BOOLEAN NOT NULL DEFAULT false;
    END IF;

    -- Add chain_break_alert_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'corrective_actions' AND column_name = 'chain_break_alert_id'
    ) THEN
        ALTER TABLE corrective_actions ADD COLUMN chain_break_alert_id UUID REFERENCES chain_break_alerts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_corrective_actions_lifecycle_phase ON corrective_actions(lifecycle_phase);

-- 3. corrective_action_items table (if not exists)
CREATE TABLE IF NOT EXISTS corrective_action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corrective_action_id UUID NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,
    item_title TEXT NOT NULL,
    item_description TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    completion_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_action_items_corrective_action_id ON corrective_action_items(corrective_action_id);
CREATE INDEX IF NOT EXISTS idx_corrective_action_items_assigned_to ON corrective_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_corrective_action_items_status ON corrective_action_items(status);
CREATE INDEX IF NOT EXISTS idx_corrective_action_items_due_date ON corrective_action_items(due_date);

-- 4. Enhance runtime_monitoring table if needed
DO $$
BEGIN
    -- Add run_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'runtime_monitoring' AND column_name = 'run_date'
    ) THEN
        ALTER TABLE runtime_monitoring ADD COLUMN run_date DATE;
    END IF;

    -- Add run_duration if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'runtime_monitoring' AND column_name = 'run_duration'
    ) THEN
        ALTER TABLE runtime_monitoring ADD COLUMN run_duration DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (run_duration >= 0);
    END IF;

    -- Add reason_code if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'runtime_monitoring' AND column_name = 'reason_code'
    ) THEN
        ALTER TABLE runtime_monitoring ADD COLUMN reason_code TEXT
            CHECK (reason_code IN ('Test', 'Emergency', 'Maintenance', 'Normal'));
    END IF;

    -- Add evidence_linkage_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'runtime_monitoring' AND column_name = 'evidence_linkage_id'
    ) THEN
        ALTER TABLE runtime_monitoring ADD COLUMN evidence_linkage_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL;
    END IF;

    -- Add entry_reason_notes if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'runtime_monitoring' AND column_name = 'entry_reason_notes'
    ) THEN
        ALTER TABLE runtime_monitoring ADD COLUMN entry_reason_notes TEXT;
    END IF;
END $$;

-- 5. exemptions table (Module 3)
CREATE TABLE IF NOT EXISTS exemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID NOT NULL REFERENCES generators(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    exemption_type TEXT NOT NULL
        CHECK (exemption_type IN ('TESTING', 'EMERGENCY_OPERATION', 'MAINTENANCE', 'OTHER')),
    start_date DATE NOT NULL,
    end_date DATE,
    duration_hours DECIMAL(10, 2),
    exemption_reason TEXT NOT NULL,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    compliance_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_exemptions_generator_id ON exemptions(generator_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_company_id ON exemptions(company_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_site_id ON exemptions(site_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_exemption_type ON exemptions(exemption_type);
CREATE INDEX IF NOT EXISTS idx_exemptions_compliance_verified ON exemptions(compliance_verified);
CREATE INDEX IF NOT EXISTS idx_exemptions_start_date ON exemptions(start_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE sampling_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemptions ENABLE ROW LEVEL SECURITY;

-- sampling_logistics RLS policies
CREATE POLICY "Users can view sampling logistics for their company sites"
    ON sampling_logistics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = sampling_logistics.company_id
        )
    );

CREATE POLICY "Staff can create sampling logistics for their company sites"
    ON sampling_logistics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = sampling_logistics.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update sampling logistics for their company sites"
    ON sampling_logistics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = sampling_logistics.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- corrective_action_items RLS policies
CREATE POLICY "Users can view corrective action items for their company"
    ON corrective_action_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM corrective_actions ca
            JOIN user_company_access uca ON uca.company_id = ca.company_id
            WHERE ca.id = corrective_action_items.corrective_action_id
            AND uca.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can create corrective action items for their company"
    ON corrective_action_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM corrective_actions ca
            JOIN user_company_access uca ON uca.company_id = ca.company_id
            WHERE ca.id = corrective_action_items.corrective_action_id
            AND uca.user_id = auth.uid()
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update corrective action items for their company"
    ON corrective_action_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM corrective_actions ca
            JOIN user_company_access uca ON uca.company_id = ca.company_id
            WHERE ca.id = corrective_action_items.corrective_action_id
            AND uca.user_id = auth.uid()
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- exemptions RLS policies
CREATE POLICY "Users can view exemptions for their company sites"
    ON exemptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = exemptions.company_id
        )
    );

CREATE POLICY "Staff can create exemptions for their company sites"
    ON exemptions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = exemptions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY "Staff can update exemptions for their company sites"
    ON exemptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_company_access uca
            WHERE uca.user_id = auth.uid()
            AND uca.company_id = exemptions.company_id
            AND uca.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER update_sampling_logistics_updated_at
    BEFORE UPDATE ON sampling_logistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corrective_action_items_updated_at
    BEFORE UPDATE ON corrective_action_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exemptions_updated_at
    BEFORE UPDATE ON exemptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();



-- Deferred Foreign Key Constraints
-- Deferred FK: corrective_action_id -> corrective_actions
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'corrective_actions') THEN
    ALTER TABLE sampling_logistics 
    ADD CONSTRAINT fk_sampling_logistics_corrective_action_id
    FOREIGN KEY (corrective_action_id) REFERENCES corrective_actions(id) ON DELETE CASCADE;
  END IF;
END $$;