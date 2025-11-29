-- Migration: 20250128000012_enable_rls_on_tables.sql
-- Description: Enable Row Level Security on all tenant-scoped tables
-- Author: Build System
-- Date: 2025-01-28
-- Order: Phase 1.4 - After helper functions, before policies

-- ============================================================================
-- ENABLE RLS ON ALL TENANT-SCOPED TABLES
-- ============================================================================

-- Core Entity Tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Module 1 Tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulator_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_packs ENABLE ROW LEVEL SECURITY;

-- Module 2 Tables (Trade Effluent)
ALTER TABLE parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceedances ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharge_volumes ENABLE ROW LEVEL SECURITY;

-- Module 3 Tables (MCPD/Generators)
ALTER TABLE generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_hour_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE aer_documents ENABLE ROW LEVEL SECURITY;

-- System Tables (tenant-scoped)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_imports ENABLE ROW LEVEL SECURITY;

-- Cross-Module Tables
ALTER TABLE module_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultant_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLES WITH RLS DISABLED (System tables, not tenant-scoped)
-- ============================================================================
-- background_jobs - System table for job queue management (no tenant isolation needed)
-- dead_letter_queue - System table for failed jobs (no tenant isolation needed)
-- system_settings - Global system configuration (not tenant-scoped, RLS disabled per Database Schema Section 7.9)

