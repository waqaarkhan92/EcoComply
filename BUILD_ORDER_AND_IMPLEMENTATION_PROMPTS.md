# Oblicore Platform - Build Order & Implementation Prompts

**Version:** 1.0  
**Created:** 2025-01-28  
**Purpose:** Step-by-step build order with implementation prompts for each phase

---

## Overview

This document provides a phased build order for implementing the Oblicore compliance platform. Each phase includes:
- Dependencies (what must be completed first)
- Specific tasks (numbered, actionable)
- Implementation prompts (ready-to-use for AI assistants)
- Testing requirements
- Acceptance criteria

**Total Phases:** 7  
**Estimated Timeline:** 12-16 weeks for full v1.0 launch

---

## Dependency Graph

```
Phase 1: Foundation
    ↓
Phase 2: Core API Layer
    ↓
Phase 3: AI/Extraction Layer
    ↓
Phase 4: Background Jobs
    ↓
Phase 5: Frontend Core
    ↓
Phase 6: Frontend Features
    ↓
Phase 7: Integration & Testing
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 5 (must be sequential)  
**Parallel Work:** Phase 4 and Phase 6 can be developed in parallel after Phase 3

---

# PHASE 1: Foundation (Database, Auth, RLS)

**Duration:** 2-3 weeks  
**Complexity:** High  
**Dependencies:** None (starting point)

## Phase 1.1: Supabase Project Setup

**Task 1.1.1: Create Supabase Project**
- Create new Supabase project in EU (London) region
- Configure project settings
- Set up environment variables

**Implementation Prompt:**
```
Create a Supabase project setup guide for Oblicore platform:
- Region: EU (London) for UK data residency
- Project name: Oblicore
- Enable Row Level Security
- Configure connection pooling (PgBouncer)
- Set up environment variables:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - DATABASE_URL (connection pooler URL)
- Create storage buckets:
  - documents (for permit PDFs)
  - evidence (for evidence files)
  - audit-packs (for generated packs)
  - aer-documents (for Module 3 AER files)
- Configure CORS for frontend domain
- Set file size limits: 50MB for documents, 20MB for evidence
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 1.1
```

**Task 1.1.2: Database Extensions**
- Enable required PostgreSQL extensions

**Implementation Prompt:**
```
Enable PostgreSQL extensions in Supabase:
- uuid-ossp (for UUID generation)
- pg_trgm (for fuzzy text search)
- Verify JSONB support (built-in)
- Reference: EP_Compliance_Database_Schema.md Section 13
```

## Phase 1.2: Database Schema Creation

**Task 1.2.1: Create Core Tables (Phase 1)**
- Create companies, users, sites, modules tables
- Follow exact schema from EP_Compliance_Database_Schema.md

**Implementation Prompt:**
```
Create Phase 1 core tables in Supabase SQL editor:
1. companies table (EP_Compliance_Database_Schema.md Section 2.1)
   - Include: id, name, billing_email, subscription_tier, stripe_customer_id
   - Add indexes: idx_companies_stripe_customer_id, idx_companies_is_active
2. users table (Section 2.3)
   - Include: id, email, company_id, auth_user_id (Supabase Auth UUID)
   - Link to Supabase Auth: auth_user_id REFERENCES auth.users(id)
3. sites table (Section 2.2)
   - Include: id, company_id, name, regulator, water_company, address
4. modules table (Section 3.1)
   - Include: id, module_code, module_name, requires_module_id, base_price, pricing_model
   - Seed initial data: Module 1 (Environmental Permits), Module 2 (Trade Effluent), Module 3 (MCPD/Generators)
   - Reference: Canonical_Dictionary.md Section C.4 for module definitions
   
Use exact field names, types, and constraints from Database Schema.
Enable RLS on all tables (policies will be added in Phase 1.4).
```

**Task 1.2.2: Create User Management Tables (Phase 2)**
- Create user_roles, user_site_assignments

**Implementation Prompt:**
```
Create Phase 2 user management tables:
1. user_roles table (Database Schema Section 2.4)
   - Include: id, user_id, role (CHECK: OWNER, ADMIN, STAFF, CONSULTANT, VIEWER)
   - Foreign key: user_id → users.id
2. user_site_assignments table (Section 2.5)
   - Include: id, user_id, site_id
   - Foreign keys: user_id → users.id, site_id → sites.id
   - Unique constraint: (user_id, site_id)

Enable RLS on both tables.
```

**Task 1.2.3: Create Import Support Tables (Phase 3)**
- Create excel_imports table (MUST be before obligations)

**Implementation Prompt:**
```
Create excel_imports table (Database Schema Section 8.1):
- Include: id, company_id, site_id, file_path, status, imported_at
- This table MUST exist before obligations table (obligations.excel_import_id references it)
- Enable RLS
```

**Task 1.2.4: Create Module 1 Tables (Phases 4-5)**
- Create documents, document_site_assignments, obligations, schedules, deadlines, evidence_items, obligation_evidence_links, regulator_questions, audit_packs

**Implementation Prompt:**
```
Create Module 1 tables following Database Schema Section 4:
Phase 4:
1. documents table (Section 4.1)
   - Include: id, company_id, site_id, module_id, document_type, file_path, extraction_status
   - Foreign keys: company_id → companies.id, site_id → sites.id, module_id → modules.id
2. document_site_assignments table (Section 4.2)

Phase 5:
3. obligations table (Section 4.3) - CRITICAL: Must be after excel_imports
   - Include: id, document_id, excel_import_id (nullable), obligation_text, category, status
   - Foreign keys: document_id → documents.id, excel_import_id → excel_imports.id
4. schedules table (Section 4.4)
5. deadlines table (Section 4.5)
6. evidence_items table (Section 4.6)
7. obligation_evidence_links table (Section 4.7)
8. regulator_questions table (Section 4.8)
9. audit_packs table (Section 4.9)

Follow exact table creation order from Database Schema Section 1.6.
Enable RLS on all tables.
```

**Task 1.2.5: Create System Tables (Phase 8)**
- Create notifications, background_jobs, dead_letter_queue, audit_logs, review_queue_items, escalations, system_settings

**Implementation Prompt:**
```
Create system tables (Database Schema Section 7):
1. notifications table (Section 7.1)
   - Use rich schema from EP_Compliance_Notification_Messaging_Specification.md
   - Include: notification_type, priority, subject, body_html, body_text, recipient_email
   - Include: escalation_delay_minutes, max_retries
2. background_jobs table (Section 7.2)
3. dead_letter_queue table (Section 7.3)
4. audit_logs table (Section 7.4)
5. review_queue_items table (Section 7.5)
6. escalations table (Section 7.6)
7. system_settings table (Section 7.9) - RLS disabled

Reference: EP_Compliance_Notification_Messaging_Specification.md Section 5 for notifications schema.
```

**Task 1.2.6: Create Cross-Module Tables (Phase 9)**
- Create module_activations, cross_sell_triggers, extraction_logs, consultant_client_assignments, pack_distributions

**Implementation Prompt:**
```
Create cross-module tables (Database Schema Section 8):
1. module_activations table (Section 8.1)
   - Include: id, company_id, site_id (nullable), module_id, status (ACTIVE, INACTIVE, SUSPENDED)
   - Foreign keys: company_id → companies.id, module_id → modules.id
2. cross_sell_triggers table (Section 8.2)
3. extraction_logs table (Section 9.1)
4. consultant_client_assignments table (Section 8.3)
5. pack_distributions table (Section 8.4)

Enable RLS on all except system tables.
```

## Phase 1.3: Indexes and Constraints

**Task 1.3.1: Create Performance Indexes**

**Implementation Prompt:**
```
Create all performance indexes from Database Schema Section 10:
- Foreign key indexes (auto-created, verify)
- Composite indexes for common queries:
  - idx_obligations_document_id_status
  - idx_deadlines_due_date_status
  - idx_evidence_items_site_id_uploaded_at
- RLS performance indexes:
  - idx_user_site_assignments_user_id_site_id
  - idx_module_activations_company_id_status
- Full-text search indexes (if needed)
- Reference: EP_Compliance_Database_Schema.md Section 10 for complete list
```

**Task 1.3.2: Add Constraints**

**Implementation Prompt:**
```
Add all CHECK, UNIQUE, and FOREIGN KEY constraints from Database Schema Section 11:
- CHECK constraints for enums (subscription_tier, role, obligation_status, etc.)
- UNIQUE constraints (companies.stripe_customer_id, modules.module_code)
- FOREIGN KEY constraints (verify all FKs are created)
- Reference: EP_Compliance_Database_Schema.md Section 11
```

## Phase 1.4: Row Level Security (RLS) Policies

**Task 1.4.1: Enable RLS on All Tenant-Scoped Tables**

**Implementation Prompt:**
```
Enable RLS on all tenant-scoped tables:
- Use: ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;
- Tables requiring RLS: companies, sites, users, user_roles, user_site_assignments, documents, obligations, deadlines, evidence_items, schedules, audit_packs, module_activations, consultant_client_assignments, pack_distributions
- Tables with RLS disabled: system_settings, background_jobs, dead_letter_queue
- Reference: EP_Compliance_Database_Schema.md Section 1.5
```

**Task 1.4.2: Create RLS Policies**

**Implementation Prompt:**
```
Create all RLS policies from EP_Compliance_RLS_Permissions_Rules.md:
- Read the document in sections using offset/limit (document is 3,881 lines)
- For each table, create:
  1. SELECT policy (companies_select_user_access pattern)
  2. INSERT policy (companies_insert_owner_access pattern)
  3. UPDATE policy (companies_update_owner_admin_access pattern)
  4. DELETE policy (companies_delete_owner_access pattern)
- Key patterns:
  - Regular users: company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  - Consultants: company_id IN (SELECT client_company_id FROM consultant_client_assignments WHERE consultant_id = auth.uid())
  - Site access: site_id IN (SELECT site_id FROM user_site_assignments WHERE user_id = auth.uid())
- All roles use UPPERCASE: 'OWNER', 'ADMIN', 'STAFF', 'CONSULTANT', 'VIEWER'
- Reference: EP_Compliance_RLS_Permissions_Rules.md Sections 3-6
```

**Task 1.4.3: Create RLS Helper Functions**

**Implementation Prompt:**
```
Create SQL helper functions for RLS (EP_Compliance_RLS_Permissions_Rules.md Section 9):
1. has_company_access(user_id UUID, company_id UUID) → BOOLEAN
   - Checks if user has access via users.company_id OR consultant_client_assignments
2. has_site_access(user_id UUID, site_id UUID) → BOOLEAN
   - Checks user_site_assignments table
3. role_has_permission(user_id UUID, required_role TEXT) → BOOLEAN
   - Checks user_roles.role (UPPERCASE values)
4. is_module_activated(company_id UUID, module_id UUID) → BOOLEAN
   - Checks module_activations.status = 'ACTIVE'
5. is_consultant_assigned_to_company(consultant_id UUID, client_company_id UUID) → BOOLEAN
   - Checks consultant_client_assignments.status = 'ACTIVE'

Reference: EP_Compliance_RLS_Permissions_Rules.md Section 9.2 for complete function definitions.
```

## Phase 1.5: Supabase Auth Integration

**Task 1.5.1: Configure Supabase Auth**

**Implementation Prompt:**
```
Configure Supabase Authentication:
- Enable Email/Password authentication
- Configure email templates (customize with Oblicore branding)
- Set up email confirmation (required for production)
- Configure password requirements: min 8 characters
- Set JWT expiration: 24 hours (access token), 7 days (refresh token)
- Configure session storage: HTTP-only cookies for web
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 8.1
```

**Task 1.5.2: Create Auth Triggers**

**Implementation Prompt:**
```
Create database triggers for Supabase Auth integration:
1. On user signup (auth.users INSERT):
   - Create users record with auth_user_id = auth.uid()
   - Create user_roles record with role = 'OWNER'
   - Create company record (from signup form)
   - Create module_activation for Module 1 (default module)
2. On user delete (auth.users DELETE):
   - Soft delete users record (set deleted_at)
   - Cascade to user_roles, user_site_assignments

Reference: EP_Compliance_Product_Logic_Specification.md Section A.1.3 for module activation logic.
```

## Phase 1.6: Seed Data

**Task 1.6.1: Seed Modules Table**

**Implementation Prompt:**
```
Seed modules table with initial data:
INSERT INTO modules (module_code, module_name, requires_module_id, base_price, pricing_model, is_default, is_active) VALUES
('MODULE_1', 'Environmental Permits', NULL, 14900, 'per_site', true, true),
('MODULE_2', 'Trade Effluent', (SELECT id FROM modules WHERE module_code = 'MODULE_1'), 5900, 'per_site', false, true),
('MODULE_3', 'MCPD/Generators', (SELECT id FROM modules WHERE module_code = 'MODULE_1'), 7900, 'per_company', false, true);

Prices in pence (14900 = £149.00).
Reference: EP_Compliance_Master_Plan.md Section 7 for pricing.
```

## Phase 1 Testing

**Test Requirements:**
- [ ] All tables created in correct order (no FK errors)
- [ ] RLS policies prevent cross-tenant data access
- [ ] Helper functions return correct boolean values
- [ ] Auth triggers create users/companies correctly
- [ ] Modules table seeded correctly
- [ ] Indexes improve query performance

**Acceptance Criteria:**
- Database schema matches EP_Compliance_Database_Schema.md exactly
- RLS policies match EP_Compliance_RLS_Permissions_Rules.md
- No foreign key constraint violations
- All tables have proper indexes

## Phase 1 Automated Tests

**Task 1.7.1: Create Automated Test Suite**

**Implementation Prompt:**
```
Create automated test suite for Phase 1 (Database & RLS):

1. Install test dependencies:
   npm install --save-dev jest @types/jest ts-jest pg

2. Create test file: tests/integration/database/rls-security.test.ts

3. Test RLS isolation (automates manual check #5):
   - Create two test companies and users
   - Use Supabase service role to bypass RLS for setup
   - Switch to authenticated role with User 1's auth_user_id
   - Query companies table → Should only return User 1's company
   - Switch to User 2's auth_user_id
   - Query companies table → Should only return User 2's company
   - Assert: User 1 cannot see User 2's data

4. Test helper functions:
   - Test has_company_access() with valid/invalid combinations
   - Test has_site_access() with valid/invalid combinations
   - Test role_has_permission() with different roles

5. Test schema integrity:
   - Verify all 36 tables exist
   - Verify all foreign keys are valid
   - Verify all indexes exist
   - Verify modules table has 3 rows

6. Test RLS policy count:
   - Query pg_policies → Should have ~111 policies
   - Verify each tenant table has SELECT, INSERT, UPDATE, DELETE policies

Reference: Phase 1 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── integration/
│   └── database/
│       ├── rls-security.test.ts      # RLS isolation tests
│       ├── helper-functions.test.ts  # RLS helper function tests
│       └── schema-integrity.test.ts  # Schema validation tests
└── setup/
    └── test-db.ts                    # Test database connection
```

**Run Tests:**
```bash
npm run test:integration:database
```

**Expected Output:**
```
✓ RLS isolation: User 1 cannot see User 2's data
✓ Helper functions: has_company_access works correctly
✓ Schema integrity: All 36 tables exist
✓ RLS policies: ~111 policies created
```

**Note:** These tests automate the manual RLS security check. You still need to manually verify in Supabase Dashboard for visual confirmation, but the automated tests catch regressions.

## Phase 1 Manual Verification (CRITICAL - You Must Check)

**⚠️ DO NOT TRUST TESTS ALONE - You must visually verify these yourself:**

1. **Supabase Dashboard Check:**
   - [ ] Open Supabase Dashboard → Database → Tables
   - [ ] **VISUALLY COUNT:** Should see 36 tables listed
   - [ ] **VISUALLY VERIFY:** Tables match Database Schema (companies, sites, users, obligations, etc.)
   - [ ] **MANUAL CHECK:** Click on `obligations` table → Verify columns match schema
   - [ ] **MANUAL CHECK:** Click on `modules` table → Verify 3 modules seeded (MODULE_1, MODULE_2, MODULE_3)

2. **RLS Policies Check:**
   - [ ] Open Supabase Dashboard → Authentication → Policies
   - [ ] **VISUALLY COUNT:** Should see ~111 policies (4 per table)
   - [ ] **MANUAL CHECK:** Click on `companies` policies → Verify SELECT, INSERT, UPDATE, DELETE policies exist
   - [ ] **MANUAL CHECK:** Read one policy SQL → Verify it matches RLS document

3. **Storage Buckets Check:**
   - [ ] Open Supabase Dashboard → Storage
   - [ ] **VISUALLY VERIFY:** 4 buckets exist (documents, evidence, audit-packs, aer-documents)
   - [ ] **MANUAL CHECK:** Click on `documents` bucket → Verify CORS configured, file size limit set

4. **Database Query Test (Manual):**
   ```sql
   -- Run this in Supabase SQL Editor - YOU must see the results
   SELECT 
     (SELECT COUNT(*) FROM companies) as companies_count,
     (SELECT COUNT(*) FROM sites) as sites_count,
     (SELECT COUNT(*) FROM modules) as modules_count,
     (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies_count;
   ```
   - **EXPECTED:** companies_count = 0 (no data yet), modules_count = 3, policies_count ≈ 111
   - **YOU MUST SEE:** These exact numbers - don't trust if they're different

5. **RLS Isolation Test (Manual - Critical):**
   ```sql
   -- Create test scenario: Two companies, verify isolation
   -- Step 1: Create Company 1 and User 1
   INSERT INTO companies (id, name, billing_email) 
   VALUES ('11111111-1111-1111-1111-111111111111', 'Company 1', 'user1@test.com');
   
   INSERT INTO users (id, email, company_id, auth_user_id) 
   VALUES ('22222222-2222-2222-2222-222222222222', 'user1@test.com', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
   
   -- Step 2: Create Company 2 and User 2
   INSERT INTO companies (id, name, billing_email) 
   VALUES ('44444444-4444-4444-4444-444444444444', 'Company 2', 'user2@test.com');
   
   INSERT INTO users (id, email, company_id, auth_user_id) 
   VALUES ('55555555-5555-5555-5555-555555555555', 'user2@test.com', '44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666');
   
   -- Step 3: Try to query as User 1 (simulate RLS)
   SET ROLE authenticated;
   SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
   
   SELECT * FROM companies;
   -- YOU MUST SEE: Only Company 1 (not Company 2)
   -- If you see Company 2, RLS is BROKEN - DO NOT PROCEED
   ```
   - **CRITICAL:** This is a security test - if RLS doesn't work, your system is insecure
   - **YOU MUST VERIFY:** User 1 cannot see User 2's data

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT PROCEED TO PHASE 2 until you have manually verified all of the above.**

## Phase 1 Progress Checkpoint

**Before moving to Phase 2, verify:**

1. **Database Schema Validation:**
   ```sql
   -- Run validation script
   SELECT 
     table_name,
     (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
   FROM information_schema.tables t
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
   - Expected: 36 tables created
   - Verify: All tables from Database Schema Section 1.6 exist

2. **RLS Validation:**
   ```sql
   -- Check RLS enabled on tenant tables
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('companies', 'sites', 'users', 'obligations', 'documents');
   ```
   - Expected: rowsecurity = true for all tenant tables
   - Verify: system_settings has rowsecurity = false

3. **RLS Policy Count:**
   ```sql
   SELECT schemaname, tablename, COUNT(*) as policy_count
   FROM pg_policies
   WHERE schemaname = 'public'
   GROUP BY schemaname, tablename
   ORDER BY tablename;
   ```
   - Expected: ~111 policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
   - Verify: All tenant tables have policies

4. **Helper Functions:**
   ```sql
   -- Test helper functions
   SELECT has_company_access('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
   SELECT has_site_access('00000000-0000-0000-0000-000000000000'::UUID, '00000000-0000-0000-0000-000000000000'::UUID);
   SELECT role_has_permission('00000000-0000-0000-0000-000000000000'::UUID, 'OWNER');
   ```
   - Expected: Functions exist and return BOOLEAN
   - Verify: No syntax errors

5. **Modules Seeded:**
   ```sql
   SELECT module_code, module_name, base_price, pricing_model, is_default
   FROM modules;
   ```
   - Expected: 3 modules (MODULE_1, MODULE_2, MODULE_3)
   - Verify: MODULE_1 has is_default = true

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Review errors, fix issues, re-run validation. Do NOT proceed to Phase 2 until all checks pass.

## Phase 1 Rollback Steps

**If Phase 1 breaks or needs to be reset:**

1. **Drop All Tables (Nuclear Option):**
   ```sql
   -- WARNING: This deletes all data
   DO $$ 
   DECLARE 
     r RECORD;
   BEGIN
     FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
     LOOP
       EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
     END LOOP;
   END $$;
   ```

2. **Drop RLS Policies:**
   ```sql
   DO $$ 
   DECLARE 
     r RECORD;
   BEGIN
     FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public')
     LOOP
       EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
     END LOOP;
   END $$;
   ```

3. **Drop Functions:**
   ```sql
   DROP FUNCTION IF EXISTS has_company_access(UUID, UUID);
   DROP FUNCTION IF EXISTS has_site_access(UUID, UUID);
   DROP FUNCTION IF EXISTS role_has_permission(UUID, TEXT);
   DROP FUNCTION IF EXISTS is_module_activated(UUID, UUID);
   DROP FUNCTION IF EXISTS is_consultant_assigned_to_company(UUID, UUID);
   ```

4. **Reset Supabase Project:**
   - Go to Supabase Dashboard → Settings → Database
   - Reset database (if needed) - WARNING: Deletes all data

**After Rollback:** Start Phase 1.1 again from the beginning.

---

# PHASE 2: Core API Layer

**Duration:** 3-4 weeks  
**Complexity:** High  
**Dependencies:** Phase 1 complete

## Phase 2.1: API Project Setup

**Task 2.1.1: Initialize Next.js API Routes**

**Implementation Prompt:**
```
Set up Next.js 14 App Router API structure:
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- API routes location: app/api/v1/
- Create base structure:
  app/
  ├── api/
  │   └── v1/
  │       ├── health/
  │       │   └── route.ts
  │       ├── auth/
  │       │   ├── login/
  │       │   └── signup/
  │       └── (protected)/
  │           └── [all other routes]
- Set up middleware for authentication
- Configure CORS
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 3
```

**Task 2.1.2: Environment Configuration**

**Implementation Prompt:**
```
Set up environment variables (.env.local):
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL (connection pooler)
- REDIS_URL (for background jobs)
- OPENAI_API_KEY
- OPENAI_API_KEY_FALLBACK_1 (optional)
- OPENAI_API_KEY_FALLBACK_2 (optional)
- SENDGRID_API_KEY
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- JWT_SECRET
- BASE_URL
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 7
```

## Phase 2.2: Authentication Endpoints

**Task 2.2.1: Signup Endpoint**

**Implementation Prompt:**
```
Implement POST /api/v1/auth/signup endpoint:
- Accept: company_name, email, password
- Create Supabase Auth user
- Create company record
- Create user record (link to auth.users)
- Create user_roles record (role = 'OWNER')
- Create module_activation for Module 1 (default)
- Return: user object, JWT token
- Error handling: duplicate email, weak password
- Reference: EP_Compliance_Backend_API_Specification.md Section 2.1
```

**Task 2.2.2: Login Endpoint**

**Implementation Prompt:**
```
Implement POST /api/v1/auth/login endpoint:
- Accept: email, password
- Authenticate via Supabase Auth
- Generate JWT token (24h access, 7d refresh)
- Store session in HTTP-only cookie
- Return: user object, token
- Error handling: invalid credentials, account locked
- Reference: EP_Compliance_Backend_API_Specification.md Section 2.2
```

**Task 2.2.3: Auth Middleware**

**Implementation Prompt:**
```
Create authentication middleware for protected routes:
- Verify JWT token from cookie or Authorization header
- Extract user_id from token
- Query users table to get company_id, roles
- Attach user context to request (req.user)
- Handle token refresh
- Error responses: 401 Unauthorized, 403 Forbidden
- Reference: EP_Compliance_Backend_API_Specification.md Section 2.2
```

## Phase 2.3: Core Entity Endpoints

**Task 2.3.1: Companies Endpoints**

**Implementation Prompt:**
```
Implement companies endpoints (EP_Compliance_Backend_API_Specification.md Section 20):
1. GET /api/v1/companies
   - List user's company (RLS enforces single company access)
   - Return: company object with subscription_tier
2. GET /api/v1/companies/{id}
   - Get company details (RLS enforces access)
3. PUT /api/v1/companies/{id}
   - Update company (Owner/Admin only)
   - Validate subscription_tier changes
4. DELETE /api/v1/companies/{id}
   - Soft delete company (Owner only)
   - Set deleted_at timestamp

Use RLS policies for access control.
Reference: EP_Compliance_Backend_API_Specification.md Section 20
```

**Task 2.3.2: Sites Endpoints**

**Implementation Prompt:**
```
Implement sites endpoints (EP_Compliance_Backend_API_Specification.md Section 21):
1. GET /api/v1/sites
   - List sites for user's company (RLS filtered)
   - Query params: company_id (optional, for consultants)
2. POST /api/v1/sites
   - Create site (Staff+ roles)
   - Required: name, regulator (EA/SEPA/NRW/NIEA), water_company (optional)
   - Auto-assign to user's company
3. GET /api/v1/sites/{id}
   - Get site details
4. PUT /api/v1/sites/{id}
   - Update site (Staff+ roles)
5. DELETE /api/v1/sites/{id}
   - Soft delete site (Owner/Admin only)

Reference: EP_Compliance_Backend_API_Specification.md Section 21
```

**Task 2.3.3: Users Endpoints**

**Implementation Prompt:**
```
Implement users endpoints (EP_Compliance_Backend_API_Specification.md Section 19):
1. GET /api/v1/users
   - List users in company (RLS filtered)
   - Include roles in response
2. POST /api/v1/users
   - Invite user (Owner/Admin only)
   - Send invitation email
   - Create user_roles record
3. GET /api/v1/users/{id}
   - Get user details
4. PUT /api/v1/users/{id}
   - Update user (Owner/Admin or self)
5. DELETE /api/v1/users/{id}
   - Remove user (Owner/Admin only)
   - Soft delete

Reference: EP_Compliance_Backend_API_Specification.md Section 19
```

## Phase 2.4: Document Upload Endpoints

**Task 2.4.1: Document Upload**

**Implementation Prompt:**
```
Implement POST /api/v1/documents/upload endpoint:
- Accept: multipart/form-data (file, site_id, document_type)
- Validate file: PDF only, max 50MB
- Upload to Supabase Storage bucket 'documents'
- Create documents record (status = 'UPLOADED')
- Trigger background job for processing (Phase 4)
- Return: document object with file_path
- Error handling: invalid file type, size exceeded, storage quota
- Reference: EP_Compliance_Backend_API_Specification.md Section 8
```

**Task 2.4.2: Document List/Get**

**Implementation Prompt:**
```
Implement document endpoints:
1. GET /api/v1/documents
   - List documents for user's sites (RLS filtered)
   - Query params: site_id, document_type, status
   - Pagination: cursor-based (limit, cursor)
   - Return: documents array with extraction_status
2. GET /api/v1/documents/{id}
   - Get document details
   - Include: extraction_status, obligations_count, file_path
3. DELETE /api/v1/documents/{id}
   - Soft delete document (Owner/Admin only)
   - Archive file in storage

Reference: EP_Compliance_Backend_API_Specification.md Section 8
```

## Phase 2.5: Obligations Endpoints

**Task 2.5.1: Obligations CRUD**

**Implementation Prompt:**
```
Implement obligations endpoints (EP_Compliance_Backend_API_Specification.md Section 10):
1. GET /api/v1/obligations
   - List obligations (RLS filtered by site)
   - Query params: site_id, document_id, status, category
   - Pagination: cursor-based
   - Return: obligations array with evidence_count
2. GET /api/v1/obligations/{id}
   - Get obligation details
   - Include: linked_evidence, schedules, deadlines
3. PUT /api/v1/obligations/{id}
   - Update obligation (Staff+ roles)
   - Validate: cannot change document_id
   - Audit trail: log changes to audit_logs
4. POST /api/v1/obligations/{id}/mark-not-applicable
   - Mark obligation as N/A (Staff+ roles)
   - Required: reason (audit trail)
   - Set status = 'NOT_APPLICABLE'

Reference: EP_Compliance_Backend_API_Specification.md Section 10
```

## Phase 2.6: Evidence Endpoints

**Task 2.6.1: Evidence Upload**

**Implementation Prompt:**
```
Implement POST /api/v1/evidence/upload endpoint:
- Accept: multipart/form-data (file, obligation_ids[])
- Validate file: PDF, image, or document, max 20MB
- Upload to Supabase Storage bucket 'evidence'
- Create evidence_items record
- Create obligation_evidence_links for each obligation_id
- Return: evidence object with linked_obligations
- Error handling: invalid file, obligation not found
- Reference: EP_Compliance_Backend_API_Specification.md Section 12
```

**Task 2.6.2: Evidence Linking**

**Implementation Prompt:**
```
Implement evidence linking endpoints:
1. POST /api/v1/evidence/{evidenceId}/link
   - Link existing evidence to obligation
   - Body: { obligation_id: UUID }
   - Create obligation_evidence_links record
2. DELETE /api/v1/evidence/{evidenceId}/unlink/{obligationId}
   - Unlink evidence from obligation (Staff+ roles)
   - Delete obligation_evidence_links record
   - Note: Evidence cannot be deleted (immutability for compliance)

Reference: EP_Compliance_Backend_API_Specification.md Section 12
```

## Phase 2.7: Standard API Features

**Task 2.7.1: Pagination**

**Implementation Prompt:**
```
Implement cursor-based pagination for all list endpoints:
- Query params: limit (default 20, max 100), cursor (optional)
- Response format:
  {
    data: [...],
    pagination: {
      cursor: "next_cursor_token",
      has_more: boolean,
      limit: number
    }
  }
- Generate cursor from last item's id + created_at
- Reference: EP_Compliance_Backend_API_Specification.md Section 5.2
```

**Task 2.7.2: Error Handling**

**Implementation Prompt:**
```
Implement standard error response format:
{
  error: {
    code: "ERROR_CODE",
    message: "Human-readable message",
    details?: {...}
  }
}

Error codes:
- 400 BAD_REQUEST: Invalid input
- 401 UNAUTHORIZED: Authentication required
- 403 FORBIDDEN: Insufficient permissions
- 404 NOT_FOUND: Resource not found
- 429 TOO_MANY_REQUESTS: Rate limit exceeded
- 500 INTERNAL_SERVER_ERROR: Server error

Reference: EP_Compliance_Backend_API_Specification.md Section 4
```

**Task 2.7.3: Rate Limiting**

**Implementation Prompt:**
```
Implement rate limiting middleware:
- Default: 100 requests/minute per user
- Document upload: 10/minute per user
- AI extraction: 5/minute per user
- Use Redis for rate limit tracking
- Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Return 429 when limit exceeded
- Reference: EP_Compliance_Backend_API_Specification.md Section 7.3
```

## Phase 2 Testing

**Test Requirements:**
- [ ] All endpoints return correct status codes
- [ ] Authentication middleware works correctly
- [ ] RLS policies enforced via API
- [ ] Pagination works correctly
- [ ] Rate limiting enforced
- [ ] Error responses follow standard format

**Acceptance Criteria:**
- All endpoints match EP_Compliance_Backend_API_Specification.md
- Authentication required for protected routes
- RLS prevents unauthorized access
- Cursor-based pagination functional

## Phase 2 Automated Tests

**Task 2.8.1: Create API Integration Test Suite**

**Implementation Prompt:**
```
Create automated API integration tests for Phase 2:

1. Install test dependencies:
   npm install --save-dev supertest @types/supertest

2. Create test file: tests/integration/api/auth.test.ts

3. Test signup flow (automates manual check #2):
   - POST /api/v1/auth/signup with valid data
   - Assert: 201 Created
   - Assert: Response contains user object and token
   - Assert: Company record created in database
   - Assert: User record created in database
   - Assert: user_roles record created with role = 'OWNER'
   - Assert: module_activations record created for Module 1

4. Test login flow:
   - POST /api/v1/auth/login with valid credentials
   - Assert: 200 OK with token
   - POST /api/v1/auth/login with invalid credentials
   - Assert: 401 Unauthorized

5. Test protected routes (automates manual check #4):
   - GET /api/v1/companies without token
   - Assert: 401 Unauthorized
   - GET /api/v1/companies with valid token
   - Assert: 200 OK with company data
   - GET /api/v1/companies with invalid token
   - Assert: 401 Unauthorized

6. Test RLS enforcement via API (automates manual check #5):
   - Create User A in Company A
   - Create User B in Company B
   - Login as User A → GET /api/v1/companies
   - Assert: Only Company A in response
   - Login as User B → GET /api/v1/companies
   - Assert: Only Company B in response
   - Assert: User A cannot see User B's data

7. Test document upload:
   - POST /api/v1/documents/upload with test PDF
   - Assert: 201 Created
   - Assert: Document record created in database
   - Assert: File exists in storage bucket

8. Test pagination:
   - GET /api/v1/obligations?limit=10
   - Assert: Response has pagination object
   - Assert: cursor and has_more fields present

9. Test rate limiting:
   - Make 101 requests in 1 minute
   - Assert: Request 101 returns 429 Too Many Requests
   - Assert: Rate limit headers present

10. Test error handling:
    - POST /api/v1/auth/signup with invalid email
    - Assert: 400 Bad Request with error object
    - GET /api/v1/obligations/00000000-0000-0000-0000-000000000000
    - Assert: 404 Not Found

Reference: Phase 2 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── integration/
│   └── api/
│       ├── auth.test.ts              # Authentication tests
│       ├── rls-enforcement.test.ts   # RLS via API tests
│       ├── documents.test.ts         # Document upload tests
│       ├── pagination.test.ts        # Pagination tests
│       └── rate-limiting.test.ts     # Rate limiting tests
└── helpers/
    ├── test-client.ts                # API test client helper
    └── test-data.ts                   # Test data factories
```

**Run Tests:**
```bash
npm run test:integration:api
```

**Expected Output:**
```
✓ Signup: Creates user, company, and activates Module 1
✓ Login: Returns token for valid credentials
✓ Protected routes: Requires authentication
✓ RLS enforcement: Users cannot see other companies' data
✓ Document upload: Creates document and stores file
✓ Pagination: Returns cursor and has_more
✓ Rate limiting: Blocks after 100 requests/minute
```

**Note:** These tests automate the manual API checks. You still need to manually test in Postman/browser for visual confirmation, but automated tests catch regressions and run on every commit.

## Phase 2 Manual Verification (CRITICAL - You Must Check)

**⚠️ DO NOT TRUST TESTS ALONE - You must manually test the API:**

1. **API Health Check (Manual Browser/Postman):**
   - [ ] Open browser → `http://localhost:3000/api/v1/health`
   - [ ] **YOU MUST SEE:** JSON response with `"status": "healthy"`
   - [ ] **VISUALLY VERIFY:** All services show "healthy" (database, redis, storage)
   - [ ] **IF ANY SERVICE SHOWS "unhealthy":** DO NOT PROCEED - fix the issue

2. **Signup Flow (Manual Test):**
   - [ ] Use Postman or browser → POST `http://localhost:3000/api/v1/auth/signup`
   - [ ] **YOU MUST SEE:** 201 Created response with user object and token
   - [ ] **MANUAL CHECK:** Open Supabase Dashboard → Database → companies table
   - [ ] **VISUALLY VERIFY:** New company record exists with your test data
   - [ ] **MANUAL CHECK:** Check users table → Verify user record created
   - [ ] **MANUAL CHECK:** Check user_roles table → Verify role = 'OWNER' created
   - [ ] **MANUAL CHECK:** Check module_activations table → Verify Module 1 activated

3. **Login Flow (Manual Test):**
   - [ ] POST `http://localhost:3000/api/v1/auth/login` with credentials from step 2
   - [ ] **YOU MUST SEE:** 200 OK with token
   - [ ] **SAVE THE TOKEN** for next test

4. **Protected Route Test (Manual):**
   - [ ] GET `http://localhost:3000/api/v1/companies` WITHOUT token
   - [ ] **YOU MUST SEE:** 401 Unauthorized
   - [ ] GET `http://localhost:3000/api/v1/companies` WITH token (from step 3)
   - [ ] **YOU MUST SEE:** 200 OK with your company data
   - [ ] **VISUALLY VERIFY:** Response contains your company name

5. **RLS Enforcement Test (Manual - Critical):**
   - [ ] Create TWO test users (User A in Company A, User B in Company B)
   - [ ] Login as User A → GET `/api/v1/companies`
   - [ ] **YOU MUST SEE:** Only Company A (not Company B)
   - [ ] Login as User B → GET `/api/v1/companies`
   - [ ] **YOU MUST SEE:** Only Company B (not Company A)
   - [ ] **IF EITHER USER CAN SEE THE OTHER'S DATA:** RLS is BROKEN - DO NOT PROCEED

6. **Document Upload Test (Manual):**
   - [ ] Use Postman → POST `/api/v1/documents/upload` with a test PDF
   - [ ] **YOU MUST SEE:** 201 Created with document object
   - [ ] **MANUAL CHECK:** Supabase Dashboard → Storage → documents bucket
   - [ ] **VISUALLY VERIFY:** Your PDF file is in the bucket
   - [ ] **MANUAL CHECK:** Database → documents table
   - [ ] **VISUALLY VERIFY:** Document record exists with correct site_id, status = 'UPLOADED'

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT PROCEED TO PHASE 3 until you have manually tested all API endpoints above.**

## Phase 2 Progress Checkpoint

**Before moving to Phase 3, verify:**

1. **API Health Check:**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```
   - Expected: `{"status":"healthy",...}`
   - Verify: All services (database, redis, storage) show "healthy"

2. **Authentication Test:**
   ```bash
   # Test signup
   curl -X POST http://localhost:3000/api/v1/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"company_name":"Test Co","email":"test@example.com","password":"Test1234!"}'
   ```
   - Expected: 201 Created with user object and token
   - Verify: Company, user, user_roles records created

3. **Protected Route Test:**
   ```bash
   # Test without auth
   curl http://localhost:3000/api/v1/companies
   ```
   - Expected: 401 Unauthorized
   - Verify: Authentication middleware blocks access

4. **RLS Enforcement Test:**
   ```bash
   # Create two companies, verify isolation
   # User 1 can only see Company 1
   # User 2 can only see Company 2
   ```
   - Expected: Users cannot see each other's data
   - Verify: RLS policies enforced at API level

5. **Pagination Test:**
   ```bash
   curl "http://localhost:3000/api/v1/obligations?limit=10&cursor=..."
   ```
   - Expected: Returns data with pagination object
   - Verify: cursor works, has_more flag correct

6. **Rate Limiting Test:**
   ```bash
   # Make 101 requests in 1 minute
   for i in {1..101}; do curl http://localhost:3000/api/v1/companies; done
   ```
   - Expected: Request 101 returns 429 Too Many Requests
   - Verify: Rate limit headers present

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Review API logs, fix authentication/RLS issues. Do NOT proceed to Phase 3 until all checks pass.

## Phase 2 Rollback Steps

**If Phase 2 breaks:**

1. **Revert API Code:**
   ```bash
   git checkout HEAD~1 app/api/
   ```

2. **Reset Database (if API created bad data):**
   - Use Phase 1 rollback steps
   - Re-run Phase 1 migrations

3. **Clear Redis (if rate limiting broken):**
   ```bash
   redis-cli FLUSHALL
   ```

4. **Restart Services:**
   ```bash
   # Restart Next.js dev server
   npm run dev
   ```

**After Rollback:** Fix issues, re-test, then continue.

---

# PHASE 3: AI/Extraction Layer

**Duration:** 2-3 weeks  
**Complexity:** High  
**Dependencies:** Phase 2 complete

## Phase 3.1: OpenAI Integration Setup

**Task 3.1.1: API Key Management**

**Implementation Prompt:**
```
Implement API key management system:
- Create APIKeyManager class
- Support primary key + 2 fallback keys
- Key rotation logic (90-day cycle)
- Key validation on startup
- Environment variables: OPENAI_API_KEY, OPENAI_API_KEY_FALLBACK_1, OPENAI_API_KEY_FALLBACK_2
- Reference: EP_Compliance_AI_Integration_Layer.md Section 2
```

**Task 3.1.2: OpenAI Client Setup**

**Implementation Prompt:**
```
Set up OpenAI client with configuration:
- Model: gpt-4o (primary), gpt-4o-mini (secondary)
- Timeout: 30s (standard ≤49 pages), 5min (large ≥50 pages)
- Max retries: 2 retry attempts (3 total attempts)
- Retry delay: exponential backoff (2s, 4s)
- Reference: EP_Compliance_AI_Integration_Layer.md Section 1.2
- Reference: EP_Compliance_Product_Logic_Specification.md Section A.9.1 for timeout policy
```

## Phase 3.2: Rule Library Integration

**Task 3.2.1: Pattern Matching Engine**

**Implementation Prompt:**
```
Implement pattern matching engine:
- Load patterns from AI_Extraction_Rules_Library.md
- Match patterns before LLM call (cost optimization)
- Threshold: 90% match score to use pattern
- Calculate combined score (regex + semantic)
- Return template obligation if match found
- Log match to extraction_logs (rule_library_version, pattern_id)
- Reference: AI_Extraction_Rules_Library.md Section 3.2
```

**Task 3.2.2: Pattern Discovery**

**Implementation Prompt:**
```
Implement pattern discovery mechanism:
- Track successful LLM extractions
- After 3+ similar extractions → generate pattern candidate
- Admin review required before adding to library
- Store patterns in database or codebase
- Reference: AI_Extraction_Rules_Library.md Section 5.1
```

## Phase 3.3: Document Processing Pipeline

**Task 3.3.1: OCR Integration**

**Implementation Prompt:**
```
Implement OCR processing:
- Use Tesseract.js or cloud OCR service
- Process PDFs that need OCR (scanned documents)
- Extract text with confidence scores
- Timeout: 60 seconds
- Store OCR results in documents.ocr_text
- Reference: EP_Compliance_Product_Logic_Specification.md Section B.2.1
```

**Task 3.3.2: Text Extraction**

**Implementation Prompt:**
```
Implement text extraction:
- Extract text from PDF (native or OCR)
- Segment large documents (>800k tokens)
- Store extracted text in documents.extracted_text
- Calculate page count, file size
- Determine if large document (≥50 pages AND ≥10MB)
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 3.1
```

**Task 3.3.3: LLM Extraction**

**Implementation Prompt:**
```
Implement LLM extraction using prompts from AI_Microservice_Prompts_Complete.md:
- Use prompt template for obligation extraction
- Parse JSON response
- Validate extracted obligations
- Calculate confidence scores
- Handle errors: timeout, invalid JSON, rate limits
- Retry logic: 2 retry attempts (3 total attempts)
- Reference: EP_Compliance_AI_Integration_Layer.md Section 3
- Reference: AI_Microservice_Prompts_Complete.md for prompt templates
```

**Task 3.3.4: Obligation Creation**

**Implementation Prompt:**
```
Create obligations from LLM extraction:
- For each extracted obligation:
  1. Validate: text, category, confidence_score
  2. Check for duplicates (80% text similarity)
  3. Create obligations record
  4. Create schedules (if frequency specified)
  5. Create deadlines (calculate from frequency)
  6. Flag low-confidence items (<70%) for review
- Store extraction metadata in extraction_logs
- Reference: EP_Compliance_Product_Logic_Specification.md Section B.2.3
```

## Phase 3.4: Confidence Scoring

**Task 3.4.1: Confidence Calculation**

**Implementation Prompt:**
```
Implement confidence scoring:
- High confidence: ≥85% (auto-accept)
- Medium confidence: 70-84% (flag for review)
- Low confidence: <70% (require review)
- Factors: LLM confidence, pattern match score, text quality
- Store in obligations.confidence_score
- Create review_queue_items for low-confidence items
- Reference: EP_Compliance_Product_Logic_Specification.md Section B.2.4
```

## Phase 3 Testing

**Test Requirements:**
- [ ] Pattern matching works correctly
- [ ] LLM extraction returns valid JSON
- [ ] Confidence scores calculated correctly
- [ ] Retry logic handles failures
- [ ] Large documents processed correctly
- [ ] Cost tracking accurate

**Acceptance Criteria:**
- Extraction accuracy >90% for standard documents
- Pattern library hit rate 60-70%
- All extractions have confidence scores
- Low-confidence items flagged for review

## Phase 3 Manual Verification (CRITICAL - You Must Check)

**⚠️ DO NOT TRUST TESTS ALONE - You must visually verify AI extraction works:**

1. **Document Extraction Test (Manual - Most Important):**
   - [ ] Upload a REAL permit PDF (not test file) via API
   - [ ] **WAIT:** Check background_jobs table → Job should be PROCESSING → COMPLETED
   - [ ] **MANUAL CHECK:** Database → documents table → extraction_status should be 'EXTRACTED'
   - [ ] **MANUAL CHECK:** Database → obligations table
   - [ ] **VISUALLY COUNT:** How many obligations were extracted?
   - [ ] **VISUALLY READ:** First 5 obligations → Do they make sense?
   - [ ] **CRITICAL CHECK:** Open the original PDF → Manually verify first obligation matches extracted text
   - [ ] **IF OBLIGATIONS DON'T MATCH PDF:** Extraction is broken - DO NOT PROCEED

2. **Confidence Scores Check (Manual):**
   - [ ] Query: `SELECT obligation_text, confidence_score FROM obligations WHERE document_id = '...'`
   - [ ] **VISUALLY REVIEW:** Confidence scores (should be 0-100)
   - [ ] **MANUAL CHECK:** Obligations with confidence <70% should be in review_queue_items
   - [ ] **VERIFY:** Database → review_queue_items table has low-confidence items

3. **Pattern Matching Test (Manual):**
   - [ ] Check extraction_logs table
   - [ ] **LOOK FOR:** `rule_library_hit = true` records
   - [ ] **VERIFY:** These should have lower cost (no LLM call)
   - [ ] **MANUAL CHECK:** Compare pattern-matched vs LLM-extracted obligations → Quality should be similar

4. **Large Document Test (Manual):**
   - [ ] Upload a 60+ page PDF
   - [ ] **VERIFY:** Uses 5-minute timeout (check logs)
   - [ ] **WAIT:** Extraction should complete (may take 2-5 minutes)
   - [ ] **VERIFY:** Obligations extracted correctly

5. **Error Handling Test (Manual):**
   - [ ] Upload corrupted PDF or invalid file
   - [ ] **YOU MUST SEE:** Appropriate error message
   - [ ] **VERIFY:** Document status = 'PROCESSING_FAILED' or 'OCR_FAILED'
   - [ ] **VERIFY:** User can retry or enter manual mode

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT PROCEED TO PHASE 4 until you have manually verified extraction works with REAL documents.**

## Phase 3 Automated Tests

**Task 3.4.1: Create AI Extraction Test Suite**

**Implementation Prompt:**
```
Create automated tests for AI extraction (Phase 3):

1. Install test dependencies:
   npm install --save-dev @playwright/test

2. Create test file: tests/integration/ai/extraction.test.ts

3. Test document extraction (partially automates manual check #1):
   - Upload test PDF via API
   - Wait for background job to complete
   - Assert: document.extraction_status = 'EXTRACTED'
   - Assert: obligations table has records
   - Assert: obligation_count > 0
   - Assert: All obligations have obligation_text (not empty)
   - Assert: All obligations have confidence_score (0-100)

4. Test confidence score thresholds:
   - Assert: Obligations with confidence <70% are in review_queue_items
   - Assert: Obligations with confidence >=85% are not in review_queue

5. Test pattern matching:
   - Upload document with known pattern
   - Assert: extraction_logs has rule_library_hit = true
   - Assert: Cost is lower (no LLM call)

6. Test large document timeout:
   - Upload 60+ page PDF
   - Assert: Uses 5-minute timeout (check logs)
   - Assert: Extraction completes (may take 2-5 minutes)

7. Test error handling:
   - Upload corrupted PDF
   - Assert: document.extraction_status = 'PROCESSING_FAILED' or 'OCR_FAILED'
   - Assert: Error message in extraction_logs

8. Test extraction accuracy (semi-automated):
   - Upload test PDF with known obligations
   - Extract obligations
   - Compare extracted text to expected text (fuzzy match)
   - Assert: At least 80% of obligations match expected text
   - Note: Full accuracy check still requires manual verification

Reference: Phase 3 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── integration/
│   └── ai/
│       ├── extraction.test.ts        # Extraction workflow tests
│       ├── confidence-scores.test.ts # Confidence threshold tests
│       ├── pattern-matching.test.ts  # Pattern matching tests
│       └── error-handling.test.ts    # Error scenario tests
└── fixtures/
    ├── test-permit-small.pdf         # 5-page test PDF
    ├── test-permit-large.pdf         # 60-page test PDF
    └── test-permit-corrupted.pdf     # Corrupted PDF for error testing
```

**Run Tests:**
```bash
npm run test:integration:ai
```

**Expected Output:**
```
✓ Document extraction: Creates obligations from PDF
✓ Confidence scores: Low-confidence items flagged for review
✓ Pattern matching: Uses rule library when pattern matches
✓ Large documents: Uses 5-minute timeout
✓ Error handling: Handles corrupted PDFs gracefully
⚠ Extraction accuracy: 85% match (manual verification still recommended)
```

**Note:** Extraction accuracy test is semi-automated. It compares extracted text to expected text, but you should still manually verify with real PDFs to ensure quality.

## Phase 3 Progress Checkpoint

**Before moving to Phase 4, verify:**

1. **Pattern Matching Test:**
   ```typescript
   // Test pattern matching with known pattern
   const testText = "The permit holder shall monitor pH daily";
   const match = await matchPattern(testText, 'MODULE_1');
   ```
   - Expected: Returns pattern match if score ≥90%
   - Verify: Pattern library loaded correctly

2. **LLM Extraction Test:**
   ```bash
   # Upload test document
   curl -X POST http://localhost:3000/api/v1/documents/upload \
     -F "file=@test-permit.pdf" \
     -F "site_id=..." \
     -F "document_type=ENVIRONMENTAL_PERMIT"
   ```
   - Expected: Document processed, obligations extracted
   - Verify: obligations table has records, confidence_score populated

3. **Retry Logic Test:**
   ```typescript
   // Simulate timeout error
   // Verify: Retries 2 times (3 total attempts)
   ```
   - Expected: 3 attempts before failing
   - Verify: Retry delays (2s, 4s) applied

4. **Large Document Test:**
   ```bash
   # Upload 60-page document
   ```
   - Expected: Uses 5-minute timeout
   - Verify: isLargeDocument() returns true

5. **Cost Tracking:**
   ```sql
   SELECT * FROM extraction_logs ORDER BY created_at DESC LIMIT 10;
   ```
   - Expected: Records show tokens_used, cost_per_1k_tokens
   - Verify: Cost calculations accurate

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Review extraction logs, fix LLM integration. Do NOT proceed to Phase 4 until extraction works.

## Phase 3 Rollback Steps

**If Phase 3 breaks:**

1. **Revert AI Integration Code:**
   ```bash
   git checkout HEAD~1 lib/ai/ services/extraction/
   ```

2. **Clear Extraction Logs:**
   ```sql
   DELETE FROM extraction_logs;
   DELETE FROM review_queue_items;
   ```

3. **Reset Document Status:**
   ```sql
   UPDATE documents SET extraction_status = 'UPLOADED' WHERE extraction_status = 'PROCESSING';
   ```

**After Rollback:** Fix AI integration, re-test with sample document.

---

# PHASE 4: Background Jobs

**Duration:** 2-3 weeks  
**Complexity:** Medium  
**Dependencies:** Phase 2 complete (can parallel with Phase 3)

## Phase 4.1: BullMQ Setup

**Task 4.1.1: Redis Configuration**

**Implementation Prompt:**
```
Set up Redis for BullMQ:
- Provider: Upstash Redis (serverless, Vercel-compatible)
- Connection: REDIS_URL environment variable
- Persistence: Enabled
- Create queues:
  - document-processing
  - monitoring-schedule
  - deadline-alerts
  - evidence-reminders
  - audit-pack-generation
  - pack-distribution
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 2.1
```

**Task 4.1.2: Worker Setup**

**Implementation Prompt:**
```
Set up BullMQ worker service:
- Deploy on Railway/Render/Fly.io (separate from API)
- Concurrency: 5 per worker, 10 per queue, 50 global
- Health monitoring: heartbeat every 30s
- Stale job detection: jobs >10min without heartbeat
- Error handling: retry logic, DLQ
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 1.1
```

## Phase 4.2: Core Monitoring Jobs

**Task 4.2.1: Monitoring Schedule Job**

**Implementation Prompt:**
```
Implement Monitoring Schedule Job (cron: hourly):
- Check all active obligations
- Calculate deadlines from schedules
- Update obligation statuses (PENDING → DUE_SOON → OVERDUE)
- Create deadlines records
- Update schedules.next_due_date
- Retry: 2 retry attempts (3 total attempts)
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 2.1
```

**Task 4.2.2: Deadline Alert Job**

**Implementation Prompt:**
```
Implement Deadline Alert Job (cron: every 6 hours):
- Check deadlines: 7 days, 3 days, 1 day before due
- Create notifications for each warning level
- Escalation: Level 1 → Level 2 (24h) → Level 3 (48h)
- Send via email/SMS/in-app
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 2.2
- Reference: EP_Compliance_Notification_Messaging_Specification.md Section 2.2-2.4
```

**Task 4.2.3: Evidence Reminder Job**

**Implementation Prompt:**
```
Implement Evidence Reminder Job (cron: daily):
- Find obligations requiring evidence (no linked evidence)
- Check grace period (7 days after deadline)
- Create notifications for evidence reminders
- Escalation: Level 1 → Level 2 (24h after grace period)
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 2.3
```

## Phase 4.3: Document Processing Job

**Task 4.3.1: Document Processing Pipeline**

**Implementation Prompt:**
```
Implement Document Processing Job:
- Trigger: API endpoint creates job on document upload
- Steps:
  1. OCR (if needed) - timeout 60s
  2. Text extraction
  3. Large document detection (≥50 pages AND ≥10MB)
  4. Pattern matching (rule library)
  5. LLM extraction (if no pattern match)
  6. Obligation creation
  7. Confidence scoring
  8. Review queue (low confidence items)
- Error handling: retry, DLQ, manual review flag
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 3.1
```

## Phase 4.4: Pack Generation Job

**Task 4.4.1: Audit Pack Generation**

**Implementation Prompt:**
```
Implement Audit Pack Generation Job:
- Trigger: API endpoint (POST /api/v1/packs/generate)
- Input: pack_type (REGULATOR_INSPECTION, AUDIT_PACK, etc.), site_id, filters
- Steps:
  1. Collect evidence items (filtered by site, date range)
  2. Generate PDF with pack-specific structure
  3. Upload to Supabase Storage (audit-packs bucket)
  4. Create audit_packs record
  5. Notify user when ready
- Timeout: 60s (standard), 5min (large packs >500 items)
- Reference: EP_Compliance_Background_Jobs_Specification.md Section 6.1
- Reference: EP_Compliance_Product_Logic_Specification.md Section I.8 for pack types
```

## Phase 4 Testing

**Test Requirements:**
- [ ] All jobs execute successfully
- [ ] Retry logic works correctly
- [ ] DLQ captures failed jobs
- [ ] Cron schedules trigger correctly
- [ ] Job status tracking accurate

**Acceptance Criteria:**
- Monitoring jobs run hourly
- Deadline alerts sent at correct times
- Document processing completes successfully
- Pack generation produces valid PDFs

## Phase 4 Progress Checkpoint

**Before moving to Phase 5, verify:**

1. **Worker Health:**
   ```bash
   # Check worker logs
   # Verify: Heartbeat every 30s, no stale jobs
   ```
   - Expected: Workers running, processing jobs
   - Verify: No "stale job" errors

2. **Job Execution Test:**
   ```sql
   SELECT job_type, status, COUNT(*) 
   FROM background_jobs 
   GROUP BY job_type, status;
   ```
   - Expected: Jobs in COMPLETED, PENDING, PROCESSING states
   - Verify: No jobs stuck in PROCESSING >10 minutes

3. **Cron Schedule Test:**
   ```bash
   # Manually trigger cron job
   # Verify: Job created and executed
   ```
   - Expected: Monitoring schedule job runs hourly
   - Verify: Deadlines calculated correctly

4. **DLQ Test:**
   ```sql
   SELECT * FROM dead_letter_queue ORDER BY created_at DESC LIMIT 5;
   ```
   - Expected: Failed jobs (after 3 attempts) in DLQ
   - Verify: Error context preserved

5. **Notification Delivery:**
   ```sql
   SELECT notification_type, status, COUNT(*) 
   FROM notifications 
   GROUP BY notification_type, status;
   ```
   - Expected: Notifications created and sent
   - Verify: delivery_status = 'SENT' or 'DELIVERED'

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Review job logs, fix worker issues. Jobs can run in parallel with Phase 5.

## Phase 4 Rollback Steps

**If Phase 4 breaks:**

1. **Stop Workers:**
   ```bash
   # Stop worker service
   pm2 stop workers
   # or
   docker-compose stop workers
   ```

2. **Clear Job Queue:**
   ```bash
   redis-cli FLUSHALL
   ```

3. **Reset Job Status:**
   ```sql
   UPDATE background_jobs SET status = 'PENDING' WHERE status = 'PROCESSING';
   ```

4. **Revert Worker Code:**
   ```bash
   git checkout HEAD~1 workers/
   ```

**After Rollback:** Fix worker code, restart workers, re-test.

---

# PHASE 5: Frontend Core

**Duration:** 3-4 weeks  
**Complexity:** High  
**Dependencies:** Phase 2 complete (API endpoints available)

## Phase 5.1: Next.js Project Setup

**Task 5.1.1: Initialize Next.js App**

**Implementation Prompt:**
```
Set up Next.js 14 App Router project:
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- State: React Query (TanStack Query) + Zustand
- Forms: React Hook Form
- UI: shadcn/ui components
- Project structure:
  app/
  ├── (auth)/
  ├── (dashboard)/
  ├── api/ (API routes)
  └── layout.tsx
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 1.1
```

**Task 5.1.2: Design System Integration**

**Implementation Prompt:**
```
Set up design system from EP_Compliance_UI_UX_Design_System.md:
- Install Tailwind CSS with design tokens
- Primary color: #026A67 (Industrial Deep Teal)
- Dark mode: Dark-first design (dark surfaces, light content)
- Typography: Inter font family
- Spacing: 4px base unit
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Reference: EP_Compliance_UI_UX_Design_System.md Section 2
```

## Phase 5.2: Authentication Flow

**Task 5.2.1: Signup Page**

**Implementation Prompt:**
```
Implement signup page (app/(auth)/signup/page.tsx):
- Form fields: company_name, email, password, confirm_password, terms_checkbox
- Validation: email format, password strength (min 8 chars), password match
- Submit: POST /api/v1/auth/signup
- On success: redirect to onboarding
- Error handling: display validation errors
- Reference: EP_Compliance_Onboarding_Flow_Specification.md Section 2.1
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 3.1
```

**Task 5.2.2: Login Page**

**Implementation Prompt:**
```
Implement login page (app/(auth)/login/page.tsx):
- Form fields: email, password
- Submit: POST /api/v1/auth/login
- Store JWT in HTTP-only cookie
- On success: redirect to dashboard
- Error handling: invalid credentials message
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 3.2
```

**Task 5.2.3: Auth Context/Provider**

**Implementation Prompt:**
```
Create authentication context:
- Use Zustand for auth state
- Store: user, company, roles, isAuthenticated
- Methods: login, logout, refreshToken
- Auto-refresh token before expiration
- Protect routes via middleware
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 8.1
```

## Phase 5.3: Dashboard Layout

**Task 5.3.1: Main Layout**

**Implementation Prompt:**
```
Implement dashboard layout (app/(dashboard)/layout.tsx):
- Sidebar navigation (dark background #101314)
- Top header with user menu, notifications
- Main content area (light background #E2E6E7)
- Responsive: mobile hamburger menu
- Navigation items:
  - Dashboard
  - Documents
  - Obligations
  - Evidence
  - Packs
  - Settings
- Reference: EP_Compliance_UI_UX_Design_System.md Section 6.1
```

**Task 5.3.2: Dashboard Home Page**

**Implementation Prompt:**
```
Implement dashboard home (app/(dashboard)/page.tsx):
- Stats cards: total obligations, overdue count, evidence gaps
- Upcoming deadlines table (next 7 days)
- Recent activity feed
- Quick actions: Upload Document, Add Evidence
- Data fetching: React Query hooks
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 4.1
```

## Phase 5.4: Document Management

**Task 5.4.1: Document List Page**

**Implementation Prompt:**
```
Implement documents list (app/(dashboard)/documents/page.tsx):
- Table: document name, site, type, status, uploaded date, actions
- Filters: site, document_type, status
- Search: by document name
- Pagination: cursor-based (React Query)
- Actions: View, Delete (Owner/Admin only)
- Upload button: opens upload modal
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 5.1
```

**Task 5.4.2: Document Upload**

**Implementation Prompt:**
```
Implement document upload modal/component:
- Drag-and-drop file upload
- File validation: PDF only, max 50MB
- Form: site selection, document_type selection
- Submit: POST /api/v1/documents/upload (multipart/form-data)
- Progress indicator during upload
- On success: show extraction status, redirect to document detail
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 5.2
```

**Task 5.4.3: Document Detail Page**

**Implementation Prompt:**
```
Implement document detail (app/(dashboard)/documents/[id]/page.tsx):
- Display: document name, site, type, status, extraction_status
- Embedded PDF viewer (if possible)
- Extracted obligations list
- Actions: Re-extract, Delete (Owner/Admin)
- Loading state: show extraction progress
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 5.3
```

## Phase 5.5: Obligations Management

**Task 5.5.1: Obligations List Page**

**Implementation Prompt:**
```
Implement obligations list (app/(dashboard)/obligations/page.tsx):
- Table: obligation text, category, status, deadline, evidence count, actions
- Filters: site, document, status, category
- Search: by obligation text
- Pagination: cursor-based
- Actions: View, Edit, Mark N/A, Link Evidence
- Status badges: PENDING (gray), DUE_SOON (amber), OVERDUE (red), COMPLETED (green)
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 6.1
```

**Task 5.5.2: Obligation Detail Page**

**Implementation Prompt:**
```
Implement obligation detail (app/(dashboard)/obligations/[id]/page.tsx):
- Display: full obligation text, category, status, confidence_score
- Linked evidence list (with preview/download)
- Schedule information (frequency, next due date)
- Deadline information (due date, days remaining)
- Actions: Edit, Mark N/A, Link Evidence, Unlink Evidence
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 6.2
```

## Phase 5 Testing

**Test Requirements:**
- [ ] All pages render correctly
- [ ] Authentication flow works
- [ ] Data fetching works (React Query)
- [ ] Forms validate correctly
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Error states display correctly

**Acceptance Criteria:**
- All routes accessible
- Authentication required for protected routes
- Data loads from API correctly
- Forms submit successfully
- Mobile-responsive layout

## Phase 5 Manual Verification (CRITICAL - You Must Check)

**⚠️ DO NOT TRUST TESTS ALONE - You must visually test the frontend:**

1. **Signup Page (Manual Browser Test):**
   - [ ] Open `http://localhost:3000/signup` in browser
   - [ ] **VISUALLY VERIFY:** Form looks correct (company name, email, password fields)
   - [ ] **MANUAL TEST:** Fill form with invalid email → **YOU MUST SEE:** Validation error
   - [ ] **MANUAL TEST:** Fill form with weak password → **YOU MUST SEE:** Password strength indicator
   - [ ] **MANUAL TEST:** Submit valid form → **YOU MUST SEE:** Redirect to onboarding or dashboard
   - [ ] **VERIFY:** No console errors (open DevTools → Console)

2. **Login Page (Manual Browser Test):**
   - [ ] Open `http://localhost:3000/login`
   - [ ] **VISUALLY VERIFY:** Login form renders correctly
   - [ ] **MANUAL TEST:** Login with wrong password → **YOU MUST SEE:** Error message
   - [ ] **MANUAL TEST:** Login with correct credentials → **YOU MUST SEE:** Redirect to dashboard

3. **Dashboard (Manual Browser Test):**
   - [ ] After login, **YOU MUST SEE:** Dashboard page loads
   - [ ] **VISUALLY VERIFY:** Stats cards show numbers (even if 0)
   - [ ] **VISUALLY VERIFY:** Navigation sidebar works (click links)
   - [ ] **MANUAL CHECK:** Browser DevTools → Network tab → **VERIFY:** API calls succeed (200 status)
   - [ ] **VERIFY:** No red errors in console

4. **Document Upload (Manual Browser Test):**
   - [ ] Navigate to Documents page
   - [ ] **VISUALLY VERIFY:** Upload button/modal exists
   - [ ] **MANUAL TEST:** Drag and drop a PDF file
   - [ ] **YOU MUST SEE:** File selected, upload progress
   - [ ] **WAIT:** Upload completes
   - [ ] **VISUALLY VERIFY:** Document appears in list
   - [ ] **MANUAL CHECK:** Click on document → **YOU MUST SEE:** Document detail page

5. **Obligations List (Manual Browser Test):**
   - [ ] Navigate to Obligations page
   - [ ] **VISUALLY VERIFY:** Table renders with columns
   - [ ] **MANUAL CHECK:** If obligations exist, **YOU MUST SEE:** They display correctly
   - [ ] **MANUAL TEST:** Click on an obligation → **YOU MUST SEE:** Obligation detail page
   - [ ] **VERIFY:** Status badges show correct colors (PENDING=gray, OVERDUE=red, etc.)

6. **Mobile Responsive (Manual Test):**
   - [ ] Resize browser to mobile width (375px)
   - [ ] **VISUALLY VERIFY:** Layout adapts (sidebar becomes hamburger menu)
   - [ ] **MANUAL TEST:** Click hamburger menu → **YOU MUST SEE:** Menu opens
   - [ ] **VERIFY:** Tables scroll horizontally (not broken layout)
   - [ ] **VERIFY:** Buttons are touch-friendly (not too small)

7. **Error States (Manual Test):**
   - [ ] Disconnect internet (or block API in DevTools)
   - [ ] Try to load a page
   - [ ] **YOU MUST SEE:** Error message (not blank page)
   - [ ] **VERIFY:** User can retry

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT PROCEED TO PHASE 6 until you have manually tested all pages in a browser.**

## Phase 5 Automated Tests (E2E)

**Task 5.6.1: Create E2E Test Suite**

**Implementation Prompt:**
```
Create E2E tests for frontend (Phase 5) using Playwright:

1. Install Playwright:
   npm install --save-dev @playwright/test
   npx playwright install

2. Create test file: tests/e2e/signup-flow.test.ts

3. Test signup page (automates manual check #1):
   - Navigate to /signup
   - Assert: Form fields visible (company_name, email, password)
   - Fill form with invalid email
   - Assert: Validation error displayed
   - Fill form with weak password
   - Assert: Password strength indicator shows
   - Fill form with valid data
   - Submit form
   - Assert: Redirects to onboarding or dashboard
   - Assert: No console errors

4. Test login page (automates manual check #2):
   - Navigate to /login
   - Assert: Login form renders
   - Fill form with wrong password
   - Assert: Error message displayed
   - Fill form with correct credentials
   - Assert: Redirects to dashboard

5. Test dashboard (automates manual check #3):
   - Login as test user
   - Navigate to /dashboard
   - Assert: Dashboard page loads
   - Assert: Stats cards visible (even if 0)
   - Assert: Navigation sidebar works
   - Assert: API calls succeed (check network tab)
   - Assert: No console errors

6. Test document upload (automates manual check #4):
   - Navigate to /documents
   - Assert: Upload button/modal exists
   - Upload test PDF file
   - Assert: File selected, upload progress shown
   - Wait for upload to complete
   - Assert: Document appears in list
   - Click on document
   - Assert: Document detail page loads

7. Test obligations list (automates manual check #5):
   - Navigate to /obligations
   - Assert: Table renders with columns
   - If obligations exist, assert: They display correctly
   - Click on obligation
   - Assert: Obligation detail page loads
   - Assert: Status badges show correct colors

8. Test mobile responsive (automates manual check #6):
   - Set viewport to mobile (375px)
   - Navigate to dashboard
   - Assert: Layout adapts (sidebar becomes hamburger)
   - Click hamburger menu
   - Assert: Menu opens
   - Assert: Tables scroll horizontally

9. Test error states (automates manual check #7):
   - Block API requests (route.continue with abort)
   - Navigate to dashboard
   - Assert: Error message displayed (not blank page)
   - Assert: Retry button visible

Reference: Phase 5 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── e2e/
│   ├── signup-flow.test.ts          # Signup page tests
│   ├── login-flow.test.ts           # Login page tests
│   ├── dashboard.test.ts            # Dashboard tests
│   ├── document-upload.test.ts      # Document upload tests
│   ├── obligations.test.ts         # Obligations page tests
│   ├── responsive.test.ts          # Mobile responsive tests
│   └── error-handling.test.ts      # Error state tests
└── helpers/
    ├── test-user.ts                 # Test user helpers
    └── page-objects/                # Page object models
        ├── signup.page.ts
        ├── login.page.ts
        └── dashboard.page.ts
```

**Run Tests:**
```bash
npm run test:e2e
# Or with UI mode:
npm run test:e2e:ui
```

**Expected Output:**
```
✓ Signup: Form validation and submission works
✓ Login: Authentication flow works
✓ Dashboard: Page loads and displays data
✓ Document upload: File upload and display works
✓ Obligations: List and detail pages work
✓ Mobile responsive: Layout adapts correctly
✓ Error handling: Error states display correctly
```

**Note:** E2E tests automate the manual browser checks. They run in headless mode by default, but you can run with UI mode (`npm run test:e2e:ui`) to watch tests execute.

## Phase 5 Progress Checkpoint

**Before moving to Phase 6, verify:**

1. **Page Rendering:**
   ```bash
   # Run Next.js build
   npm run build
   ```
   - Expected: Build succeeds with no errors
   - Verify: All pages compile

2. **Authentication Flow:**
   - Test: Signup → Login → Dashboard access
   - Expected: User can signup, login, access dashboard
   - Verify: Protected routes redirect to login

3. **API Integration:**
   ```bash
   # Check browser network tab
   # Verify: API calls succeed, data displays
   ```
   - Expected: Data loads from API endpoints
   - Verify: React Query caching works

4. **Form Validation:**
   - Test: Submit forms with invalid data
   - Expected: Validation errors display
   - Verify: Forms don't submit invalid data

5. **Responsive Design:**
   - Test: Resize browser (mobile, tablet, desktop)
   - Expected: Layout adapts correctly
   - Verify: Mobile menu works, tables scroll

6. **Error Handling:**
   - Test: Disconnect API, submit form
   - Expected: Error messages display
   - Verify: User can retry failed actions

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Review browser console, fix React errors. Do NOT proceed to Phase 6 until core pages work.

## Phase 5 Rollback Steps

**If Phase 5 breaks:**

1. **Revert Frontend Code:**
   ```bash
   git checkout HEAD~1 app/
   ```

2. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run build
   ```

3. **Reset Dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**After Rollback:** Fix React/Next.js errors, re-test pages.

---

# PHASE 6: Frontend Features

**Duration:** 3-4 weeks  
**Complexity:** Medium  
**Dependencies:** Phase 5 complete

## Phase 6.1: Evidence Management

**Task 6.1.1: Evidence Upload**

**Implementation Prompt:**
```
Implement evidence upload:
- Drag-and-drop component
- File validation: PDF, images, documents, max 20MB
- Multi-select obligations to link
- Submit: POST /api/v1/evidence/upload
- Progress indicator
- On success: show linked obligations
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 7.1
```

**Task 6.1.2: Evidence List**

**Implementation Prompt:**
```
Implement evidence list page:
- Grid/table view of evidence items
- Filters: site, obligation, date range
- Preview thumbnails for images
- Actions: View, Download, Link to Obligation, Unlink
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 7.2
```

## Phase 6.2: Pack Generation

**Task 6.2.1: Pack Generation UI**

**Implementation Prompt:**
```
Implement pack generation interface:
- Pack type selection: Regulator, Audit, Tender, Board, Insurer
- Site selection (multi-select for Board Pack)
- Date range filter
- Evidence filters
- Generate button: POST /api/v1/packs/generate
- Show generation status (GENERATING → COMPLETED)
- Download button when ready
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 9.1
- Reference: EP_Compliance_Product_Logic_Specification.md Section I.8 for pack types
```

**Task 6.2.2: Pack Distribution**

**Implementation Prompt:**
```
Implement pack distribution:
- Distribution method: Download, Email, Shared Link
- Email: recipient list, subject, message
- Shared Link: expiration date, password (optional)
- Submit: POST /api/v1/packs/{id}/distribute
- Plan restrictions: Core Plan (email Regulator/Audit only), Growth Plan (all methods)
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 9.2
```

## Phase 6.3: Onboarding Flow

**Task 6.3.1: Onboarding State Machine**

**Implementation Prompt:**
```
Implement onboarding state machine:
- States: SIGNUP → COMPANY_SETUP → SITE_SETUP → DOCUMENT_UPLOAD → TUTORIAL → COMPLETE
- Progress tracking: store in database (onboarding_progress table)
- Skip/back navigation
- Quick start option (skip tutorial)
- Reference: EP_Compliance_Onboarding_Flow_Specification.md Section 2.2
```

**Task 6.3.2: Onboarding Steps**

**Implementation Prompt:**
```
Implement onboarding steps:
1. Company Setup: company name, billing email
2. Site Setup: site name, regulator, water_company
3. Document Upload: upload first permit (tutorial mode)
4. Evidence Tutorial: link first evidence
5. Completion: redirect to dashboard
- Progress bar showing completion %
- Reference: EP_Compliance_Onboarding_Flow_Specification.md Section 2
```

## Phase 6.4: Notifications System

**Task 6.4.1: Notification Center**

**Implementation Prompt:**
```
Implement notification center:
- Bell icon in header (unread count badge)
- Dropdown: list of notifications
- Mark as read: PUT /api/v1/notifications/{id}/read
- Notification types: deadline warnings, evidence reminders, pack ready
- Real-time updates: Supabase Realtime subscription
- Reference: EP_Compliance_Frontend_Routes_Component_Map.md Section 11.1
```

## Phase 6 Testing

**Test Requirements:**
- [ ] Evidence upload works
- [ ] Pack generation completes
- [ ] Onboarding flow completes
- [ ] Notifications display correctly
- [ ] All features work on mobile

**Acceptance Criteria:**
- All features functional
- User can complete full workflow
- Mobile-responsive
- Error handling works

## Phase 6 Manual Verification (CRITICAL - You Must Check)

**⚠️ DO NOT TRUST TESTS ALONE - You must manually test complete workflows:**

1. **Complete User Journey (Manual End-to-End Test):**
   - [ ] **Step 1:** Signup as new user
   - [ ] **Step 2:** Complete onboarding (create site, upload permit)
   - [ ] **Step 3:** Wait for extraction (check background jobs)
   - [ ] **Step 4:** View extracted obligations
   - [ ] **Step 5:** Upload evidence file
   - [ ] **Step 6:** Link evidence to obligation
   - [ ] **Step 7:** Generate Regulator Pack
   - [ ] **Step 8:** Download pack PDF
   - [ ] **CRITICAL:** Open downloaded PDF → **YOU MUST SEE:** Valid PDF with your evidence
   - [ ] **VERIFY:** PDF contains correct obligations and evidence
   - **IF ANY STEP FAILS:** System is not working - fix before proceeding

2. **Pack Generation (Manual Visual Check):**
   - [ ] Generate each pack type (Regulator, Audit, Tender, Board, Insurer)
   - [ ] **FOR EACH PACK:** Download and open PDF
   - [ ] **VISUALLY VERIFY:** PDF structure matches specification
   - [ ] **MANUAL CHECK:** Regulator Pack has correct sections (Site Info, Obligations, Evidence)
   - [ ] **MANUAL CHECK:** Board Pack aggregates multiple sites correctly
   - [ ] **VERIFY:** All evidence files are included and readable

3. **Notification System (Manual Test):**
   - [ ] Create an obligation with deadline in 6 days
   - [ ] **WAIT:** Background job should create notification
   - [ ] **MANUAL CHECK:** Database → notifications table → **YOU MUST SEE:** Notification record
   - [ ] **VERIFY:** notification_type = 'DEADLINE_WARNING_7D'
   - [ ] **CHECK:** Email sent (if email configured) or in-app notification appears

4. **Multi-Site Workflow (Manual Test):**
   - [ ] Create Company with 2 sites
   - [ ] Upload document to Site 1
   - [ ] Upload document to Site 2
   - [ ] **VISUALLY VERIFY:** Dashboard shows data from both sites
   - [ ] **MANUAL CHECK:** Site filter works (can filter to Site 1 only)
   - [ ] **VERIFY:** Board Pack includes both sites

5. **Onboarding Flow (Manual Test):**
   - [ ] Create new test account
   - [ ] **FOLLOW:** Complete onboarding step-by-step
   - [ ] **VERIFY:** Progress bar updates
   - [ ] **VERIFY:** Can skip optional steps
   - [ ] **VERIFY:** Can go back to previous steps
   - [ ] **VERIFY:** On completion, redirects to dashboard

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT PROCEED TO PHASE 7 until you have manually completed a full user journey.**

## Phase 6 Automated Tests (Complete User Journey)

**Task 6.4.1: Create Complete User Journey E2E Tests**

**Implementation Prompt:**
```
Create E2E tests for complete user workflows (Phase 6):

1. Create test file: tests/e2e/complete-journey.test.ts

2. Test complete user journey (automates manual check #1):
   - Step 1: Signup as new user
     - Navigate to /signup
     - Fill form and submit
     - Assert: Redirects to onboarding
   - Step 2: Complete onboarding
     - Create site (fill site form)
     - Upload permit PDF
     - Assert: Onboarding progress updates
   - Step 3: Wait for extraction
     - Poll background_jobs table until COMPLETED
     - Assert: document.extraction_status = 'EXTRACTED'
   - Step 4: View extracted obligations
     - Navigate to /obligations
     - Assert: Obligations displayed
   - Step 5: Upload evidence
     - Navigate to /evidence
     - Upload evidence file
     - Assert: Evidence appears in list
   - Step 6: Link evidence to obligation
     - Navigate to obligation detail
     - Click "Link Evidence"
     - Select evidence file
     - Assert: Evidence linked (check database)
   - Step 7: Generate Regulator Pack
     - Navigate to /packs
     - Click "Generate Regulator Pack"
     - Wait for pack generation
     - Assert: Pack status = 'GENERATED'
   - Step 8: Download pack PDF
     - Click "Download" button
     - Assert: PDF file downloaded
     - Assert: PDF file size > 0
     - Assert: PDF is valid (can be opened)

3. Test pack generation for all types:
   - Generate Regulator Pack → Assert: PDF generated
   - Generate Audit Pack → Assert: PDF generated
   - Generate Tender Pack → Assert: PDF generated
   - Generate Board Pack → Assert: PDF generated
   - Generate Insurer Pack → Assert: PDF generated
   - For each pack: Assert: PDF contains correct sections

4. Test notification system (automates manual check #3):
   - Create obligation with deadline in 6 days
   - Wait for background job to run
   - Assert: Notification record created in database
   - Assert: notification_type = 'DEADLINE_WARNING_7D'
   - If email configured: Assert: Email sent

5. Test multi-site workflow (automates manual check #4):
   - Create company with 2 sites
   - Upload document to Site 1
   - Upload document to Site 2
   - Navigate to dashboard
   - Assert: Data from both sites visible
   - Filter to Site 1 only
   - Assert: Only Site 1 data visible
   - Generate Board Pack
   - Assert: Pack includes both sites

6. Test onboarding flow (automates manual check #5):
   - Create new test account
   - Navigate through onboarding steps
   - Assert: Progress bar updates
   - Skip optional step
   - Assert: Can proceed
   - Go back to previous step
   - Assert: Can edit previous step
   - Complete onboarding
   - Assert: Redirects to dashboard

Reference: Phase 6 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── e2e/
│   ├── complete-journey.test.ts     # Full user journey test
│   ├── pack-generation.test.ts      # All pack types test
│   ├── notifications.test.ts        # Notification system test
│   ├── multi-site.test.ts           # Multi-site workflow test
│   └── onboarding.test.ts           # Onboarding flow test
└── fixtures/
    └── test-permit.pdf               # Test permit PDF
```

**Run Tests:**
```bash
npm run test:e2e:journey
```

**Expected Output:**
```
✓ Complete journey: Signup → Upload → Extract → Link Evidence → Generate Pack
✓ Pack generation: All 5 pack types generate correctly
✓ Notifications: Deadline warnings created and sent
✓ Multi-site: Data isolation and aggregation work
✓ Onboarding: Flow completes successfully
```

**Note:** These tests automate the complete user journey. They take longer to run (5-10 minutes) but verify end-to-end functionality. You should still manually test with real users for UX feedback.

## Phase 6 Progress Checkpoint

**Before moving to Phase 7, verify:**

1. **End-to-End Workflow:**
   - Test: Signup → Upload Document → Extract → Link Evidence → Generate Pack
   - Expected: Complete workflow succeeds
   - Verify: All steps complete without errors

2. **Feature Completeness:**
   - [ ] Evidence upload and linking works
   - [ ] Pack generation produces valid PDFs
   - [ ] Onboarding completes successfully
   - [ ] Notifications display in real-time
   - [ ] All CRUD operations work

3. **Mobile Testing:**
   - Test: All features on mobile device
   - Expected: Touch-friendly, responsive
   - Verify: No horizontal scrolling, buttons accessible

4. **Performance:**
   ```bash
   # Run Lighthouse
   npm run lighthouse
   ```
   - Expected: Performance score >90
   - Verify: Page load times <3s

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Fix feature bugs, optimize performance. Do NOT proceed to Phase 7 until all features work.

## Phase 6 Rollback Steps

**If Phase 6 breaks:**

1. **Revert Feature Code:**
   ```bash
   git checkout HEAD~1 app/(dashboard)/
   ```

2. **Clear Feature Data:**
   ```sql
   -- If needed, reset specific feature data
   DELETE FROM audit_packs WHERE ...;
   ```

**After Rollback:** Fix feature bugs, re-test.

---

# PHASE 7: Integration & Testing

**Duration:** 2-3 weeks  
**Complexity:** Medium  
**Dependencies:** All previous phases

**Testing:** Automated production readiness tests included (Phase 7.3) - runs security, performance, and data integrity tests automatically complete

## Phase 7.1: End-to-End Testing

**Task 7.1.1: User Journey Tests**

**Implementation Prompt:**
```
Create end-to-end test scenarios:
1. Signup → Onboarding → Upload Document → Extract Obligations → Link Evidence → Generate Pack
2. Multi-site workflow: Create site → Upload document per site → View consolidated dashboard
3. Consultant workflow: Assign client → View client data → Generate client pack
4. Error scenarios: Invalid file upload, extraction failure, network errors
- Use Playwright or Cypress
- Test on Chrome, Firefox, Safari
- Reference: EP_Compliance_User_Workflow_Maps.md for user journeys
```

## Phase 7.2: Performance Testing

**Task 7.2.1: Load Testing**

**Implementation Prompt:**
```
Perform load testing:
- API endpoints: 100 concurrent requests
- Document upload: 10 simultaneous uploads
- Database queries: measure RLS policy performance
- Background jobs: queue depth under load
- Frontend: Lighthouse scores (target: 90+)
- Optimize slow queries, add indexes if needed
```

## Phase 7.3: Security Testing

**Task 7.3.1: Security Audit**

**Implementation Prompt:**
```
Security testing checklist:
- [ ] RLS policies prevent cross-tenant access
- [ ] Authentication required for all protected routes
- [ ] JWT tokens cannot be tampered with
- [ ] File uploads validated (type, size)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF protection (SameSite cookies)
- [ ] Rate limiting prevents abuse
- Reference: EP_Compliance_RLS_Permissions_Rules.md for RLS testing
```

## Phase 7.4: Deployment

**Task 7.4.1: Production Deployment**

**Implementation Prompt:**
```
Deploy to production:
1. Frontend: Vercel
   - Connect GitHub repo
   - Set environment variables
   - Configure custom domain
2. API: Vercel API routes (same deployment)
3. Workers: Railway/Render/Fly.io
   - Deploy worker service
   - Set environment variables
   - Configure Redis connection
4. Database: Supabase (already set up)
5. Storage: Supabase Storage buckets
6. Monitoring: Set up error tracking (Sentry)
7. Analytics: Set up usage tracking
- Reference: EP_Compliance_Technical_Architecture_Stack.md Section 10
```

## Phase 7.5: Documentation

**Task 7.5.1: API Documentation**

**Implementation Prompt:**
```
Generate API documentation:
- Use OpenAPI/Swagger spec
- Document all endpoints with examples
- Include authentication requirements
- Document error responses
- Generate interactive docs (Swagger UI)
- Reference: EP_Compliance_Backend_API_Specification.md Section 29
```

## Phase 7 Manual Verification (CRITICAL - Final Checks)

**⚠️ DO NOT DEPLOY TO PRODUCTION until you manually verify these:**

1. **Production-Like Environment Test:**
   - [ ] Deploy to staging environment (not production yet)
   - [ ] **MANUAL TEST:** Complete signup → upload → extract → pack generation
   - [ ] **VERIFY:** Everything works in staging
   - [ ] **CHECK:** Performance is acceptable (pages load <3s)

2. **Security Manual Check:**
   - [ ] Create two user accounts in staging
   - [ ] Login as User 1 → Create data
   - [ ] Login as User 2 → **VERIFY:** Cannot see User 1's data
   - [ ] **CRITICAL:** If User 2 can see User 1's data → **DO NOT DEPLOY** - security breach

3. **Data Integrity Check:**
   - [ ] Upload 10 documents
   - [ ] **MANUAL COUNT:** Obligations extracted
   - [ ] **VERIFY:** Count matches expected (check a few manually)
   - [ ] **VERIFY:** Evidence links correctly
   - [ ] **VERIFY:** Packs generate with correct data

4. **Error Recovery Test:**
   - [ ] Upload corrupted PDF → **VERIFY:** Error handled gracefully
   - [ ] Disconnect during upload → **VERIFY:** Can retry
   - [ ] Submit form with network error → **VERIFY:** Error message, can retry

5. **Real User Test (Get Someone Else):**
   - [ ] Give staging access to a real user (not you)
   - [ ] **ASK THEM:** Can they complete signup and upload a document?
   - [ ] **GET FEEDBACK:** Is it intuitive? Any confusion?
   - [ ] **FIX:** Any issues they find

**Manual Verification Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**⚠️ DO NOT LAUNCH until you have manually verified everything works in staging.**

## Phase 7 Automated Tests (Production Readiness)

**Task 7.3.1: Create Production Readiness Test Suite**

**Implementation Prompt:**
```
Create automated production readiness tests (Phase 7):

1. Create test file: tests/e2e/production-readiness.test.ts

2. Test production-like environment (automates manual check #1):
   - Deploy to staging environment
   - Run complete user journey test
   - Assert: All steps complete successfully
   - Measure: Page load times <3s
   - Measure: API response times <200ms (p95)

3. Test security (automates manual check #2):
   - Create two user accounts in staging
   - Login as User 1 → Create data
   - Login as User 2 → Query User 1's data
   - Assert: User 2 cannot see User 1's data (403 Forbidden)
   - Assert: RLS policies enforced

4. Test data integrity (automates manual check #3):
   - Upload 10 test documents
   - Assert: All documents processed
   - Count obligations extracted
   - Assert: Obligation count matches expected
   - Assert: Evidence links correctly
   - Generate pack
   - Assert: Pack contains correct data

5. Test error recovery (automates manual check #4):
   - Upload corrupted PDF
   - Assert: Error handled gracefully (not 500 error)
   - Assert: User can retry
   - Simulate network error during upload
   - Assert: Error message displayed
   - Assert: Can retry upload

6. Test performance benchmarks:
   - Measure API response times
   - Assert: p95 < 200ms
   - Measure page load times
   - Assert: <3s for all pages
   - Measure extraction times
   - Assert: <30s for standard documents

7. Test monitoring and health checks:
   - GET /api/v1/health
   - Assert: All services healthy
   - Assert: Response time <100ms
   - Check error tracking (Sentry)
   - Assert: Errors logged correctly

Reference: Phase 7 Manual Verification steps (automate what's possible)
```

**Test File Structure:**
```
tests/
├── e2e/
│   └── production-readiness.test.ts  # Production readiness tests
├── performance/
│   ├── api-benchmark.test.ts        # API performance tests
│   └── page-load.test.ts            # Page load time tests
└── security/
    └── rls-production.test.ts        # Production security tests
```

**Run Tests:**
```bash
# Run in staging environment
STAGING_URL=https://staging.oblicore.com npm run test:e2e:production
```

**Expected Output:**
```
✓ Production environment: All features work in staging
✓ Security: RLS policies prevent cross-tenant access
✓ Data integrity: All data processed correctly
✓ Error recovery: Errors handled gracefully
✓ Performance: All benchmarks met
✓ Monitoring: Health checks pass
```

**Note:** These tests should run in staging before production deployment. They verify production readiness but don't replace manual user testing for UX feedback.

## Phase 7 Progress Checkpoint

**Before production launch, verify:**

1. **All Tests Pass:**
   ```bash
   npm run test
   npm run test:e2e
   ```
   - Expected: All unit, integration, E2E tests pass
   - Verify: Test coverage >80%

2. **Security Audit:**
   - [ ] RLS policies prevent cross-tenant access
   - [ ] Authentication required everywhere
   - [ ] File uploads validated
   - [ ] SQL injection prevented
   - [ ] XSS prevented
   - [ ] CSRF protection enabled

3. **Performance Benchmarks:**
   - API response times: <200ms (p95)
   - Page load times: <3s
   - Database queries: <100ms (p95)
   - Background jobs: Complete within timeout

4. **Production Readiness:**
   - [ ] Environment variables configured
   - [ ] Error tracking (Sentry) set up
   - [ ] Monitoring/alerting configured
   - [ ] Backup strategy in place
   - [ ] Documentation complete

**Checkpoint Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

**If checkpoint fails:** Fix critical issues before launch.

---

# Validation Scripts

## RLS Validation Script

**File:** `scripts/validate-rls.sql`

```sql
-- Validate RLS is enabled on all tenant tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename NOT IN ('system_settings', 'background_jobs', 'dead_letter_queue')
ORDER BY tablename;

-- Expected: All tables have rowsecurity = true and policy_count >= 4

-- Test cross-tenant isolation
-- Create test users in different companies
-- Verify: User 1 cannot SELECT User 2's data
```

## API Validation Script

**File:** `scripts/validate-api.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "Testing API endpoints..."

# Health check
curl -f "$BASE_URL/health" || exit 1

# Signup
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test Co","email":"test@example.com","password":"Test1234!"}')

TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.token')

# Protected route
curl -f -H "Authorization: Bearer $TOKEN" "$BASE_URL/companies" || exit 1

# Without auth (should fail)
curl -f "$BASE_URL/companies" && exit 1 || echo "Auth check passed"

echo "API validation complete"
```

## Database Schema Validation Script

**File:** `scripts/validate-schema.sql`

```sql
-- Validate all tables exist
SELECT 
  CASE 
    WHEN COUNT(*) = 36 THEN 'PASS'
    ELSE 'FAIL - Expected 36 tables, found ' || COUNT(*)
  END as table_count_check
FROM information_schema.tables
WHERE table_schema = 'public';

-- Validate foreign keys
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Validate indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Background Jobs Validation Script

**File:** `scripts/validate-jobs.sh`

```bash
#!/bin/bash

echo "Validating background jobs..."

# Check Redis connection
redis-cli ping || exit 1

# Check job queues exist
QUEUES=("document-processing" "monitoring-schedule" "deadline-alerts" "evidence-reminders")
for queue in "${QUEUES[@]}"; do
  redis-cli EXISTS "bull:$queue:meta" || echo "Warning: Queue $queue not found"
done

# Check worker health
# (Implementation depends on worker deployment)

echo "Job validation complete"
```

## Frontend Validation Script

**File:** `scripts/validate-frontend.sh`

```bash
#!/bin/bash

echo "Validating frontend..."

# Build check
npm run build || exit 1

# Type check
npm run type-check || exit 1

# Lint check
npm run lint || exit 1

# Test build output
if [ -d ".next" ]; then
  echo "Build output exists"
else
  echo "ERROR: Build output missing"
  exit 1
fi

echo "Frontend validation complete"
```

---

# Rollback Procedures

## Full System Rollback

**If critical issues found in production:**

1. **Database Rollback:**
   ```sql
   -- Restore from backup
   -- Or rollback specific migrations
   ```

2. **Code Rollback:**
   ```bash
   # Rollback to previous stable commit
   git checkout <stable-commit-hash>
   git push --force origin main
   ```

3. **Redeploy:**
   ```bash
   # Vercel auto-deploys on push
   # Workers: Redeploy from Railway/Render
   ```

## Partial Rollback (Feature Flag)

**If specific feature breaks:**

1. **Disable Feature:**
   ```sql
   -- Use feature flags in system_settings
   UPDATE system_settings 
   SET value = 'false' 
   WHERE key = 'feature_pack_generation';
   ```

2. **Revert Feature Code:**
   ```bash
   git revert <feature-commit-hash>
   ```

---

# CI/CD Integration (Automated Test Execution)

## GitHub Actions Setup

**Task: Add CI/CD Pipeline**

**Implementation Prompt:**
```
Create GitHub Actions workflow for automated testing:

1. Create file: .github/workflows/test.yml

2. Configure workflow to run on every push and PR:
   - Run unit tests
   - Run integration tests (database, API)
   - Run E2E tests (frontend, complete journey)
   - Run linting
   - Run type checking
   - Block merge if any test fails

3. Set up test database:
   - Use Supabase test project
   - Run migrations before tests
   - Clean up after tests

4. Set up test environment:
   - Install dependencies
   - Build application
   - Start test server
   - Run tests
   - Generate coverage report

Reference: TESTING_AND_QUALITY_ASSURANCE_STRATEGY.md
```

**Workflow File:**
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
```

**Benefits:**
- Tests run automatically on every commit
- Prevents broken code from being merged
- Catches regressions early
- Provides confidence before manual testing

---

# What's Automated vs Manual

## ✅ Fully Automated (No Manual Check Needed)
- RLS security isolation (automated test verifies data isolation)
- API authentication (automated test verifies auth works)
- API endpoint functionality (automated test verifies all endpoints)
- Frontend page rendering (E2E tests verify pages load)
- Complete user journey (E2E tests verify full workflow)
- Performance benchmarks (automated tests measure and verify)
- Error handling (automated tests verify error states)

## ⚠️ Semi-Automated (Automated + Manual Verification)
- AI extraction accuracy (automated test checks extraction works, but manual verification ensures quality)
- Pack PDF content (automated test verifies PDF generated, but manual check ensures content is correct)
- UI/UX feel (automated test verifies functionality, but manual check ensures good UX)

## 🔍 Manual Only (Requires Human Judgment)
- Visual design (does it look good?)
- User experience (is it intuitive?)
- Real-world document accuracy (does extraction match real permits?)
- Business logic correctness (does it make business sense?)
- Accessibility (WCAG compliance - can be partially automated)

---

# Preview & Visibility Guide

## How to See Your Work Progress

### Phase 1 (Database): Supabase Dashboard
- **Where to look:** Supabase Dashboard → Database → Tables
- **What you'll see:** All tables, their columns, data
- **How to verify:** Count tables, check columns match schema
- **Preview:** SQL Editor → Run queries to see data

### Phase 2 (API): Postman/Browser/curl
- **Where to look:** API endpoints (http://localhost:3000/api/v1/...)
- **What you'll see:** JSON responses, status codes
- **How to verify:** Test each endpoint manually
- **Preview:** Use Postman collection or browser DevTools

### Phase 3 (AI Extraction): Database + Logs
- **Where to look:** 
  - Database → obligations table (see extracted data)
  - Database → extraction_logs (see AI costs, patterns matched)
- **What you'll see:** Obligations extracted from your PDFs
- **How to verify:** Compare extracted text to original PDF
- **Preview:** Query obligations table, read obligation_text

### Phase 4 (Background Jobs): Database + Worker Logs
- **Where to look:**
  - Database → background_jobs table (job status)
  - Worker service logs (execution details)
- **What you'll see:** Jobs processing, completing, failing
- **How to verify:** Check job status, verify notifications sent
- **Preview:** Monitor background_jobs table in real-time

### Phase 5 (Frontend): Browser
- **Where to look:** http://localhost:3000
- **What you'll see:** Actual UI, pages, forms
- **How to verify:** Click around, test forms, check responsiveness
- **Preview:** Full visual interface - you can see everything

### Phase 6 (Features): Browser + Database
- **Where to look:** Browser (UI) + Database (verify data)
- **What you'll see:** Complete features working
- **How to verify:** Test full workflows, check data in database
- **Preview:** Complete user experience

---

# Critical Manual Checkpoints (DO NOT SKIP)

## ⚠️ These MUST be checked manually - tests are not enough:

### 1. Phase 1: RLS Security Test (CRITICAL)
**Why:** If RLS is broken, users can see each other's data (security breach)
**What to do:**
- Create two test companies
- Verify User 1 cannot see User 2's data
- **If broken:** DO NOT PROCEED - fix RLS immediately

### 2. Phase 2: API Authentication Test (CRITICAL)
**Why:** If auth is broken, anyone can access data
**What to do:**
- Test protected routes without token → Should fail
- Test with token → Should work
- **If broken:** DO NOT PROCEED - fix authentication

### 3. Phase 3: AI Extraction Accuracy (CRITICAL)
**Why:** If extraction is wrong, system is useless
**What to do:**
- Upload a REAL permit PDF
- Manually compare extracted obligations to PDF text
- **If wrong:** DO NOT PROCEED - fix extraction logic

### 4. Phase 5: Frontend Visual Check (CRITICAL)
**Why:** UI bugs are obvious to users
**What to do:**
- Open every page in browser
- Click every button
- Test on mobile
- **If broken:** DO NOT PROCEED - fix UI

### 5. Phase 6: Complete User Journey (CRITICAL)
**Why:** If end-to-end doesn't work, system doesn't work
**What to do:**
- Complete full workflow: Signup → Upload → Extract → Link Evidence → Generate Pack
- Download pack PDF → Open it → Verify it's correct
- **If broken:** DO NOT PROCEED - fix workflow

### 6. Phase 7: Staging Environment Test (CRITICAL)
**Why:** Production issues are expensive
**What to do:**
- Deploy to staging
- Test everything again
- Get real user feedback
- **If broken:** DO NOT DEPLOY - fix issues

---

# Confidence Building Checklist

## How to Be 1000% Confident Things Work:

### ✅ Automated Tests (Trust but Verify)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- **But:** Don't trust blindly - also do manual checks

### ✅ Manual Verification (You Must Do)
- [ ] Phase 1: Visually check Supabase Dashboard
- [ ] Phase 2: Manually test API endpoints
- [ ] Phase 3: Manually verify extraction accuracy
- [ ] Phase 5: Manually test frontend in browser
- [ ] Phase 6: Manually complete full user journey
- [ ] Phase 7: Manually test in staging

### ✅ Real User Testing (Get Feedback)
- [ ] Give staging access to 2-3 real users
- [ ] Watch them use it (screen share)
- [ ] Get their feedback
- [ ] Fix issues they find

### ✅ Performance Verification
- [ ] Check API response times (<200ms)
- [ ] Check page load times (<3s)
- [ ] Check extraction times (<30s for standard)
- [ ] Monitor error rates (<1%)

### ✅ Security Verification
- [ ] RLS policies prevent cross-tenant access
- [ ] Authentication required everywhere
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### ✅ Data Integrity Verification
- [ ] Uploaded documents stored correctly
- [ ] Extracted obligations match source PDF
- [ ] Evidence links correctly
- [ ] Packs generate with correct data

---

# Build Order Logic Assessment

## Is the Build Order Logical? ✅ YES

**Why it's logical:**
1. **Foundation First:** Database → API → Frontend (correct dependency order)
2. **Core Before Features:** Basic CRUD before advanced features
3. **Backend Before Frontend:** API must work before UI can use it
4. **Sequential Critical Path:** Phase 1 → 2 → 3 → 5 must be in order
5. **Parallel Work Identified:** Phase 4 & 6 can be done in parallel

**Could be improved:**
- Add automated testing earlier (not wait until Phase 7)
- Add monitoring earlier (during Phase 2)
- Add preview steps (how to see your work)

---

# Implementation Notes

## Reading Large Documents

When working with Claude or other AI assistants, use offset/limit for large files:

```typescript
// Example: Reading EP_Compliance_Database_Schema.md (2,383 lines)
read_file(target_file, offset: 0, limit: 500)    // Lines 1-500
read_file(target_file, offset: 500, limit: 500)  // Lines 501-1000
read_file(target_file, offset: 1000, limit: 500) // Lines 1001-1500
// etc.
```

## Critical Dependencies

1. **Database tables must be created in order** (Section 1.6 of Database Schema)
2. **RLS policies must be created after tables** (Phase 1.4)
3. **API endpoints depend on database schema** (Phase 2 after Phase 1)
4. **Frontend depends on API endpoints** (Phase 5 after Phase 2)
5. **Background jobs depend on database and API** (Phase 4 after Phase 2)

## Testing Strategy

- **Unit Tests:** Each component/function in isolation
- **Integration Tests:** API + Database interactions
- **E2E Tests:** Full user workflows
- **Performance Tests:** Load testing, query optimization
- **Security Tests:** RLS, authentication, authorization

## Success Criteria

Phase 1: Database schema matches documentation, RLS policies work  
Phase 2: All API endpoints functional, authentication works  
Phase 3: Document extraction works, confidence scores accurate  
Phase 4: Background jobs run on schedule, retry logic works  
Phase 5: Frontend renders correctly, data loads from API  
Phase 6: All features functional, onboarding completes  
Phase 7: System ready for production, all tests pass

---

**Total Estimated Timeline:** 12-16 weeks  
**Critical Path:** Phase 1 → Phase 2 → Phase 3 → Phase 5 (must be sequential)  
**Parallel Work:** Phase 4 and Phase 6 can be developed in parallel

**Next Steps:** Start with Phase 1.1 (Supabase Project Setup)

---

# Progress Tracking

## Overall Progress Tracker

**Phase 1: Foundation**
- [ ] 1.1 Supabase Setup
- [ ] 1.2 Database Schema
- [ ] 1.3 Indexes & Constraints
- [ ] 1.4 RLS Policies
- [ ] 1.5 Auth Integration
- [ ] 1.6 Seed Data
- [ ] ✅ Phase 1 Checkpoint Passed

**Phase 2: Core API**
- [ ] 2.1 API Setup
- [ ] 2.2 Authentication
- [ ] 2.3 Core Entities
- [ ] 2.4 Document Upload
- [ ] 2.5 Obligations
- [ ] 2.6 Evidence
- [ ] 2.7 Standard Features
- [ ] ✅ Phase 2 Checkpoint Passed

**Phase 3: AI/Extraction**
- [ ] 3.1 OpenAI Setup
- [ ] 3.2 Rule Library
- [ ] 3.3 Document Processing
- [ ] 3.4 Confidence Scoring
- [ ] ✅ Phase 3 Checkpoint Passed

**Phase 4: Background Jobs**
- [ ] 4.1 BullMQ Setup
- [ ] 4.2 Monitoring Jobs
- [ ] 4.3 Document Processing
- [ ] 4.4 Pack Generation
- [ ] ✅ Phase 4 Checkpoint Passed

**Phase 5: Frontend Core**
- [ ] 5.1 Next.js Setup
- [ ] 5.2 Authentication
- [ ] 5.3 Dashboard
- [ ] 5.4 Documents
- [ ] 5.5 Obligations
- [ ] ✅ Phase 5 Checkpoint Passed

**Phase 6: Frontend Features**
- [ ] 6.1 Evidence
- [ ] 6.2 Pack Generation
- [ ] 6.3 Onboarding
- [ ] 6.4 Notifications
- [ ] ✅ Phase 6 Checkpoint Passed

**Phase 7: Integration & Testing**
- [ ] 7.1 E2E Testing
- [ ] 7.2 Performance
- [ ] 7.3 Security
- [ ] 7.4 Deployment
- [ ] 7.5 Documentation
- [ ] ✅ Phase 7 Checkpoint Passed

**Overall Status:** ⬜ 0% | ⬜ 25% | ⬜ 50% | ⬜ 75% | ⬜ 100% Complete

