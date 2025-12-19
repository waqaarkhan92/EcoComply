-- Migration: 20250220000004_add_pack_generation_progress.sql
-- Description: Add generation_progress field to audit_packs for real-time progress tracking
-- Author: EcoComply Build System
-- Date: 2025-02-20

-- ============================================================================
-- SECTION 1: ADD generation_progress COLUMN TO audit_packs
-- ============================================================================

-- Add generation_progress field (0-100) to track pack generation progress
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0
    CHECK (generation_progress >= 0 AND generation_progress <= 100);

-- Add generation_stage to indicate current stage of generation
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_stage TEXT
    CHECK (generation_stage IN (
        'QUEUED',
        'GATHERING_DATA',
        'COLLECTING_EVIDENCE',
        'RENDERING_PDF',
        'UPLOADING',
        'FINALIZING',
        'COMPLETED',
        'FAILED'
    ));

-- Add index for querying packs by generation stage
CREATE INDEX IF NOT EXISTS idx_audit_packs_generation_stage
    ON audit_packs(generation_stage)
    WHERE generation_stage IS NOT NULL;

-- Add composite index for in-progress packs
CREATE INDEX IF NOT EXISTS idx_audit_packs_generating
    ON audit_packs(status, generation_progress)
    WHERE status IN ('PENDING', 'GENERATING');
