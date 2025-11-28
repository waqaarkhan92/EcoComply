-- Migration: 20250128000010_create_phase1_3_indexes_and_constraints.sql
-- Description: Create full-text search indexes, composite indexes, and verify all constraints
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.3 - After all tables are created

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Full-text search on documents (title and extracted_text)
-- Uses GIN index for fast full-text search queries
CREATE INDEX IF NOT EXISTS idx_documents_fulltext ON documents 
USING gin(to_tsvector('english', title || ' ' || COALESCE(extracted_text, '')));

-- Trigram similarity for fuzzy search on document titles
-- Requires pg_trgm extension (already enabled in Phase 1.1)
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON documents 
USING gin(title gin_trgm_ops);

-- Full-text search on obligations (obligation_title, obligation_description and original_text)
CREATE INDEX IF NOT EXISTS idx_obligations_fulltext ON obligations 
USING gin(to_tsvector('english', obligation_title || ' ' || COALESCE(obligation_description, '') || ' ' || original_text));

-- ============================================================================
-- COMPOSITE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for deadline status and due date queries
-- Partial index for active deadlines only
CREATE INDEX IF NOT EXISTS idx_deadlines_status_due_date ON deadlines(status, due_date) 
WHERE status IN ('PENDING', 'DUE_SOON', 'OVERDUE');

-- Composite index for obligation-evidence linking queries
CREATE INDEX IF NOT EXISTS idx_obligation_evidence_links_obligation ON obligation_evidence_links(obligation_id, evidence_id);

-- Composite index for module activation lookups (active only)
CREATE INDEX IF NOT EXISTS idx_module_activations_company_module ON module_activations(company_id, module_id) 
WHERE status = 'ACTIVE';

-- Composite index for background job status, priority, and scheduling
-- Partial index for pending/running jobs only
CREATE INDEX IF NOT EXISTS idx_background_jobs_status_priority ON background_jobs(status, priority, scheduled_for) 
WHERE status IN ('PENDING', 'RUNNING');

-- Composite index for job health monitoring
-- Partial index for unhealthy jobs only
CREATE INDEX IF NOT EXISTS idx_background_jobs_health ON background_jobs(health_status, last_heartbeat) 
WHERE health_status != 'HEALTHY';

-- Composite index for deadline calculation queries
-- Partial index for active obligations only
CREATE INDEX IF NOT EXISTS idx_obligations_deadline_calc ON obligations(company_id, site_id, frequency, deadline_date) 
WHERE status != 'COMPLETED';

-- Composite index for evidence linking queries
CREATE INDEX IF NOT EXISTS idx_evidence_items_obligation_lookup ON evidence_items(company_id, site_id, created_at);

-- Composite index for audit pack generation queries
-- Partial index for completed/in-progress obligations only
CREATE INDEX IF NOT EXISTS idx_obligations_audit_pack ON obligations(document_id, status) 
WHERE status IN ('COMPLETED', 'IN_PROGRESS');

-- ============================================================================
-- RLS PERFORMANCE INDEXES (Already created in Phase 9, but verifying)
-- ============================================================================

-- These indexes are critical for RLS policy performance
-- They were created in Phase 9 migration, but we verify they exist here

-- Verify user_roles index for RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_user_roles_user_id_role'
    ) THEN
        CREATE INDEX idx_user_roles_user_id_role ON user_roles(user_id, role);
    END IF;
END $$;

-- Verify user_site_assignments index for RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_user_site_assignments_user_id_site_id'
    ) THEN
        CREATE INDEX idx_user_site_assignments_user_id_site_id ON user_site_assignments(user_id, site_id);
    END IF;
END $$;

-- Verify consultant_client_assignments indexes for RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_consultant_client_assignments_consultant_id_active'
    ) THEN
        CREATE INDEX idx_consultant_client_assignments_consultant_id_active 
        ON consultant_client_assignments(consultant_id) WHERE status = 'ACTIVE';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_consultant_client_assignments_client_company_id_active'
    ) THEN
        CREATE INDEX idx_consultant_client_assignments_client_company_id_active 
        ON consultant_client_assignments(client_company_id) WHERE status = 'ACTIVE';
    END IF;
END $$;

-- Verify module_activations index for RLS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_module_activations_company_id_module_id_active'
    ) THEN
        CREATE INDEX idx_module_activations_company_id_module_id_active 
        ON module_activations(company_id, module_id) WHERE status = 'ACTIVE';
    END IF;
END $$;

-- ============================================================================
-- VERIFY CONSTRAINTS
-- ============================================================================

-- Note: Most constraints were created inline with table definitions
-- This section verifies critical constraints exist

-- Verify CHECK constraints exist (they should be created with tables)
-- We'll just document what should exist - actual verification happens via application layer

-- ============================================================================
-- INDEX VERIFICATION QUERIES (for manual verification)
-- ============================================================================

-- Uncomment to verify indexes were created:
-- SELECT indexname, tablename, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Verify full-text search indexes:
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE indexname IN ('idx_documents_fulltext', 'idx_documents_title_trgm', 'idx_obligations_fulltext');

-- Verify composite indexes:
-- SELECT indexname, tablename, indexdef 
-- FROM pg_indexes 
-- WHERE indexname LIKE 'idx_%_status_%' OR indexname LIKE 'idx_%_company_%' OR indexname LIKE 'idx_%_obligation_%';

