-- Migration: Add Performance Indexes
-- Purpose: Add critical indexes for query performance as application scales
-- Date: 2025-12-03
-- Author: System Optimization Audit

-- ==============================================================================
-- OBLIGATIONS TABLE INDEXES
-- ==============================================================================

-- Primary filtering index: site + status + review_status (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_site_status
  ON obligations(site_id, status, review_status)
  WHERE deleted_at IS NULL;

-- Document lookup index (foreign key navigation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_document
  ON obligations(document_id)
  WHERE deleted_at IS NULL;

-- Deadline filtering index (compliance clock queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_deadline
  ON obligations(deadline_date)
  WHERE deleted_at IS NULL AND deadline_date IS NOT NULL;

-- Full-text search index (search functionality)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_search
  ON obligations USING gin(to_tsvector('english',
    COALESCE(obligation_title, '') || ' ' || COALESCE(original_text, '')));

-- Category filtering index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_category
  ON obligations(category)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- DOCUMENTS TABLE INDEXES
-- ==============================================================================

-- Primary filtering index: site + type + extraction status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_site_type
  ON documents(site_id, document_type, extraction_status)
  WHERE deleted_at IS NULL;

-- Extraction queue index (background job worker queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_extraction_status
  ON documents(extraction_status, created_at)
  WHERE deleted_at IS NULL AND extraction_status IN ('PENDING', 'PROCESSING');

-- Upload date index (sorting by recency)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_upload_date
  ON documents(upload_date DESC)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- OBLIGATION_EVIDENCE_LINKS TABLE INDEXES
-- ==============================================================================

-- Obligation lookup (most common: get evidence for obligation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_links_obligation
  ON obligation_evidence_links(obligation_id)
  WHERE deleted_at IS NULL;

-- Evidence lookup (reverse: get obligations for evidence)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_links_evidence
  ON obligation_evidence_links(evidence_id)
  WHERE deleted_at IS NULL;

-- Composite for link status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_links_status
  ON obligation_evidence_links(obligation_id, link_status)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- EVIDENCE TABLE INDEXES
-- ==============================================================================

-- Site + type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_site_type
  ON evidence(site_id, evidence_type)
  WHERE deleted_at IS NULL;

-- Expiry tracking index (expiring evidence queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_expiry
  ON evidence(expiry_date)
  WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

-- ==============================================================================
-- SITES TABLE INDEXES
-- ==============================================================================

-- Company lookup (multi-tenant queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_company
  ON sites(company_id)
  WHERE deleted_at IS NULL;

-- Compliance score index (dashboard stats)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_compliance_score
  ON sites(compliance_score DESC)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- BACKGROUND_JOBS TABLE INDEXES
-- ==============================================================================

-- Job queue index (worker polling pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_jobs_queue
  ON background_jobs(status, priority DESC, created_at)
  WHERE status IN ('PENDING', 'RUNNING');

-- Document job lookup (correlation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_background_jobs_document
  ON background_jobs(document_id)
  WHERE document_id IS NOT NULL;

-- ==============================================================================
-- USERS TABLE INDEXES
-- ==============================================================================

-- Company lookup (org-level queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_company
  ON users(company_id);

-- Email lookup (login, password reset)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON users(email);

-- ==============================================================================
-- AUDIT_PACKS TABLE INDEXES
-- ==============================================================================

-- Site lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_packs_site
  ON audit_packs(site_id)
  WHERE deleted_at IS NULL;

-- Status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_packs_status
  ON audit_packs(status)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- COMPLIANCE_CLOCKS TABLE INDEXES
-- ==============================================================================

-- Deadline tracking index (primary use case)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_clocks_deadline
  ON compliance_clocks(due_date, urgency_level)
  WHERE deleted_at IS NULL;

-- Site filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_clocks_site
  ON compliance_clocks(site_id)
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- RULE_LIBRARY TABLE INDEXES
-- ==============================================================================

-- Pattern matching index (document extraction lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rule_library_active
  ON rule_library(is_active)
  WHERE is_active = true AND deleted_at IS NULL;

-- Module + regulator filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rule_library_module_regulator
  ON rule_library(module_type, regulator)
  WHERE is_active = true AND deleted_at IS NULL;

-- ==============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================================================

-- Update table statistics for optimal query planning
ANALYZE obligations;
ANALYZE documents;
ANALYZE obligation_evidence_links;
ANALYZE evidence;
ANALYZE sites;
ANALYZE background_jobs;
ANALYZE users;
ANALYZE audit_packs;
ANALYZE compliance_clocks;
ANALYZE rule_library;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Verify indexes were created
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('obligations', 'documents', 'obligation_evidence_links', 'evidence', 'sites')
-- ORDER BY tablename, indexname;
