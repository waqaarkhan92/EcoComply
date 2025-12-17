-- Migration: 20250207000001_create_pack_contents_table.sql
-- Description: Create pack_contents table for version-locked evidence snapshots
--              and add missing columns to audit_packs
-- Author: EcoComply Build System
-- Date: 2025-02-07

-- ============================================================================
-- SECTION 1: ADD MISSING COLUMNS TO audit_packs
-- ============================================================================

-- The pack-generation-job.ts expects these columns which are missing
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'EXPIRED'));

ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS file_path TEXT;

ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_sla_seconds INTEGER;

ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_audit_packs_status ON audit_packs(status);

-- ============================================================================
-- SECTION 2: CREATE pack_contents TABLE (VERSION-LOCKED EVIDENCE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pack_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent pack reference
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,

    -- Content type
    content_type TEXT NOT NULL CHECK (content_type IN ('OBLIGATION', 'EVIDENCE')),

    -- Obligation snapshot (if content_type = 'OBLIGATION')
    obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
    obligation_snapshot JSONB,

    -- Evidence snapshot (if content_type = 'EVIDENCE')
    evidence_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    evidence_snapshot JSONB,

    -- File metadata for evidence items
    file_name TEXT,
    file_type TEXT,
    file_size_bytes INTEGER,
    file_hash TEXT,
    upload_timestamp TIMESTAMPTZ,

    -- Storage path for the snapshotted file
    storage_path TEXT,

    -- Order within the pack
    display_order INTEGER NOT NULL DEFAULT 0,

    -- Inclusion metadata
    included_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    included_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_pack_contents_pack_id ON pack_contents(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_contents_content_type ON pack_contents(content_type);
CREATE INDEX IF NOT EXISTS idx_pack_contents_obligation_id ON pack_contents(obligation_id) WHERE obligation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pack_contents_evidence_id ON pack_contents(evidence_id) WHERE evidence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pack_contents_display_order ON pack_contents(pack_id, display_order);

-- ============================================================================
-- SECTION 3: ENABLE RLS
-- ============================================================================

ALTER TABLE pack_contents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access pack_contents if they can access the parent pack
CREATE POLICY pack_contents_policy ON pack_contents
    FOR ALL USING (
        pack_id IN (
            SELECT id FROM audit_packs
            WHERE company_id IN (SELECT get_user_company_ids())
        )
    );

-- ============================================================================
-- SECTION 4: UPDATED_AT TRIGGER FOR audit_packs
-- ============================================================================

DROP TRIGGER IF EXISTS set_updated_at_audit_packs ON audit_packs;
CREATE TRIGGER set_updated_at_audit_packs
    BEFORE UPDATE ON audit_packs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 5: HELPER FUNCTION TO SNAPSHOT EVIDENCE INTO PACK
-- ============================================================================

CREATE OR REPLACE FUNCTION snapshot_evidence_to_pack(
    p_pack_id UUID,
    p_evidence_id UUID,
    p_included_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_content_id UUID;
    v_evidence RECORD;
BEGIN
    -- Get the evidence item
    SELECT * INTO v_evidence FROM evidence_items WHERE id = p_evidence_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence item not found: %', p_evidence_id;
    END IF;

    -- Insert the snapshot
    INSERT INTO pack_contents (
        pack_id,
        content_type,
        evidence_id,
        evidence_snapshot,
        file_name,
        file_type,
        file_size_bytes,
        file_hash,
        upload_timestamp,
        storage_path,
        included_by
    ) VALUES (
        p_pack_id,
        'EVIDENCE',
        p_evidence_id,
        to_jsonb(v_evidence),
        v_evidence.file_name,
        v_evidence.file_type,
        v_evidence.file_size_bytes,
        v_evidence.file_hash,
        v_evidence.created_at,
        v_evidence.storage_path,
        p_included_by
    ) RETURNING id INTO v_content_id;

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 6: HELPER FUNCTION TO SNAPSHOT OBLIGATION INTO PACK
-- ============================================================================

CREATE OR REPLACE FUNCTION snapshot_obligation_to_pack(
    p_pack_id UUID,
    p_obligation_id UUID,
    p_included_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_content_id UUID;
    v_obligation RECORD;
BEGIN
    -- Get the obligation
    SELECT * INTO v_obligation FROM obligations WHERE id = p_obligation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Obligation not found: %', p_obligation_id;
    END IF;

    -- Insert the snapshot
    INSERT INTO pack_contents (
        pack_id,
        content_type,
        obligation_id,
        obligation_snapshot,
        included_by
    ) VALUES (
        p_pack_id,
        'OBLIGATION',
        p_obligation_id,
        to_jsonb(v_obligation),
        p_included_by
    ) RETURNING id INTO v_content_id;

    RETURN v_content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
