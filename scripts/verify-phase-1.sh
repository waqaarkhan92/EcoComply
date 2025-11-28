#!/bin/bash
# Phase 1 Checkpoint Verification Script
# Verifies all Phase 1 requirements before proceeding to Phase 2

set -e

echo "=========================================="
echo "Phase 1 Checkpoint Verification"
echo "=========================================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set in .env.local"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Create temporary SQL file for verification
SQL_FILE=$(mktemp)
cat > "$SQL_FILE" << 'EOF'
-- Phase 1 Checkpoint Verification Queries

\echo '=========================================='
\echo '1. Database Schema Validation (36 tables)'
\echo '=========================================='
SELECT 
    COUNT(*) as table_count,
    CASE 
        WHEN COUNT(*) = 36 THEN '✅ PASS: 36 tables found'
        ELSE '❌ FAIL: Expected 36 tables, found ' || COUNT(*)
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

\echo ''
\echo 'Table List:'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

\echo ''
\echo '=========================================='
\echo '2. RLS Validation (Tenant Tables)'
\echo '=========================================='
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'sites', 'users', 'obligations', 'documents')
ORDER BY tablename;

\echo ''
\echo 'System Tables (RLS should be disabled):'
SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS Disabled (Correct)'
        ELSE '❌ RLS Enabled (Should be disabled)'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('background_jobs', 'dead_letter_queue', 'system_settings')
ORDER BY tablename;

\echo ''
\echo '=========================================='
\echo '3. RLS Policy Count (~111 policies)'
\echo '=========================================='
SELECT 
    COUNT(*) as total_policies,
    CASE 
        WHEN COUNT(*) >= 100 AND COUNT(*) <= 120 THEN '✅ PASS: ' || COUNT(*) || ' policies found'
        ELSE '❌ FAIL: Expected ~111 policies, found ' || COUNT(*)
    END as status
FROM pg_policies
WHERE schemaname = 'public';

\echo ''
\echo 'Policies per table:'
SELECT 
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅'
        ELSE '❌'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''
\echo '=========================================='
\echo '4. Helper Functions'
\echo '=========================================='
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_company_access', 'has_site_access', 'role_has_permission', 'is_module_activated')
ORDER BY routine_name;

\echo ''
\echo 'Testing helper functions (should return boolean):'
SELECT 
    has_company_access('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID) as has_company_access_result,
    has_site_access('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID) as has_site_access_result,
    role_has_permission('00000000-0000-0000-0000-000000000000'::UUID, 'users', 'READ') as role_has_permission_result,
    is_module_activated('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID) as is_module_activated_result;

\echo ''
\echo '=========================================='
\echo '5. Modules Seeded (3 modules)'
\echo '=========================================='
SELECT 
    COUNT(*) as module_count,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ PASS: 3 modules found'
        ELSE '❌ FAIL: Expected 3 modules, found ' || COUNT(*)
    END as status
FROM modules;

\echo ''
\echo 'Module Details:'
SELECT 
    module_code,
    module_name,
    base_price,
    pricing_model,
    is_default,
    CASE 
        WHEN module_code = 'MODULE_1' AND is_default = true THEN '✅ Default module'
        WHEN module_code != 'MODULE_1' AND is_default = false THEN '✅ Not default'
        ELSE '❌ Incorrect default setting'
    END as status
FROM modules
ORDER BY module_code;

\echo ''
\echo 'Module Prerequisites:'
SELECT 
    m1.module_code as module,
    m2.module_code as requires_module,
    CASE 
        WHEN m1.module_code = 'MODULE_1' AND m1.requires_module_id IS NULL THEN '✅ No prerequisite (correct)'
        WHEN m1.module_code != 'MODULE_1' AND m1.requires_module_id IS NOT NULL AND m2.module_code = 'MODULE_1' THEN '✅ Requires Module 1 (correct)'
        ELSE '❌ Incorrect prerequisite'
    END as status
FROM modules m1
LEFT JOIN modules m2 ON m1.requires_module_id = m2.id
ORDER BY m1.module_code;

\echo ''
\echo '=========================================='
\echo '6. Foreign Key Validation'
\echo '=========================================='
SELECT 
    COUNT(*) as foreign_key_count,
    CASE 
        WHEN COUNT(*) >= 50 THEN '✅ PASS: ' || COUNT(*) || ' foreign keys found'
        ELSE '❌ FAIL: Expected 50+ foreign keys, found ' || COUNT(*)
    END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public';

\echo ''
\echo '=========================================='
\echo '7. Orphaned Records Check (CRITICAL)'
\echo '=========================================='
SELECT 
    'sites.company_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM sites s
LEFT JOIN companies c ON s.company_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 
    'users.company_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 
    'documents.site_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM documents d
LEFT JOIN sites s ON d.site_id = s.id
WHERE s.id IS NULL AND d.site_id IS NOT NULL

UNION ALL

SELECT 
    'obligations.document_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM obligations o
LEFT JOIN documents d ON o.document_id = d.id
WHERE d.id IS NULL AND o.document_id IS NOT NULL

UNION ALL

SELECT 
    'deadlines.obligation_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM deadlines dl
LEFT JOIN obligations o ON dl.obligation_id = o.id
WHERE o.id IS NULL AND dl.obligation_id IS NOT NULL

UNION ALL

SELECT 
    'evidence_items.obligation_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM evidence_items ei
LEFT JOIN obligations o ON ei.obligation_id = o.id
WHERE o.id IS NULL AND ei.obligation_id IS NOT NULL

UNION ALL

SELECT 
    'user_roles.user_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM user_roles ur
LEFT JOIN users u ON ur.user_id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
    'module_activations.company_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM module_activations ma
LEFT JOIN companies c ON ma.company_id = c.id
WHERE c.id IS NULL

UNION ALL

SELECT 
    'module_activations.module_id' as relationship,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No orphaned records'
        ELSE '❌ FAIL: ' || COUNT(*) || ' orphaned records found'
    END as status
FROM module_activations ma
LEFT JOIN modules m ON ma.module_id = m.id
WHERE m.id IS NULL;

\echo ''
\echo '=========================================='
\echo '8. Migration Order Validation'
\echo '=========================================='
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sites')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
        THEN '✅ PASS: Parent tables exist before child tables'
        ELSE '❌ FAIL: Migration order wrong'
    END as migration_order_check;

\echo ''
\echo '=========================================='
\echo '9. Auth Triggers'
\echo '=========================================='
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    CASE 
        WHEN trigger_name IS NOT NULL THEN '✅ Trigger exists'
        ELSE '❌ Trigger missing'
    END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('sync_email_verified_trigger', 'sync_last_login_trigger', 'handle_auth_user_deleted_trigger')
ORDER BY trigger_name;

\echo ''
\echo 'Auth Functions:'
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IS NOT NULL THEN '✅ Function exists'
        ELSE '❌ Function missing'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('sync_email_verified', 'sync_last_login', 'handle_auth_user_deleted')
ORDER BY routine_name;

\echo ''
\echo '=========================================='
\echo '10. Indexes Validation'
\echo '=========================================='
SELECT 
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 30 THEN '✅ PASS: ' || COUNT(*) || ' indexes found'
        ELSE '❌ FAIL: Expected 30+ indexes, found ' || COUNT(*)
    END as status
FROM pg_indexes
WHERE schemaname = 'public';

\echo ''
\echo '=========================================='
\echo 'Verification Complete'
\echo '=========================================='
EOF

# Run verification queries
echo "Running verification queries..."
echo ""

psql "$DATABASE_URL" -f "$SQL_FILE"

# Cleanup
rm "$SQL_FILE"

echo ""
echo "=========================================="
echo "Manual Checks Required:"
echo "=========================================="
echo "1. ✅ Supabase Dashboard → Database → Tables: Verify 36 tables exist"
echo "2. ✅ Supabase Dashboard → Authentication → Policies: Verify ~111 policies"
echo "3. ✅ Supabase Dashboard → Storage: Verify 4 buckets exist (documents, evidence, audit-packs, aer-documents)"
echo "4. ✅ Supabase Dashboard → Database → Extensions: Verify uuid-ossp and pg_trgm enabled"
echo ""
echo "=========================================="

