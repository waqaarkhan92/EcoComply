#!/bin/bash
# Comprehensive Phase 1 Completion Verification
# Verifies ALL Phase 1 requirements are met

set -e

echo "=========================================="
echo "Phase 1 Complete Verification"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

echo "Checking Phase 1 Requirements..."
echo ""

# Create comprehensive verification SQL
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << 'EOF'
-- Phase 1 Complete Verification

\echo '=========================================='
\echo 'PHASE 1.1: SUPABASE SETUP'
\echo '=========================================='
\echo '1.1.1: Extensions'
SELECT 
    extname as extension_name,
    CASE 
        WHEN extname IN ('uuid-ossp', 'pg_trgm') THEN '✅ Required extension'
        ELSE '⚠️  Other extension'
    END as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm')
ORDER BY extname;

\echo ''
\echo '1.1.2: Storage Buckets (Manual Check Required)'
\echo '⚠️  MANUAL: Check Supabase Dashboard → Storage for 4 buckets:'
\echo '   - documents'
\echo '   - evidence'
\echo '   - audit-packs'
\echo '   - aer-documents'

\echo ''
\echo '=========================================='
\echo 'PHASE 1.2: DATABASE SCHEMA (37 tables)'
\echo '=========================================='
\echo '1.2.1: Core Tables (Phase 1)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('companies', 'users', 'sites', 'modules') THEN '✅ Core table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'users', 'sites', 'modules')
ORDER BY table_name;

\echo ''
\echo '1.2.2: User Management Tables (Phase 2)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('user_roles', 'user_site_assignments') THEN '✅ User management table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_roles', 'user_site_assignments')
ORDER BY table_name;

\echo ''
\echo '1.2.3: Import Support Tables (Phase 3)'
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'excel_imports' THEN '✅ Import table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'excel_imports';

\echo ''
\echo '1.2.4: Module 1 Tables (Phases 4-5)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('documents', 'document_site_assignments', 'obligations', 'schedules', 'deadlines', 'evidence_items', 'obligation_evidence_links', 'regulator_questions', 'audit_packs') THEN '✅ Module 1 table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('documents', 'document_site_assignments', 'obligations', 'schedules', 'deadlines', 'evidence_items', 'obligation_evidence_links', 'regulator_questions', 'audit_packs')
ORDER BY table_name;

\echo ''
\echo '1.2.5: Module 2 Tables (Phase 6)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('parameters', 'lab_results', 'exceedances', 'discharge_volumes') THEN '✅ Module 2 table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('parameters', 'lab_results', 'exceedances', 'discharge_volumes')
ORDER BY table_name;

\echo ''
\echo '1.2.6: Module 3 Tables (Phase 7)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('generators', 'run_hour_records', 'stack_tests', 'maintenance_records', 'aer_documents') THEN '✅ Module 3 table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('generators', 'run_hour_records', 'stack_tests', 'maintenance_records', 'aer_documents')
ORDER BY table_name;

\echo ''
\echo '1.2.7: System Tables (Phase 8)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('notifications', 'background_jobs', 'dead_letter_queue', 'audit_logs', 'review_queue_items', 'escalations', 'system_settings') THEN '✅ System table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('notifications', 'background_jobs', 'dead_letter_queue', 'audit_logs', 'review_queue_items', 'escalations', 'system_settings')
ORDER BY table_name;

\echo ''
\echo '1.2.8: Cross-Module Tables (Phase 9)'
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('module_activations', 'cross_sell_triggers', 'extraction_logs', 'consultant_client_assignments', 'pack_distributions') THEN '✅ Cross-module table'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('module_activations', 'cross_sell_triggers', 'extraction_logs', 'consultant_client_assignments', 'pack_distributions')
ORDER BY table_name;

\echo ''
\echo '1.2.9: Total Table Count'
SELECT 
    COUNT(*) as total_tables,
    CASE 
        WHEN COUNT(*) >= 36 THEN '✅ All tables created'
        ELSE '❌ Missing tables'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

\echo ''
\echo '=========================================='
\echo 'PHASE 1.3: INDEXES AND CONSTRAINTS'
\echo '=========================================='
\echo '1.3.1: Indexes'
SELECT 
    COUNT(*) as total_indexes,
    CASE 
        WHEN COUNT(*) >= 30 THEN '✅ Sufficient indexes'
        ELSE '❌ Missing indexes'
    END as status
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''
\echo '1.3.2: Foreign Keys'
SELECT 
    COUNT(*) as total_foreign_keys,
    CASE 
        WHEN COUNT(*) >= 50 THEN '✅ Sufficient foreign keys'
        ELSE '❌ Missing foreign keys'
    END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';

\echo ''
\echo '1.3.3: CHECK Constraints'
SELECT 
    COUNT(*) as total_check_constraints,
    CASE 
        WHEN COUNT(*) >= 20 THEN '✅ Sufficient CHECK constraints'
        ELSE '⚠️  May be missing CHECK constraints'
    END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
AND table_schema = 'public';

\echo ''
\echo '=========================================='
\echo 'PHASE 1.4: RLS POLICIES'
\echo '=========================================='
\echo '1.4.1: RLS Enabled on Tenant Tables'
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled (should be enabled)'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'sites', 'users', 'obligations', 'documents', 'evidence_items', 'module_activations')
ORDER BY tablename;

\echo ''
\echo '1.4.2: RLS Disabled on System Tables'
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS Disabled (correct)'
        ELSE '❌ RLS Enabled (should be disabled)'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('background_jobs', 'dead_letter_queue', 'system_settings')
ORDER BY tablename;

\echo ''
\echo '1.4.3: RLS Policies Count'
SELECT 
    COUNT(*) as total_policies,
    CASE 
        WHEN COUNT(*) >= 100 THEN '✅ Sufficient policies'
        ELSE '❌ Missing policies'
    END as status
FROM pg_policies
WHERE schemaname = 'public';

\echo ''
\echo '1.4.4: RLS Helper Functions'
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('has_company_access', 'has_site_access', 'role_has_permission', 'is_module_activated') THEN '✅ Helper function'
        ELSE '❌ Missing'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_company_access', 'has_site_access', 'role_has_permission', 'is_module_activated')
ORDER BY routine_name;

\echo ''
\echo '=========================================='
\echo 'PHASE 1.5: SUPABASE AUTH INTEGRATION'
\echo '=========================================='
\echo '1.5.1: Auth Sync Functions'
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('sync_email_verified', 'sync_last_login', 'handle_auth_user_deleted') THEN '✅ Auth function'
        ELSE '❌ Missing'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('sync_email_verified', 'sync_last_login', 'handle_auth_user_deleted')
ORDER BY routine_name;

\echo ''
\echo '1.5.2: Auth Triggers (on auth.users)'
SELECT 
    trigger_name,
    event_object_table,
    event_object_schema,
    CASE 
        WHEN trigger_name IN ('sync_email_verified_trigger', 'sync_last_login_trigger', 'handle_auth_user_deleted_trigger') THEN '✅ Auth trigger'
        ELSE '❌ Missing'
    END as status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND trigger_name IN ('sync_email_verified_trigger', 'sync_last_login_trigger', 'handle_auth_user_deleted_trigger')
ORDER BY trigger_name;

\echo ''
\echo '=========================================='
\echo 'PHASE 1.6: SEED DATA'
\echo '=========================================='
\echo '1.6.1: Modules Seeded'
SELECT 
    module_code,
    module_name,
    base_price,
    pricing_model,
    is_default,
    CASE 
        WHEN module_code = 'MODULE_1' AND is_default = true THEN '✅ Default module'
        WHEN module_code IN ('MODULE_2', 'MODULE_3') AND is_default = false THEN '✅ Add-on module'
        ELSE '⚠️  Check configuration'
    END as status
FROM modules
ORDER BY module_code;

\echo ''
\echo '1.6.2: Module Prerequisites'
SELECT 
    m1.module_code as module,
    COALESCE(m2.module_code, 'None') as requires_module,
    CASE 
        WHEN m1.module_code = 'MODULE_1' AND m1.requires_module_id IS NULL THEN '✅ No prerequisite (correct)'
        WHEN m1.module_code != 'MODULE_1' AND m2.module_code = 'MODULE_1' THEN '✅ Requires Module 1 (correct)'
        ELSE '❌ Incorrect prerequisite'
    END as status
FROM modules m1
LEFT JOIN modules m2 ON m1.requires_module_id = m2.id
ORDER BY m1.module_code;

\echo ''
\echo '=========================================='
\echo 'PHASE 1 SUMMARY'
\echo '=========================================='
SELECT 
    'Tables' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) >= 36 THEN '✅' ELSE '❌' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'RLS Policies' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) >= 100 THEN '✅' ELSE '❌' END as status
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'Helper Functions' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 4 THEN '✅' ELSE '❌' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_company_access', 'has_site_access', 'role_has_permission', 'is_module_activated')

UNION ALL

SELECT 
    'Auth Functions' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 3 THEN '✅' ELSE '❌' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('sync_email_verified', 'sync_last_login', 'handle_auth_user_deleted')

UNION ALL

SELECT 
    'Auth Triggers' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 3 THEN '✅' ELSE '❌' END as status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND trigger_name IN ('sync_email_verified_trigger', 'sync_last_login_trigger', 'handle_auth_user_deleted_trigger')

UNION ALL

SELECT 
    'Modules Seeded' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) = 3 THEN '✅' ELSE '❌' END as status
FROM modules

UNION ALL

SELECT 
    'Extensions' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) >= 2 THEN '✅' ELSE '❌' END as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm')

UNION ALL

SELECT 
    'Foreign Keys' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) >= 50 THEN '✅' ELSE '❌' END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public'

UNION ALL

SELECT 
    'Indexes' as component,
    COUNT(*)::TEXT as count,
    CASE WHEN COUNT(*) >= 30 THEN '✅' ELSE '❌' END as status
FROM pg_indexes
WHERE schemaname = 'public';
EOF

# Run verification
psql "$DATABASE_URL" -f "$SQL_FILE"

# Cleanup
rm "$SQL_FILE"

echo ""
echo "=========================================="
echo "Manual Checks Required:"
echo "=========================================="
echo "1. Storage Buckets: Supabase Dashboard → Storage"
echo "   - documents"
echo "   - evidence"
echo "   - audit-packs"
echo "   - aer-documents"
echo ""
echo "2. CORS Configuration: Supabase Dashboard → Storage → Settings"
echo ""
echo "3. Backup Setup: Supabase Dashboard → Database → Backups"
echo ""
echo "4. Auth Configuration: Supabase Dashboard → Authentication → Settings"
echo "   - Email/Password enabled"
echo "   - Email templates configured"
echo "   - Password requirements: min 8 characters"
echo "   - JWT expiration: 24h access, 7d refresh"
echo ""

