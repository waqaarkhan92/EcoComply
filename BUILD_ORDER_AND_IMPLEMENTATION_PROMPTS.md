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
**Dependencies:** All previous phases complete

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

