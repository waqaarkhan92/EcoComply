-- Advanced Recurrence System Tables
-- recurrence_trigger_rules, recurrence_events, recurrence_conditions

-- ============================================================================
-- 1. RECURRENCE EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurrence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('COMMISSIONING', 'PERMIT_ISSUED', 'RENEWAL', 'VARIATION', 'ENFORCEMENT', 'CUSTOM')),
    event_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurrence_events_company_id ON recurrence_events(company_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_events_site_id ON recurrence_events(site_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_events_event_type ON recurrence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_recurrence_events_event_date ON recurrence_events(event_date);
CREATE INDEX IF NOT EXISTS idx_recurrence_events_is_active ON recurrence_events(is_active);

-- RLS Policies for recurrence_events
ALTER TABLE recurrence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS recurrence_events_select_site_access ON recurrence_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_events.site_id
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_events_insert_staff_access ON recurrence_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_events.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_events_update_staff_access ON recurrence_events
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_events.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_events_delete_owner_admin_access ON recurrence_events
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_events.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- 2. RECURRENCE TRIGGER RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurrence_trigger_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL
        CHECK (rule_type IN ('DYNAMIC_OFFSET', 'EVENT_BASED', 'CONDITIONAL', 'FIXED')),
    rule_config JSONB NOT NULL DEFAULT '{}',
    trigger_expression TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    event_id UUIDid) ON DELETE SET NULL,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    next_execution_date DATE,
    execution_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_schedule_id ON recurrence_trigger_rules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_obligation_id ON recurrence_trigger_rules(obligation_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_company_id ON recurrence_trigger_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_site_id ON recurrence_trigger_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_rule_type ON recurrence_trigger_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_event_id ON recurrence_trigger_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_is_active ON recurrence_trigger_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recurrence_trigger_rules_next_execution_date ON recurrence_trigger_rules(next_execution_date) WHERE is_active = true;

-- RLS Policies for recurrence_trigger_rules
ALTER TABLE recurrence_trigger_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS recurrence_trigger_rules_select_site_access ON recurrence_trigger_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_trigger_rules.site_id
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_trigger_rules_insert_staff_access ON recurrence_trigger_rules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_trigger_rules.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_trigger_rules_update_staff_access ON recurrence_trigger_rules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_trigger_rules.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_trigger_rules_delete_owner_admin_access ON recurrence_trigger_rules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_trigger_rules.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- 3. RECURRENCE CONDITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurrence_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    recurrence_trigger_rule_id UUIDid) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL
        CHECK (condition_type IN ('EVIDENCE_PRESENT', 'DEADLINE_MET', 'STATUS_CHANGE', 'CUSTOM')),
    condition_expression TEXT NOT NULL,
    condition_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_schedule_id ON recurrence_conditions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_recurrence_trigger_rule_id ON recurrence_conditions(recurrence_trigger_rule_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_company_id ON recurrence_conditions(company_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_site_id ON recurrence_conditions(site_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_condition_type ON recurrence_conditions(condition_type);
CREATE INDEX IF NOT EXISTS idx_recurrence_conditions_is_active ON recurrence_conditions(is_active);

-- RLS Policies for recurrence_conditions
ALTER TABLE recurrence_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS recurrence_conditions_select_site_access ON recurrence_conditions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_conditions.site_id
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_conditions_insert_staff_access ON recurrence_conditions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_conditions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_conditions_update_staff_access ON recurrence_conditions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_conditions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurrence_conditions_delete_owner_admin_access ON recurrence_conditions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurrence_conditions.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Update updated_at for recurrence_events
CREATE OR REPLACE FUNCTION update_recurrence_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurrence_events_updated_at
    BEFORE UPDATE ON recurrence_events
    FOR EACH ROW
    EXECUTE FUNCTION update_recurrence_events_updated_at();

-- Update updated_at for recurrence_trigger_rules
CREATE OR REPLACE FUNCTION update_recurrence_trigger_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurrence_trigger_rules_updated_at
    BEFORE UPDATE ON recurrence_trigger_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_recurrence_trigger_rules_updated_at();

-- Update updated_at for recurrence_conditions
CREATE OR REPLACE FUNCTION update_recurrence_conditions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurrence_conditions_updated_at
    BEFORE UPDATE ON recurrence_conditions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurrence_conditions_updated_at();



-- Deferred Foreign Key Constraints
-- Deferred FK: event_id -> recurrence_events
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurrence_events') THEN
    ALTER TABLE recurrence_events 
    ADD CONSTRAINT fk_recurrence_events_event_id
    FOREIGN KEY (event_id) REFERENCES recurrence_events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Deferred FK: recurrence_trigger_rule_id -> recurrence_trigger_rules
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurrence_trigger_rules') THEN
    ALTER TABLE recurrence_events 
    ADD CONSTRAINT fk_recurrence_events_recurrence_trigger_rule_id
    FOREIGN KEY (recurrence_trigger_rule_id) REFERENCES recurrence_trigger_rules(id) ON DELETE SET NULL;
  END IF;
END $$;