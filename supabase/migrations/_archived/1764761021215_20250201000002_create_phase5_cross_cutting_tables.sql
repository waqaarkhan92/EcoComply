-- Phase 5: Cross-Cutting Features Tables
-- Recurring Tasks, Evidence Expiry Tracking, Pack Sharing Enhancement

-- ============================================================================
-- 1. RECURRING TASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL
        CHECK (task_type IN ('MONITORING', 'EVIDENCE_COLLECTION', 'REPORTING', 'MAINTENANCE', 'SAMPLING', 'INSPECTION')),
    task_title TEXT NOT NULL,
    task_description TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completion_notes TEXT,
    trigger_type TEXT NOT NULL
        CHECK (trigger_type IN ('SCHEDULE', 'EVENT_BASED', 'CONDITIONAL', 'MANUAL')),
    trigger_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_schedule_id ON recurring_tasks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_obligation_id ON recurring_tasks(obligation_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_company_id ON recurring_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_site_id ON recurring_tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_due_date ON recurring_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_status ON recurring_tasks(status);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_assigned_to ON recurring_tasks(assigned_to);

-- RLS Policies for recurring_tasks
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS recurring_tasks_select_site_access ON recurring_tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurring_tasks.site_id
        )
    );

CREATE POLICY IF NOT EXISTS recurring_tasks_insert_system_access ON recurring_tasks
    FOR INSERT
    WITH CHECK (false); -- Only system can create via background jobs

CREATE POLICY IF NOT EXISTS recurring_tasks_update_staff_access ON recurring_tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurring_tasks.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN', 'STAFF')
        )
    );

CREATE POLICY IF NOT EXISTS recurring_tasks_delete_owner_admin_access ON recurring_tasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = recurring_tasks.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- 2. EVIDENCE EXPIRY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_expiry_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES evidence_items(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    expiry_date DATE NOT NULL,
    days_until_expiry INTEGER NOT NULL,
    reminder_days INTEGER[] NOT NULL DEFAULT '{90, 30, 7}',
    reminders_sent INTEGER[] NOT NULL DEFAULT '{}',
    is_expired BOOLEAN NOT NULL DEFAULT false,
    expired_at TIMESTAMP WITH TIME ZONE,
    renewal_required BOOLEAN NOT NULL DEFAULT false,
    renewal_evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    renewal_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_evidence_id ON evidence_expiry_tracking(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_company_id ON evidence_expiry_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_site_id ON evidence_expiry_tracking(site_id);
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_expiry_date ON evidence_expiry_tracking(expiry_date);
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_is_expired ON evidence_expiry_tracking(is_expired) WHERE is_expired = false;
CREATE INDEX IF NOT EXISTS idx_evidence_expiry_tracking_days_until_expiry ON evidence_expiry_tracking(days_until_expiry) WHERE is_expired = false;

-- RLS Policies for evidence_expiry_tracking
ALTER TABLE evidence_expiry_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS evidence_expiry_tracking_select_site_access ON evidence_expiry_tracking
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = evidence_expiry_tracking.site_id
        )
    );

CREATE POLICY IF NOT EXISTS evidence_expiry_tracking_insert_system_access ON evidence_expiry_tracking
    FOR INSERT
    WITH CHECK (false); -- Only system can create via background jobs

CREATE POLICY IF NOT EXISTS evidence_expiry_tracking_update_system_access ON evidence_expiry_tracking
    FOR UPDATE
    USING (false); -- Only system can update via background jobs

CREATE POLICY IF NOT EXISTS evidence_expiry_tracking_delete_owner_admin_access ON evidence_expiry_tracking
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_site_access
            WHERE user_site_access.user_id = auth.uid()
            AND user_site_access.site_id = evidence_expiry_tracking.site_id
            AND user_site_access.role IN ('OWNER', 'ADMIN')
        )
    );

-- ============================================================================
-- 3. PACK SHARING (Enhancement - ensure table exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pack_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES users(id) ON DELETE SET NULL,
    access_token TEXT UNIQUE,
    distribution_method TEXT 
        CHECK (distribution_method IN ('EMAIL', 'SHARED_LINK')),
    distributed_to TEXT, -- Email address or recipient identifier
    shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_sharing_pack_id ON pack_sharing(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_sharing_company_id ON pack_sharing(company_id);
CREATE INDEX IF NOT EXISTS idx_pack_sharing_access_token ON pack_sharing(access_token);
CREATE INDEX IF NOT EXISTS idx_pack_sharing_expires_at ON pack_sharing(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pack_sharing_is_active ON pack_sharing(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pack_sharing_distribution_method ON pack_sharing(distribution_method) WHERE distribution_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pack_sharing_shared_at ON pack_sharing(shared_at);

-- RLS Policies for pack_sharing (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pack_sharing' 
        AND policyname = 'pack_sharing_select_pack_access'
    ) THEN
        ALTER TABLE pack_sharing ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY pack_sharing_select_pack_access ON pack_sharing
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM audit_packs
                    WHERE audit_packs.id = pack_sharing.pack_id
                    AND EXISTS (
                        SELECT 1 FROM user_site_access
                        WHERE user_site_access.user_id = auth.uid()
                        AND user_site_access.site_id = audit_packs.site_id
                    )
                )
            );
    END IF;
END $$;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Update updated_at for recurring_tasks
CREATE OR REPLACE FUNCTION update_recurring_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_tasks_updated_at
    BEFORE UPDATE ON recurring_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_tasks_updated_at();

-- Update updated_at for evidence_expiry_tracking
CREATE OR REPLACE FUNCTION update_evidence_expiry_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evidence_expiry_tracking_updated_at
    BEFORE UPDATE ON evidence_expiry_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_expiry_tracking_updated_at();

-- Update updated_at for pack_sharing
CREATE OR REPLACE FUNCTION update_pack_sharing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pack_sharing_updated_at
    BEFORE UPDATE ON pack_sharing
    FOR EACH ROW
    EXECUTE FUNCTION update_pack_sharing_updated_at();

