-- Migration: 20250207000002_add_regulatory_packs_audit_pack_id.sql
-- Description: Add audit_pack_id column to regulatory_packs table to link
--              regulatory pack validation to actual PDF generation
-- Author: EcoComply Build System
-- Date: 2025-02-07

-- ============================================================================
-- SECTION 1: ADD audit_pack_id COLUMN TO regulatory_packs
-- ============================================================================

-- Add column to link regulatory_packs to audit_packs
ALTER TABLE regulatory_packs ADD COLUMN IF NOT EXISTS audit_pack_id UUID REFERENCES audit_packs(id) ON DELETE SET NULL;

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_regulatory_packs_audit_pack_id ON regulatory_packs(audit_pack_id) WHERE audit_pack_id IS NOT NULL;

-- ============================================================================
-- SECTION 2: CREATE board_pack_detail_requests TABLE
-- ============================================================================
-- Required for Safeguard 2: Board Pack aggregation with detail access controls

CREATE TABLE IF NOT EXISTS board_pack_detail_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    section_requested TEXT NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    justification TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_board_pack_detail_requests_pack_id ON board_pack_detail_requests(pack_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_detail_requests_status ON board_pack_detail_requests(status);
CREATE INDEX IF NOT EXISTS idx_board_pack_detail_requests_requested_by ON board_pack_detail_requests(requested_by);

-- Enable RLS
ALTER TABLE board_pack_detail_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access their own requests or requests for packs in their company
CREATE POLICY board_pack_detail_requests_policy ON board_pack_detail_requests
    FOR ALL USING (
        requested_by = auth.uid()
        OR pack_id IN (
            SELECT id FROM audit_packs WHERE company_id IN (SELECT get_user_company_ids())
        )
    );

-- ============================================================================
-- SECTION 3: CREATE tender_pack_incident_optins TABLE
-- ============================================================================
-- Required for Safeguard 4: Tender Pack incident opt-in

CREATE TABLE IF NOT EXISTS tender_pack_incident_optins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES audit_packs(id) ON DELETE CASCADE,
    opt_in_decision TEXT NOT NULL CHECK (opt_in_decision IN ('INCLUDED', 'EXCLUDED')),
    disclosure_level TEXT CHECK (disclosure_level IN ('SUMMARY', 'DETAILED', 'FULL')),
    approved_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    justification TEXT,
    incident_data_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tender_pack_incident_optins_pack_id ON tender_pack_incident_optins(pack_id);
CREATE INDEX IF NOT EXISTS idx_tender_pack_incident_optins_opt_in_decision ON tender_pack_incident_optins(opt_in_decision);

-- Enable RLS
ALTER TABLE tender_pack_incident_optins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can access opt-ins for packs in their company
CREATE POLICY tender_pack_incident_optins_policy ON tender_pack_incident_optins
    FOR ALL USING (
        pack_id IN (
            SELECT id FROM audit_packs WHERE company_id IN (SELECT get_user_company_ids())
        )
    );

-- ============================================================================
-- SECTION 4: UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS set_updated_at_board_pack_detail_requests ON board_pack_detail_requests;
CREATE TRIGGER set_updated_at_board_pack_detail_requests
    BEFORE UPDATE ON board_pack_detail_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
