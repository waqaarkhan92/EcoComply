# Technical Architecture & Stack
## EcoComply Platform — Document 2.1

**EcoComply v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created By:** Cursor  
**Depends On:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Canonical Dictionary (1.2) - Complete

**Purpose:** Defines the complete technical infrastructure, frameworks, and architectural decisions for the EcoComply platform.

> [v1 UPDATE – Version Header – 2024-12-27]

---

# Table of Contents

1. [Database Layer: PostgreSQL (Supabase)](#1-database-layer-postgresql-supabase)
2. [Background Jobs Framework](#2-background-jobs-framework)
3. [API Layer](#3-api-layer)
4. [Frontend Framework: Next.js 14](#4-frontend-framework-nextjs-14)
5. [AI Service Integration](#5-ai-service-integration)
6. [External Integrations](#6-external-integrations)
7. [Environment Configuration](#7-environment-configuration)
8. [Security Architecture](#8-security-architecture)
9. [Performance & Scalability](#9-performance--scalability)
10. [Deployment Architecture](#10-deployment-architecture)

---

# 1. Database Layer: PostgreSQL (Supabase)

## 1.1 Platform & Configuration

**Platform:** Supabase (PostgreSQL 15+)

**Justification:**
- Managed PostgreSQL with built-in authentication, storage, and real-time capabilities
- Native Row Level Security (RLS) support for multi-tenant architecture
- Integrated storage buckets for document and evidence management
- Real-time subscriptions for live updates
- Automatic backups and point-in-time recovery
- Generous free tier for development, scalable paid tiers for production

**PostgreSQL Version:** 15+ (latest stable version available on Supabase)

**Region Selection:**
- **Primary Region:** EU (London) - for UK data residency compliance
- **Considerations:**
  - GDPR compliance (data must remain in EU)
  - Latency optimization for UK-based users
  - Regulatory requirements for environmental compliance data

**Connection Pooling:**
- **Strategy:** Supabase connection pooling (PgBouncer)
- **Pool Mode:** Transaction mode (recommended for Supabase)
- **Connection Limits:**
  - Development: 60 connections per pool
  - Production: 200 connections per pool
  - Use connection pooler URL for all application connections
- **Pooling Benefits:**
  - Reduces connection overhead
  - Prevents connection exhaustion
  - Improves performance for serverless functions

**Database Extensions Required:**
```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Trigram similarity for fuzzy search

-- JSON operations (built-in, but ensure enabled)
-- JSONB indexing and querying for modules table, rule library patterns

-- Additional extensions (if needed):
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For encryption functions
```

**Database Configuration:**
- **Timezone:** UTC (all timestamps stored in UTC, converted in application layer)
- **Character Encoding:** UTF-8
- **Case Sensitivity:** Identifiers are case-insensitive (PostgreSQL default)
- **Naming Convention:** Follow Canonical Dictionary Section A (snake_case, plural tables)

---

## 1.2 Database Structure

**Reference:** Canonical Dictionary for complete table definitions

**Core Tables (from Canonical Dictionary):**
- **Core Entities:** `companies`, `sites`, `users`, `user_roles`, `user_site_assignments`
- **Module Registry:** `modules` (see Canonical Dictionary Section C.4 - Module Registry Table)
- **Module 1 (Environmental Permits):** `documents`, `document_site_assignments`, `obligations`, `evidence_items`, `schedules`, `deadlines`, `obligation_evidence_links`, `audit_packs`, `permit_versions`, `obligation_versions`, `enforcement_notices`, `compliance_decisions`, `permit_workflows`, `permit_variations`, `permit_surrenders`, `condition_evidence_rules`, `condition_permissions`, `evidence_completeness_scores`
  - **Note:** Condition-level evidence mapping stored in `obligations.evidence_rules` (JSONB) and `condition_evidence_rules` table
  - **Note:** Evidence versioning tracked in `evidence_items.version_history` (JSONB)
  - **Note:** Permit change tracking via `permit_versions` and `obligation_versions` tables
  - **Note:** Permit lifecycle workflows (variations, renewals, surrenders) tracked in `permit_workflows`, `permit_variations`, and `permit_surrenders` tables
  - **Note:** Condition-level permissions tracked in `condition_permissions` table
  - **Note:** Evidence completeness scoring tracked in `evidence_completeness_scores` table
- **Module 2 (Trade Effluent):** `parameters`, `lab_results`, `exceedances`, `discharge_volumes`, `consent_states`, `corrective_actions`, `sampling_logistics`, `monthly_statements`, `statement_reconciliations`, `reconciliation_discrepancies`
  - **Note:** Trade effluent consents are stored as `documents` with `document_type = 'TRADE_EFFLUENT_CONSENT'`
  - **Note:** Consent state machine tracked in `consent_states` table
  - **Note:** Sampling logistics workflow tracked in `sampling_logistics` table
  - **Note:** Monthly statement reconciliation tracked in `monthly_statements`, `statement_reconciliations`, and `reconciliation_discrepancies` tables
- **Module 3 (MCPD/Generators):** `generators`, `run_hour_records`, `stack_tests`, `maintenance_records`, `aer_documents`, `runtime_monitoring`, `exemptions`, `compliance_clocks`, `fuel_usage_logs`, `sulphur_content_reports`
  - **Note:** MCPD registrations are stored as `documents` with `document_type = 'MCPD_REGISTRATION'`
  - **Note:** Runtime monitoring integration data stored in `runtime_monitoring` table
  - **Note:** Exemption logic tracked in `exemptions` table
  - **Note:** Fuel usage logs track daily/monthly fuel consumption with sulphur content
  - **Note:** Sulphur content reports store test results and compliance verification
- **Module 4 (Hazardous Waste):** `waste_streams`, `consignment_notes`, `contractor_licences`, `chain_of_custody`, `end_point_proofs`, `chain_break_alerts`
  - **Note:** Waste stream classification stored in `waste_streams` table with EWC codes
  - **Note:** Chain of custody tracked in `chain_of_custody` table
  - **Note:** Validation rules engine logic in `consignment_notes.validation_rules` (JSONB)
- **System Tables:** `notifications`, `background_jobs`, `dead_letter_queue`, `audit_logs`, `regulator_questions`, `review_queue_items`, `escalations`, `system_settings`, `recurring_tasks`, `evidence_expiry_tracking`, `pack_sharing`
- **Cross-Module:** `module_activations`, `cross_sell_triggers`
- **AI/Extraction:** `extraction_logs`
  - **Note:** Rules library patterns are stored in codebase (see Document 1.6 - AI Extraction Rules Library) or in a database table if implemented. The `extraction_logs.rule_library_version` field tracks which version of the rules library was used.

**Module Extension Pattern:**
- All module-specific tables follow consistent patterns (see Canonical Dictionary Section B.31)
- Module routing is data-driven via `modules` table (not hardcoded)
- New modules can be added by inserting records into `modules` table and creating module-specific tables following the same pattern
- All module references use `module_id` (UUID foreign key) - see PLS Section A.1.1

**Key Architectural Principles:**
- **Multi-Tenant Isolation:** All tenant-scoped tables include `company_id` or `site_id` for data isolation
- **Soft Deletes:** Use `deleted_at` timestamp for soft deletes (preserves audit trail)
- **Audit Fields:** All tables include `created_at`, `updated_at`, `created_by`, `updated_by`
- **Versioning:** `obligations` table includes `version_number` and `version_history` (JSONB) for obligation versioning (see PLS Section B.11)

---

## 1.3 Row Level Security (RLS)

**High-Level Strategy:** (Detailed RLS policies defined in Document 2.8)

**RLS Enablement:**
- RLS enabled on ALL tenant-scoped tables
- RLS policies enforce company/site isolation at database level
- Policies reference PLS Section B.10 (Permissions Matrix) for role-based access

**RLS Policy Structure:**
```sql
-- Example: Enable RLS on obligations table
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;

-- Policies will be defined in Document 2.8, but structure:
-- 1. SELECT policies: Based on user role and company/site membership
-- 2. INSERT policies: Based on user role and company/site assignment
-- 3. UPDATE policies: Based on user role and ownership
-- 4. DELETE policies: Based on user role (typically restricted to Owners/Admins)
```

**Multi-Tenant Isolation:**
- All queries automatically filtered by `company_id` or `site_id` via RLS policies
- Users can only access data for companies/sites they are assigned to
- Cross-tenant data access prevented at database level

**Role-Based Access:**
- RLS policies enforce role-based permissions (Owner, Admin, Staff, Consultant, Viewer)
- Reference PLS Section B.10.2.1 (Entity × Role CRUD Permissions Matrix)
- Viewer role: Read-only access enforced at database level
- Owner/Admin roles: Full CRUD access within their company/site scope
- **Granular Access Control:**
  - Site-level permissions: Users can only access data for assigned sites
  - Unit-level permissions: Module 1 supports condition-level permissions (stored in `obligations.condition_id`)
  - Permit condition-level permissions: Fine-grained access control for specific permit conditions

**Storage Bucket RLS:**
- Supabase Storage buckets use RLS policies for file access control
- Policies mirror database RLS (users can only access files for their company/site)
- Bucket policies defined per bucket (documents, evidence, audit-packs, aer-documents)

**Note:** Detailed RLS policy definitions, including all table-specific policies, will be provided in Document 2.8 (RLS & Permissions Rules).

---

## 1.4 Indexing Strategy

**Primary Key Indexes:**
- Auto-created by PostgreSQL for all primary keys
- All tables use UUID primary keys (`id` column)
- Index name: `{table}_pkey`

**Foreign Key Indexes:**
- **Critical Foreign Keys (auto-indexed by PostgreSQL):**
  - `documents.company_id`, `documents.site_id`, `documents.module_id`
  - `obligations.document_id`, `obligations.company_id`, `obligations.site_id`
  - `evidence_items.site_id`, `evidence_items.company_id`
  - `module_activations.company_id`, `module_activations.module_id`
  - All other foreign keys as defined in Canonical Dictionary

**Search Indexes:**
```sql
-- Full-text search on documents
CREATE INDEX idx_documents_fulltext ON documents 
USING gin(to_tsvector('english', title || ' ' || COALESCE(extracted_text, '')));

-- Full-text search on obligations
CREATE INDEX idx_obligations_fulltext ON obligations 
USING gin(to_tsvector('english', COALESCE(summary, '') || ' ' || original_text));

-- Trigram similarity for fuzzy search
CREATE INDEX idx_documents_title_trgm ON documents 
USING gin(title gin_trgm_ops);
```

**Composite Indexes for Common Query Patterns:**
```sql
-- Deadline queries (frequently filtered by status and date)
CREATE INDEX idx_deadlines_status_due_date ON deadlines(status, due_date) 
WHERE status IN ('PENDING', 'DUE_SOON', 'OVERDUE');

-- Evidence lookups by obligation
CREATE INDEX idx_obligation_evidence_links_obligation ON obligation_evidence_links(obligation_id, evidence_id);

-- Module activation queries
CREATE INDEX idx_module_activations_company_module ON module_activations(company_id, module_id) 
WHERE status = 'ACTIVE';

-- Background job queries (status, priority, scheduled_for)
CREATE INDEX idx_background_jobs_status_priority ON background_jobs(status, priority, scheduled_for) 
WHERE status IN ('PENDING', 'RUNNING');

-- Job health monitoring (heartbeat queries)
CREATE INDEX idx_background_jobs_health ON background_jobs(health_status, last_heartbeat) 
WHERE health_status != 'HEALTHY';
```

**Performance Optimization Indexes:**
```sql
-- Deadline calculations (frequently queried)
CREATE INDEX idx_obligations_deadline_calc ON obligations(company_id, site_id, frequency, deadline_date) 
WHERE status != 'COMPLETED';

-- Evidence linking queries
CREATE INDEX idx_evidence_items_obligation_lookup ON evidence_items(company_id, site_id, created_at);

-- Audit pack generation (obligation filtering)
CREATE INDEX idx_obligations_audit_pack ON obligations(document_id, status) 
WHERE status IN ('COMPLETED', 'IN_PROGRESS');
```

**Index Maintenance:**
- Regular `VACUUM ANALYZE` (automated by Supabase)
- Monitor index usage with `pg_stat_user_indexes`
- Remove unused indexes to reduce write overhead

---

## 1.5 Storage (Supabase Storage)

**Bucket Structure:**

```
documents/
  ├── {company_id}/
  │   ├── {site_id}/
  │   │   ├── {document_id}/
  │   │   │   ├── original.pdf (UUID filename, original name in metadata)
  │   │   │   └── extracted_text.txt (optional, cached extraction)

evidence/
  ├── {company_id}/
  │   ├── {site_id}/
  │   │   ├── {evidence_id}/
  │   │   │   └── {uuid}.{ext} (UUID filename, original name in metadata)

audit-packs/
  ├── {company_id}/
  │   ├── {site_id}/
  │   │   ├── {audit_pack_id}/
  │   │   │   └── audit-pack-{timestamp}.pdf

aer-documents/
  ├── {company_id}/
  │   ├── {generator_id}/
  │   │   ├── {aer_document_id}/
  │   │   │   └── aer-{year}.pdf

waste-documents/
  ├── {company_id}/
  │   ├── {site_id}/
  │   │   ├── consignment-notes/
  │   │   │   └── {consignment_note_id}/
  │   │   │       └── {uuid}.pdf
  │   │   ├── end-point-proofs/
  │   │   │   └── {end_point_proof_id}/
  │   │   │       └── {uuid}.pdf
```

**Bucket Setup Instructions:**
1. Create buckets in Supabase Dashboard:
   - `documents` (private bucket)
   - `evidence` (private bucket)
   - `audit-packs` (private bucket)
   - `aer-documents` (private bucket)
2. Configure RLS policies (see Document 2.8 - RLS & Permissions Rules):
   - Users can only access files for their assigned companies/sites
   - Service role can access all files (for background jobs)
3. Set CORS configuration:
   - Allowed origin: `NEXT_PUBLIC_APP_URL`
   - Allowed methods: GET, POST, PUT, DELETE
   - Allowed headers: Authorization, Content-Type
4. Set file size limits:
   - Documents: 50MB max
   - Evidence: 25MB max
   - Generated PDFs: 100MB max
5. Enable public access: No (all buckets are private)

**File Naming Conventions:**
- **Storage Filename:** UUID-based (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`)
- **Original Filename:** Stored in database `file_name` or `original_filename` field
- **Metadata:** File metadata stored in database tables (not in filename)
- **Benefits:**
  - Prevents filename conflicts
  - Avoids special character issues
  - Original filename preserved for user display

**Encryption:**
- **At Rest:** Supabase default encryption (AES-256)
- **In Transit:** HTTPS/TLS for all file transfers
- **Access Control:** RLS policies on storage buckets (mirror database RLS)

**File Size Limits:**
- **Documents (permits, consents, registrations):** 50 MB max
- **Evidence Files:** 25 MB max
- **Generated PDFs (audit packs, AERs):** 100 MB max
- **Waste Documents (consignment notes, end-point proofs):** 25 MB max
- **Validation:** File size checked before upload (client and server-side)

**Retention Policies:**
- **Documents:** Retained indefinitely (regulatory requirement)
- **Evidence:** Retained indefinitely (audit trail requirement)
- **Audit Packs:** Retained for 7 years (regulatory requirement)
- **AER Documents:** Retained for 7 years (regulatory requirement)
- **Waste Documents (consignment notes, end-point proofs):** Retained for 7 years (regulatory requirement)
- **Soft Deletes:** Files marked as deleted but retained for compliance
- **Hard Deletes:** Only after explicit user request and compliance period expiration
- **Evidence Expiry Tracking:** Evidence expiry dates tracked in database, alerts sent before expiry

**Access Control:**
- RLS policies on storage buckets enforce company/site isolation
- Users can only access files for their assigned companies/sites
- Role-based access (Viewer: read-only, others: read/write within scope)

---

## 1.6 Real-time Features (Supabase Realtime)

**Real-time Subscriptions Strategy:**

**Use Cases:**
- **Job Status Updates:** Real-time updates when background jobs complete/fail
- **Deadline Alerts:** Live updates when deadlines approach or become overdue
- **Evidence Linking:** Real-time updates when evidence is linked to obligations
- **Obligation Status Changes:** Live updates when obligation status changes
- **Notification Delivery:** Real-time notification delivery to connected clients

**Channel Structure:**
```typescript
// Company-scoped channel
`company:${company_id}`

// Site-scoped channel
`site:${site_id}`

// User-specific channel
`user:${user_id}`

// Job status channel
`job:${job_id}`

// Document processing channel
`document:${document_id}`
```

**Subscription Management:**
- **Subscribe:** When user navigates to relevant page (e.g., obligations list, job status)
- **Unsubscribe:** When user navigates away or component unmounts
- **Reconnection:** Automatic reconnection with exponential backoff
- **Connection Limits:** Monitor connection count per user/company

**Database Change Listeners:**
```sql
-- Example: Listen to obligation status changes
-- Supabase Realtime automatically publishes changes to tables with RLS enabled
-- Client subscribes to: supabase.channel('site:123').on('postgres_changes', {
--   event: 'UPDATE',
--   schema: 'public',
--   table: 'obligations',
--   filter: 'site_id=eq.123'
-- }, handleUpdate)
```

**Performance Considerations:**
- **Connection Limits:** Max 100 concurrent connections per Supabase project (free tier: 200)
- **Message Batching:** Batch multiple updates into single message when possible
- **Selective Subscriptions:** Only subscribe to channels user has access to
- **Rate Limiting:** Supabase enforces rate limits on real-time messages
- **Fallback:** Polling fallback if real-time connection fails

**Connection Management:**
- Monitor connection count per company
- Implement connection pooling at application level
- If limit reached: Fall back to polling (every 5 seconds)
- Alert admins when >80% of limit reached

**Integration with Frontend:**
- React hooks for real-time subscriptions (see Frontend Framework section)
- Automatic UI updates when database changes occur
- Optimistic updates with rollback on error

---

# 2. Background Jobs Framework

## 2.1 Job Execution Framework

**Selected Framework: BullMQ with Redis**

**Justification:**

**Why BullMQ:**
- **Reliability:** Built-in retry mechanisms, dead-letter queue support (required by PLS Section B.7.4)
- **Scalability:** Horizontal scaling with multiple workers
- **Priority Queues:** Support for job prioritization (critical for deadline alerts)
- **Job Scheduling:** Built-in cron-like scheduling for recurring jobs
- **Job Status Tracking:** Comprehensive job status tracking (see Canonical Dictionary `job_status` enum)
- **Health Monitoring:** Supports heartbeat and stale job detection (required by PLS Section B.7.4)

**Why Not Supabase Realtime:**
- Realtime is event-driven, not designed for long-running jobs
- Limited retry and DLQ capabilities
- No built-in job scheduling

**Why Not Vercel Background Jobs:**
- Vercel functions have execution time limits (10s hobby, 60s pro)
- Document processing can take up to 5 minutes (large documents per PLS Section A.9.1)
- Limited job queue features compared to BullMQ

**Redis Configuration:**
- **Provider:** Upstash Redis (serverless, compatible with Vercel)
- **Alternative:** Redis Cloud or self-hosted Redis
- **Connection:** Use Redis URL from environment variables
  - Environment Variable: `REDIS_URL` (required)
  - Format: `redis://[password]@[host]:[port]` or `rediss://` for TLS
  - Upstash Format: `rediss://default:[password]@[host]:[port]`
  - Fallback: If Redis unavailable, jobs queue in database (degraded mode)
- **Persistence:** Redis persistence enabled for job durability
- **Connection Pooling:** Upstash Redis handles connection pooling automatically

**Job Queue Architecture:**
- **Priority Queues:**
  - `high-priority`: Deadline alerts, evidence reminders (immediate processing)
  - `normal`: Document processing, monitoring schedules
  - `low-priority`: Cross-sell triggers, analytics jobs
- **Queue Names:**
  - `document-processing`
  - `monitoring-schedule`
  - `deadline-alerts`
  - `evidence-reminders`
  - `module-2-sampling`
  - `module-3-run-hours`
  - `aer-generation`
  - `audit-pack-generation`
  - `cross-sell-triggers`

**Worker Architecture:**
- **Worker Processes:** Separate worker processes for each queue type
- **Concurrency:** Configurable concurrency per worker (default: 5 jobs concurrently)
- **Scaling:** Horizontal scaling by adding more worker instances
- **Deployment Strategy:**
  - **Option 1 (Recommended):** Separate worker service (not Vercel)
    - Deploy workers on Railway, Render, or Fly.io
    - Workers run continuously, not serverless
    - No timeout limits (can handle 5-minute document processing)
    - Recommended for production
  - **Option 2 (Alternative):** Vercel Edge Functions with streaming
    - Use streaming responses for long jobs
    - Or split jobs into smaller chunks (<60s each)
    - Suitable for short jobs only
  - **Option 3 (Fallback):** Database-backed queue
    - If Redis unavailable, use database table as queue
    - Polling workers check database every 5 seconds
    - Degraded performance but functional

---

## 2.2 Job Types (High-Level)

**Document Processing Jobs:**
- **Trigger:** PDF upload via API
- **Pipeline:** PDF → OCR (if needed) → Text extraction → LLM parsing → Database storage
- **Queue:** `document-processing`
- **Priority:** Normal
- **Timeout:** 30 seconds (standard documents ≤49 pages), 5 minutes (large documents ≥50 pages) per PLS Section A.9.1

**Monitoring Schedule Jobs:**
- **Trigger:** Recurring (cron: every hour)
- **Function:** Check obligations, calculate deadlines, update statuses
- **Dynamic Schedule Evaluation:** Evaluate event-based triggers (e.g., "6 months from commissioning")
- **Recurring Task Generation:** Automatically create tasks from schedules
- **Queue:** `monitoring-schedule`, `recurring-tasks`
- **Priority:** Normal

**Alert Jobs:**
- **Deadline Alerts:** 7/3/1 day warnings for upcoming deadlines
- **Evidence Reminders:** Notifications for obligations requiring evidence
- **Overdue Escalation:** Automatic escalation workflows for overdue obligations
- **Evidence Expiry Alerts:** Notifications for expiring evidence
- **Chain-Break Alerts:** Module 4 chain of custody gap detection
- **Queue:** `deadline-alerts`, `evidence-reminders`, `overdue-escalation`, `evidence-expiry`, `chain-break-alerts`
- **Priority:** High

**Module-Specific Jobs:**
- **Module 1 - Permit Change Tracking:** Redline comparison, version impact analysis
- **Module 1 - Evidence Completeness Scoring:** Automated completeness calculation per condition
- **Module 1 - Dynamic Schedule Generation:** Event-based trigger evaluation
- **Module 2 - Sampling Schedule:** Daily/weekly/monthly triggers for lab sampling
- **Module 2 - Sampling Logistics:** Sample collection tracking, courier coordination, lab submission
- **Module 2 - Reconciliation Rules:** Concentration × volume calculations, breach likelihood scoring
- **Module 2 - Consent State Transitions:** State machine transitions (Draft → In force → Superseded → Expired)
- **Module 3 - Run-Hour Monitoring:** 80%/90%/100% threshold checks
- **Module 3 - Runtime Data Capture:** Integration with generator monitoring systems
- **Module 3 - Exemption Logic:** Testing vs emergency operation classification
- **Module 3 - Compliance Clock:** Countdown to testing deadlines, certification expiry tracking
- **Module 3 - AER Generation:** Annual return compilation
- **Module 4 - Chain-Break Detection:** Gap identification in chain of custody
- **Module 4 - Validation Rules Engine:** Carrier licence validation, volume limit checking
- **Module 4 - End-Point Proof Tracking:** Destruction/recycling certificate tracking
- **Queue:** `module-1-permit-tracking`, `module-1-evidence-scoring`, `module-2-sampling`, `module-2-logistics`, `module-2-reconciliation`, `module-3-run-hours`, `module-3-runtime`, `module-3-exemptions`, `module-3-compliance-clock`, `aer-generation`, `module-4-chain-break`, `module-4-validation`
- **Priority:** Normal (High for breach detection)

**Cross-Sell Trigger Detection:**
- **Trigger:** Recurring (cron: every 6 hours)
- **Function:** Detect effluent keywords, run-hour breaches
- **Queue:** `cross-sell-triggers`
- **Priority:** Low

**Audit Pack Generation:**
- **Trigger:** User request via API
- **Function:** Compile evidence into inspector-ready PDF
- **Queue:** `audit-pack-generation`
- **Priority:** Normal

**Note:** Detailed job specifications, including exact trigger conditions, input parameters, execution steps, and error handling, will be provided in Document 2.3 (Background Jobs Specification).

---

## 2.3 Job Infrastructure

**Job Retry Strategy:**
- **Max Retries:** 2 retry attempts per job (3 total attempts: 1 initial + 2 retries) (per PLS Section A.9.1)
  - Note: `maxRetries: 2` means 2 retry attempts AFTER initial attempt = 3 total attempts
  - Canonical Dictionary `background_jobs.max_retries` default is 2 (2 retry attempts = 3 total attempts) per PLS Section A.9.1
- **Retry Delay:** Exponential backoff (per PLS Section B.7.4)
  - Formula: `retry_backoff_seconds = 2^retry_count`
  - First retry (retry_count=1): 2 seconds (2^1)
  - Second retry (retry_count=2): 4 seconds (2^2)
- **Retry Triggers:**
  - Transient errors (network timeouts, temporary API failures)
  - LLM timeout errors (retry with same document)
  - Database connection errors
- **Non-Retryable Errors:**
  - Validation errors (invalid input data)
  - Authentication errors (invalid API keys)
  - Permanent failures (malformed documents)

**Dead-Letter Queue (DLQ) Implementation:**
- **DLQ Condition:** `retry_count >= max_retries` AND `status = 'FAILED'` (per PLS Section B.7.4)
- **DLQ Action:**
  - Create `dead_letter_queue` record in database
  - Set `background_jobs.dead_letter_queue_id` to DLQ record UUID
  - Set `background_jobs.status = 'FAILED'` (terminal state)
  - Log error details in DLQ record
- **DLQ Processing:**
  - Manual review and retry via admin interface
  - Automatic retry after manual fix (if applicable)
  - DLQ records retained for 30 days

**Job Health Monitoring:**
- **Heartbeat:** Jobs send heartbeat within `heartbeat_interval_seconds` (default: 60 seconds per Canonical Dictionary) to `background_jobs.last_heartbeat`
- **Stale Job Detection:** Jobs with `last_heartbeat` > 5 minutes ago marked as `STALE`
- **Health Status:** `background_jobs.health_status` enum: `HEALTHY`, `STALE`, `FAILED`
- **Monitoring Query:**
  ```sql
  SELECT * FROM background_jobs 
  WHERE health_status != 'HEALTHY' 
  AND last_heartbeat < NOW() - INTERVAL '5 minutes';
  ```
- **Auto-Recovery:** Stale jobs automatically retried if recoverable

**Job Status Tracking:**
- **Status Enum:** See Canonical Dictionary `job_status` enum
  - `PENDING`: Job queued, waiting to start
  - `RUNNING`: Job currently executing
  - `COMPLETED`: Job finished successfully
  - `FAILED`: Job failed (terminal state)
  - `CANCELLED`: Job cancelled by user
- **Status Transitions:** Enforced at application level (no direct database updates)

**Concurrent Job Limits:**
- **Per Queue:** Max 10 concurrent jobs per queue
- **Per Worker:** Max 5 concurrent jobs per worker process
- **Global:** Max 50 concurrent jobs across all queues
- **Throttling:** Jobs queued if limit reached, processed when capacity available

**Job Priority System:**
- **Priority Levels:** `HIGH`, `NORMAL`, `LOW`
- **Processing Order:** High priority jobs processed first within each queue
- **Priority Assignment:**
  - Deadline alerts: HIGH
  - Evidence reminders: HIGH
  - Document processing: NORMAL
  - Cross-sell triggers: LOW

---

## 2.4 Integration Points

**Database Interaction:**
- Jobs read/write to Supabase via connection pooler URL
- All database operations respect RLS policies
- Jobs use service role key for elevated permissions (bypass RLS when needed)
- Transaction management: Jobs wrap operations in transactions for atomicity

**Notification Triggering:**
- Jobs create `notifications` records in database
- Notification service (Document 2.4) processes notifications and sends emails/SMS
- Real-time subscriptions notify connected clients of new notifications

**AI Service Calls:**
- Jobs call AI service (Document 2.10) for document extraction
- AI service handles OpenAI API calls, retries, and error handling
- Jobs pass document content and extraction parameters to AI service
- AI service returns extraction results, which jobs store in database

**Error Handling and Logging:**
- **Structured Logging:** All job operations logged with structured JSON
- **Error Logging:** Errors logged to `audit_logs` table with full context
- **Alerting:** Critical job failures trigger alerts to admin users
- **Monitoring:** Job metrics (success rate, average duration) tracked for monitoring

---

# 3. API Layer

## 3.1 API Architecture

**API Style: REST (not GraphQL)**

**Justification:**
- **Simplicity:** REST is simpler to implement and maintain
- **Caching:** REST endpoints are easier to cache (HTTP caching)
- **Tooling:** Better tooling support (Postman, curl, browser dev tools)
- **Documentation:** OpenAPI/Swagger documentation is standard for REST
- **Team Familiarity:** REST is more widely understood by the team

**API Versioning:**
- **Strategy:** URL-based versioning (`/api/v1/...`)
- **Current Version:** `v1`
- **Future Versions:** `v2`, `v3` (maintain backward compatibility)
- **Deprecation:** Deprecated versions supported for 6 months before removal

**Base URL Structure:**
```
Production:  https://api.epcompliance.com/api/v1
Staging:     https://api-staging.epcompliance.com/api/v1
Development: http://localhost:3000/api/v1
```

**Endpoint Structure:**
```
/api/v1/
  ├── auth/              # Authentication endpoints
  ├── companies/         # Company management
  ├── sites/             # Site management
  ├── documents/         # Document upload and management
  ├── obligations/       # Obligation management
  ├── evidence/          # Evidence management
  ├── schedules/         # Monitoring schedules
  ├── audit-packs/       # Audit pack generation
  ├── modules/           # Module activation
  ├── module-1/          # Module 1 specific endpoints
  │   ├── permit-versions/    # Permit version tracking
  │   ├── permit-workflows/   # Permit lifecycle workflows (variations, renewals, surrenders)
  │   ├── condition-evidence-rules/  # Condition-level evidence mapping rules
  │   ├── condition-permissions/    # Condition-level permissions
  │   ├── evidence-completeness-scores/ # Evidence completeness scoring
  │   ├── enforcement-notices/ # Enforcement notice tracking
  │   └── compliance-decisions/ # Decision justification
  ├── module-2/          # Module 2 specific endpoints
  │   ├── consent-states/      # Consent state machine
  │   ├── monthly-statements/   # Monthly statement management
  │   ├── reconciliation/      # Automated reconciliation
  │   ├── corrective-actions/   # Breach response workflows
  │   └── sampling-logistics/  # Sampling workflow
  ├── module-3/          # Module 3 specific endpoints
  │   ├── runtime-monitoring/  # Runtime data capture
  │   ├── exemptions/          # Exemption logic
  │   ├── regulation-thresholds/ # MW threshold logic
  │   ├── fuel-usage-logs/     # Fuel consumption tracking
  │   └── sulphur-content-reports/ # Sulphur content compliance
  ├── module-4/          # Module 4 specific endpoints
  │   ├── waste-streams/        # Waste classification
  │   ├── consignment-notes/    # Consignment note management
  │   │   └── [noteId]/chain-of-custody/ # Chain of custody tracking (nested)
  │   ├── end-point-proofs/     # Destruction/recycling certificates
  │   └── chain-break-alerts/   # Chain break gap detection
  ├── compliance-clocks/ # Compliance clock tracking (cross-module)
  ├── notifications/     # Notification management
  ├── jobs/              # Background job status
  ├── recurring-tasks/   # Recurring task management
  ├── escalations/       # Escalation workflow management
  ├── pack-sharing/      # Pack sharing and distribution
  └── health/            # Health check endpoints
```

---

## 3.2 Authentication & Authorization

**Authentication: Supabase Auth**

**Integration:**
- Supabase Auth provides JWT-based authentication
- JWT tokens included in `Authorization: Bearer <token>` header
- Tokens validated on every API request
- Token expiration: 1 hour (refresh tokens: 7 days)

**JWT Token Handling:**
- **Token Structure:**
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "role": "authenticated",
    "app_metadata": {
      "company_id": "company-uuid",
      "site_ids": ["site-uuid-1", "site-uuid-2"]
    }
  }
  ```
- **Token Validation:** Validate token signature and expiration
- **Token Refresh:** Automatic token refresh via refresh token

**Session Management:**
- Sessions managed by Supabase Auth
- **Web (Browser):** HTTP-only cookies (secure, prevents XSS attacks)
- **Mobile (React Native/Expo):** Secure storage (Keychain/Keystore) - NOT localStorage
- Session timeout: 24 hours of inactivity
- **Security Note:** localStorage is NOT used for auth tokens on web - only HTTP-only cookies for security compliance

**Role-Based Access Control (RBAC):**
- **Roles:** Owner, Admin, Staff, Consultant, Viewer (see PLS Section B.10)
- **Permission Matrix:** Reference PLS Section B.10.2.1 (Entity × Role CRUD Permissions Matrix)
- **API-Level Enforcement:**
  - Check user role before processing requests
  - Return 403 Forbidden if user lacks required permissions
  - RLS policies provide additional database-level enforcement

**API Key Management (for Webhooks):**
- **Service API Keys:** For server-to-server communication
- **Webhook API Keys:** For outgoing webhooks (if implemented)
- **Key Storage:** Environment variables (never in code)
- **Key Rotation:** Keys rotated every 90 days

---

## 3.3 API Conventions

**HTTP Method Usage:**
- **GET:** Retrieve resources (list, detail)
- **POST:** Create resources
- **PUT:** Full update (replace entire resource)
- **PUT:** Full update (replace entire resource) - Standard for all update operations
- **DELETE:** Delete resources (soft delete via `deleted_at`)

**Request/Response Formats:**
- **Content-Type:** `application/json`
- **Request Body:** JSON
- **Response Body:** JSON
- **Error Responses:** Consistent error structure (see below)

**Error Response Structure:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

**HTTP Status Codes:**
- `200 OK`: Successful GET, PUT
- `201 Created`: Successful POST
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

**Pagination Strategy: Cursor-Based**

**Why Cursor-Based:**
- More efficient for large datasets
- Consistent results even with concurrent inserts
- Better performance than offset-based

**Pagination Parameters:**
```
GET /api/v1/obligations?cursor={cursor}&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "cursor": "next-cursor-value",
    "limit": 50,
    "has_more": true
  }
}
```

**Filtering and Sorting:**
```
GET /api/v1/obligations?status=IN_PROGRESS&sort=deadline_date:asc&limit=50
```

**Filter Operators:**
- `eq`: Equals
- `ne`: Not equals
- `gt`: Greater than
- `gte`: Greater than or equal
- `lt`: Less than
- `lte`: Less than or equal
- `in`: In array
- `like`: Pattern match
- `ilike`: Case-insensitive pattern match

**Sorting:**
- Format: `field:direction` (e.g., `deadline_date:asc`, `created_at:desc`)
- Multiple sorts: `sort=deadline_date:asc,created_at:desc`

**Field Selection (Sparse Fieldsets):**
```
GET /api/v1/obligations?fields=id,title,status,deadline_date
```
- Reduces response size
- Improves performance for large objects

---

## 3.4 Rate Limiting

**Rate Limit Strategy:**
- **Per User:** 100 requests per minute
- **Per Company:** 500 requests per minute
- **Per Endpoint:** Varies by endpoint (document upload: 10/min, others: 100/min)
- **Burst Allowance:** 20 requests in first second, then rate limit applies

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Throttling Behavior:**
- **429 Too Many Requests:** Returned when rate limit exceeded
- **Retry-After Header:** Seconds until rate limit resets
- **Exponential Backoff:** Clients should implement exponential backoff

**Rate Limit Implementation:**
- **Storage:** Redis (Upstash Redis)
- **Algorithm:** Token bucket algorithm
- **Key:** `rate_limit:{user_id}` or `rate_limit:{company_id}`

---

## 3.5 API Endpoints (High-Level)

**Document Upload Endpoints:**
- `POST /api/v1/documents` - Upload document (permit, consent, registration)
- `GET /api/v1/documents/{id}` - Get document details
- `GET /api/v1/documents` - List documents (filtered by site/company)
- `POST /api/v1/documents/{id}/versions` - Create new permit version
- `GET /api/v1/documents/{id}/versions` - List permit versions
- `GET /api/v1/documents/{id}/versions/{version_id}/redline` - Get redline comparison

**Extraction Endpoints:**
- `POST /api/v1/documents/{id}/extract` - Trigger AI extraction
- `GET /api/v1/documents/{id}/extraction-status` - Get extraction status
- `GET /api/v1/documents/{id}/extraction-results` - Get extraction results

**Obligation Management Endpoints:**
- `GET /api/v1/obligations` - List obligations (with filters)
- `GET /api/v1/obligations/{id}` - Get obligation details
- `PUT /api/v1/obligations/{id}` - Update obligation
- `POST /api/v1/obligations/{id}/evidence` - Link evidence to obligation
- `GET /api/v1/obligations/{id}/completeness` - Get completeness score
- `GET /api/v1/obligations/{id}/versions` - Get obligation version history
- `POST /api/v1/obligations/{id}/decisions` - Log compliance decision

**Evidence Management Endpoints:**
- `POST /api/v1/evidence` - Upload evidence file
- `GET /api/v1/evidence/{id}` - Get evidence details
- Evidence cannot be deleted (immutability for compliance) - only archived by system after retention period

**Module Activation Endpoints:**
- `POST /api/v1/modules/{module_id}/activate` - Activate module
- `GET /api/v1/modules` - List available modules
- `GET /api/v1/modules/active` - List active modules for company

**Cross-Cutting Endpoints:**
- `GET /api/v1/recurring-tasks` - List recurring tasks
- `POST /api/v1/recurring-tasks` - Create recurring task
- `GET /api/v1/escalations` - List escalations
- `POST /api/v1/escalations/{id}/resolve` - Resolve escalation
- `GET /api/v1/evidence/expiring` - List expiring evidence
- `POST /api/v1/pack-sharing` - Share pack with external user
- `GET /api/v1/pack-sharing/{id}` - Get sharing link details

**Note:** Detailed API specification, including all endpoints, request/response schemas, authentication requirements, and error codes, will be provided in Document 2.5 (Backend API Specification).

---

# 4. Frontend Framework: Next.js 14

## 4.1 Framework & Structure

**Framework: Next.js 14 (App Router)**

**Justification:**
- **Server Components:** Improved performance with server-side rendering
- **Server Actions:** Simplified form handling and mutations
- **File-Based Routing:** Intuitive routing structure
- **Built-in Optimizations:** Image optimization, font optimization, code splitting
- **Vercel Integration:** Seamless deployment on Vercel

**Project Organization:**
```
app/
  ├── (auth)/
  │   ├── login/
  │   └── signup/
  ├── (dashboard)/
  │   ├── dashboard/
  │   ├── sites/
  │   ├── documents/
  │   ├── obligations/
  │   └── evidence/
  ├── api/              # API routes (Next.js API routes)
  ├── layout.tsx
  └── page.tsx

components/
  ├── ui/               # shadcn/ui components
  ├── forms/            # Form components
  ├── tables/           # Data table components
  └── shared/           # Shared components

lib/
  ├── supabase/         # Supabase client
  ├── api/              # API client functions
  ├── utils/            # Utility functions
  └── types/            # TypeScript types

types/
  └── index.ts          # Shared TypeScript types
```

**Server Components vs. Client Components:**
- **Server Components (Default):**
  - Data fetching (no client-side JavaScript)
  - Static content
  - SEO-critical content
- **Client Components (`'use client'`):**
  - Interactive components (buttons, forms)
  - Real-time subscriptions
  - Browser APIs (localStorage, window)
  - State management (React hooks)

**Route Structure:**
- **File-Based Routing:** Routes defined by folder structure
- **Route Groups:** `(auth)`, `(dashboard)` for layout organization
- **Dynamic Routes:** `[id]` for dynamic segments
- **Nested Routes:** Folders create nested routes

---

## 4.2 State Management

**Client-Side State Management: Zustand**

**Justification:**
- **Lightweight:** Minimal boilerplate
- **TypeScript Support:** Excellent TypeScript integration
- **Performance:** No unnecessary re-renders
- **Simplicity:** Easier than Redux for this use case

**Use Cases:**
- User authentication state
- Selected site/company context
- UI state (modals, sidebars)
- Form state (complex forms)

**Server State Management: TanStack Query (React Query)**

**Justification:**
- **Caching:** Automatic request caching and deduplication
- **Background Updates:** Automatic background refetching
- **Optimistic Updates:** Support for optimistic UI updates
- **Error Handling:** Built-in error handling and retry logic

**Use Cases:**
- API data fetching (obligations, documents, evidence)
- Real-time data synchronization
- Pagination and infinite scrolling

**Form State Management: React Hook Form**

**Justification:**
- **Performance:** Minimal re-renders
- **Validation:** Integration with Zod for schema validation
- **TypeScript:** Excellent TypeScript support
- **Developer Experience:** Simple API

**Use Cases:**
- Document upload forms
- Obligation editing forms
- Evidence upload forms
- Module activation forms

---

## 4.3 UI Components

**Component Library: shadcn/ui**

**Justification:**
- **Customizable:** Copy components into project (not a dependency)
- **Tailwind CSS:** Built on Tailwind CSS
- **Accessibility:** Built-in accessibility features
- **TypeScript:** Full TypeScript support
- **Design System:** Consistent design system

**Styling Approach: Tailwind CSS**

**Justification:**
- **Utility-First:** Rapid UI development
- **Performance:** Purges unused CSS
- **Consistency:** Design system via Tailwind config
- **Responsive:** Built-in responsive utilities

**Design System Integration:**
- **Colors:** Defined in `tailwind.config.js` (primary, secondary, success, error)
- **Typography:** Font families and sizes in Tailwind config
- **Spacing:** Consistent spacing scale
- **Components:** shadcn/ui components provide base components
- **Note:** Detailed UI/UX design system will be defined in Document 2.9 (UI/UX Design System)

---

## 4.4 Data Fetching

**Server-Side Data Fetching:**
- **Server Components:** Fetch data directly in Server Components
- **Server Actions:** Mutations via Server Actions (Next.js 14 feature)
- **Benefits:**
  - No client-side JavaScript for data fetching
  - Improved SEO
  - Faster initial page load

**Client-Side Data Fetching:**
- **API Routes:** Next.js API routes (`/api/*`)
- **React Query:** TanStack Query for client-side data fetching
- **Use Cases:**
  - Real-time updates
  - User interactions (filters, sorting)
  - Optimistic updates

**Real-time Updates:**
- **Supabase Realtime:** Supabase Realtime subscriptions (see Database Layer section 1.6)
- **React Hooks:** Custom hooks for real-time subscriptions
- **Example:**
  ```typescript
  const { data, error } = useRealtimeSubscription('obligations', {
    filter: `site_id=eq.${siteId}`
  });
  ```

---

## 4.5 Authentication Integration

**Supabase Auth Client Integration:**
- **Client Library:** `@supabase/supabase-js`
- **Auth Methods:**
  - Email/password
  - Magic link (passwordless)
  - OAuth (Google, GitHub - if needed)
- **Session Management:** Automatic session management via Supabase client

**Protected Route Handling:**
- **Middleware:** Next.js middleware checks authentication
- **Redirect:** Unauthenticated users redirected to `/login`
- **Route Protection:** Route groups `(dashboard)` require authentication

**Role-Based UI Rendering:**
- **Client-Side:** Check user role from JWT token
- **Conditional Rendering:** Show/hide UI elements based on role
- **Server-Side:** Server Components can check role for initial render
- **Reference:** PLS Section B.10 for role definitions and permissions

---

# 5. AI Service Integration

## 5.1 OpenAI API Integration

**API Client Setup:**
- **Library:** `openai` (official OpenAI Node.js SDK)
- **Version:** Latest stable version
- **Configuration:**
  ```typescript
  import OpenAI from 'openai';
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 seconds (standard documents ≤49 pages)
    maxRetries: 2  // 2 retry attempts = 3 total attempts (1 initial + 2 retries)
  });
  ```

**API Key Management:**
- **Storage:** Environment variables (`OPENAI_API_KEY`)
- **Secrets Management:** Vercel environment variables (encrypted)
- **Rotation:** Keys rotated every 90 days
- **Access:** Only server-side code has access (never exposed to client)

**Base URL and Endpoint Configuration:**
- **Base URL:** `https://api.openai.com/v1` (default)
- **Endpoints Used:**
  - `/chat/completions` - For document extraction
  - `/models` - For model information (if needed)

**Model Selection:**
- **Primary Model:** `gpt-4o` (see AI Layer Design 1.5a)
  - Use for: Document extraction, obligation parsing, parameter extraction
  - Context: 1M tokens
  - Cost: $2/$8 per 1M tokens
- **Secondary Model:** `gpt-4o-mini` (see AI Layer Design 1.5a)
  - Use for: Simple tasks, confidence scoring
  - Context: 1M tokens
  - Cost: $0.40/$1.60 per 1M tokens
- **Model Selection Logic:** Determined by task type (see AI Layer Design 1.5a)

**Note:** Detailed AI integration, including prompt templates, extraction workflows, and error handling, will be provided in Document 2.10 (AI Integration Layer).

---

## 5.2 AI Service Architecture

**Service Layer Structure:**
```
lib/
  └── ai/
      ├── client.ts           # OpenAI client setup
      ├── extraction.ts       # Document extraction service
      ├── prompts.ts          # Prompt template loading (from Document 1.7)
      ├── rules.ts            # Rules library integration (from Document 1.6)
      ├── cost-tracking.ts    # Cost tracking and logging
      └── types.ts            # AI service types
```

**Request/Response Handling:**
- **Request:** Document content, extraction parameters, module type
- **Response:** Structured JSON (per prompt schemas in Document 1.7)
- **Validation:** Validate response against JSON schemas
- **Error Handling:** Retry on transient errors, flag for manual review on permanent errors

**Error Handling and Retries:**
- **Timeout Policy:** Per PLS Section A.9.1
  - Standard documents (≤49 pages): 30 seconds
  - Large documents (≥50 pages): 5 minutes
  - Threshold: 50 pages is inclusive (50 pages = large document)
- **Retry Policy:** Per PLS Section A.9.1
  - Max retries: 2 retry attempts (3 total attempts: 1 initial + 2 retries)
  - Retry delay: Exponential backoff (2s first retry, 4s second retry)
  - Retry triggers: LLM timeout, network timeout
- **After Max Retries:** Flag for manual review

**Cost Tracking Integration:**
- **Logging:** All API calls logged to `extraction_logs` table
- **Fields Logged:**
  - `input_tokens`: Input token count
  - `output_tokens`: Output token count
  - `estimated_cost`: Calculated cost
  - `model_used`: Model identifier
  - `document_id`: Associated document
- **Cost Calculation:** Per AI Layer Design 1.5a pricing

---

## 5.3 Integration Points

**AI Service Called from Background Jobs:**
- Document processing jobs call AI service for extraction
- Jobs pass document content and extraction parameters
- AI service returns extraction results
- Jobs store results in database

**AI Service Interacts with Database:**
- **Read:** Load prompt templates from database (if stored)
- **Write:** Store extraction results in `documents`, `obligations` tables
- **Logging:** Write to `extraction_logs` table
- **Rules Library:** Query rules library for pattern matching (rules stored in codebase per Document 1.6 - AI Extraction Rules Library, or in database table if implemented)

**AI Service Uses Prompt Templates:**
- **Source:** Document 1.7 (AI Microservice Prompts) - 29 production-ready prompts
- **Loading:** Prompt templates loaded from codebase (not database)
- **Placeholders:** Templates use placeholders (e.g., `{document_text}`, `{module_type}`)
- **Substitution:** Placeholders replaced with actual values before API call

**AI Service Uses Rules Library:**
- **Source:** Document 1.6 (AI Extraction Rules Library)
- **Pattern Matching:** Rules library checked before AI extraction
- **Confidence Boost:** Rules library matches boost confidence scores
- **Skip AI:** If rule library match ≥90%, skip AI extraction (cost optimization)

---

# 6. External Integrations

## 6.1 Webhooks (If Any)

**Current Status:** No outgoing webhooks planned for initial release

**Future Considerations:**
- **Regulator Integrations:** If regulators provide webhook endpoints for permit updates
- **Third-Party Integrations:** If customers request webhook notifications
- **Implementation (if needed):**
  - Webhook URL configuration per company
  - Webhook payload structure (JSON)
  - Webhook security (HMAC signatures)
  - Webhook retry logic (exponential backoff, max 3 retries)
  - Webhook delivery status tracking

---

## 6.2 Third-Party Services

**OCR Service:**
- **Current:** OpenAI GPT-4o Vision API (if needed for image-based PDFs)
- **Alternative:** Tesseract OCR (if OpenAI doesn't support image PDFs)
- **Integration:** Called during document processing pipeline

**Email Service:**
- **Provider:** Resend (recommended) or SendGrid
- **Use Cases:**
  - Deadline alerts (7/3/1 day warnings)
  - Evidence reminders
  - Permit renewal reminders
  - Module activation confirmations
- **Integration:** Called from notification service (Document 2.4)
- **Templates:** Email templates stored in database or codebase

**SMS Service (Optional):**
- **Provider:** Twilio or similar
- **Use Cases:**
  - Critical deadline alerts (1 day remaining)
  - Limit breaches (100% threshold)
- **Integration:** Called from notification service (Document 2.4)
- **Rate Limiting:** SMS rate limits enforced (max 10 SMS per user per day)

**File Processing Services:**
- **Current:** None (Supabase Storage handles file storage)
- **Future:** If PDF generation/complex file processing needed, consider:
  - Puppeteer for PDF generation
  - Sharp for image processing

---

# 7. Environment Configuration

## 7.1 Environment Variables

**Required Environment Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_API_KEY_FALLBACK_1=sk-xxx (optional)
OPENAI_API_KEY_FALLBACK_2=sk-xxx (optional)

# Redis (for BullMQ)
REDIS_URL=redis://xxx

# Email Service (Resend)
RESEND_API_KEY=re_xxx

# Application
NEXT_PUBLIC_APP_URL=https://app.epcompliance.com
NODE_ENV=production
```

**Environment-Specific Configurations:**
- **Development:** `.env.local` (gitignored)
- **Staging:** Vercel environment variables
- **Production:** Vercel environment variables (encrypted)

**Secrets Management Strategy:**
- **Vercel:** Use Vercel environment variables (encrypted at rest)
- **Local Development:** `.env.local` file (never committed)
- **Rotation:** Rotate secrets every 90 days
- **Access Control:** Only authorized team members have access

---

## 7.2 Configuration Management

**Config Files Structure:**
```
config/
  ├── database.ts        # Database configuration
  ├── ai.ts              # AI service configuration
  ├── jobs.ts            # Background jobs configuration
  └── constants.ts       # Application constants
```

**Feature Flags:**
- **Storage:** Environment variables or database `system_settings` table
- **Examples:**
  - `ENABLE_MODULE_2`: Enable Module 2 features
  - `ENABLE_MODULE_3`: Enable Module 3 features
  - `ENABLE_SMS_NOTIFICATIONS`: Enable SMS notifications
- **Usage:** Feature flags checked in code before enabling features

**Environment Detection:**
- **Method:** `process.env.NODE_ENV`
- **Values:** `development`, `staging`, `production`
- **Usage:** Different configurations per environment (API URLs, logging levels)

---

## 7.3 Development Setup

**Local Development Environment Requirements:**
- **Node.js:** 18.x or higher
- **Package Manager:** npm or yarn
- **Database:** Supabase local development (Docker) or remote Supabase project
- **Redis:** Local Redis instance or Upstash Redis (free tier)

**Docker Setup (Optional):**
```dockerfile
# Dockerfile for local development
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

**Database Migration Strategy:**
- **Tool:** Supabase CLI or direct SQL migrations
- **Migration Files:** `supabase/migrations/` directory
- **Naming:** `YYYYMMDDHHMMSS_description.sql`
- **Execution:** Migrations run automatically on deployment (Vercel)
- **Rollback:** Manual rollback via Supabase dashboard or CLI

**Seed Data Strategy:**
- **Seed Scripts:** `scripts/seed.ts` or SQL files
- **Seed Data:**
  - Test companies, sites, users
  - Sample documents, obligations
  - Module configurations
- **Usage:** Run seed scripts for local development and testing

---

# 8. Security Architecture

## 8.1 Security Layers

**Database Security:**
- **RLS (Row Level Security):** Enforced on all tenant-scoped tables
- **Encryption:** Encryption at rest (Supabase default AES-256)
- **Connection Security:** TLS/SSL for all database connections
- **Service Role Key:** Only used server-side, never exposed to client

**API Security:**
- **Authentication:** JWT tokens validated on every request
- **Authorization:** Role-based access control (RBAC) enforced
- **Rate Limiting:** Rate limits prevent abuse (see Section 3.4)
- **Input Validation:** All inputs validated and sanitized
- **SQL Injection Prevention:** Parameterized queries (Supabase client handles this)

**Frontend Security:**
- **XSS Prevention:**
  - React automatically escapes content
  - Sanitize user input before rendering
  - Content Security Policy (CSP) headers
- **CSRF Protection:**
  - SameSite cookies
  - CSRF tokens for state-changing operations
- **Secure Headers:**
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000`

**File Upload Security:**
- **File Type Validation:** Only allow PDF, images, documents
- **File Size Limits:** Enforced (see Section 1.5)
- **Virus Scanning:** Consider ClamAV or similar (future enhancement)
- **Content Validation:** Validate file content matches declared type

---

## 8.2 Data Protection

**Encryption at Rest:**
- **Database:** Supabase default encryption (AES-256)
- **Storage:** Supabase Storage encryption (AES-256)
- **Backups:** Encrypted backups

**Encryption in Transit:**
- **HTTPS/TLS:** All API requests over HTTPS
- **Database:** TLS connections to Supabase
- **Storage:** HTTPS for file uploads/downloads

**PII Handling:**
- **Minimal PII:** System stores minimal PII (email, name)
- **Data Retention:** PII retained per GDPR requirements
- **Right to Deletion:** Users can request data deletion (GDPR compliance)

**GDPR Compliance Considerations:**
- **Data Residency:** Data stored in EU (London region)
- **Right to Access:** Users can export their data
- **Right to Deletion:** Users can request account deletion
- **Data Processing Agreement:** Supabase provides GDPR-compliant infrastructure
- **Privacy Policy:** Clear privacy policy required

---

# 9. Performance & Scalability

## 9.1 Performance Targets

**API Response Time Targets:**
- **Simple Queries:** < 100ms (obligation list, document list)
- **Complex Queries:** < 500ms (filtered searches, aggregations)
- **Document Upload:** < 2 seconds (file upload to storage)
- **Extraction Trigger:** < 1 second (job queued, not processed)

**Document Processing Time Targets:**
- **Target:** 60 seconds per PLS Section A.9.1
- **Standard Documents (<50 pages):** 30-60 seconds
- **Large Documents (≥50 pages):** Up to 5 minutes (per PLS Section A.9.1)

**Database Query Performance:**
- **Indexed Queries:** < 50ms
- **Full-Text Search:** < 200ms
- **Complex Joins:** < 500ms
- **Monitoring:** Query performance monitored via Supabase dashboard

**Frontend Load Time Targets:**
- **First Contentful Paint (FCP):** < 1.5 seconds
- **Largest Contentful Paint (LCP):** < 2.5 seconds
- **Time to Interactive (TTI):** < 3.5 seconds
- **Optimization:** Code splitting, image optimization, font optimization

---

## 9.2 Scalability Strategy

**Horizontal Scaling Approach:**
- **Frontend:** Vercel automatically scales Next.js applications
- **API Routes:** Vercel serverless functions scale automatically
- **Background Jobs:** Multiple worker instances can process jobs concurrently
- **Database:** Supabase scales database connections and storage

**Database Scaling:**
- **Connection Pooling:** PgBouncer connection pooler (see Section 1.1)
- **Read Replicas:** Consider read replicas for read-heavy workloads (future)
- **Partitioning:** Consider table partitioning for very large tables (future)
- **Archiving:** Archive old data to reduce table size (future)

**Caching Strategy:**
- **Redis Caching (if needed):**
  - Cache frequently accessed data (module configurations, user permissions)
  - Cache TTL: 5-15 minutes
  - Cache invalidation: On data updates
- **CDN Usage:**
  - Vercel CDN for static assets (images, fonts, CSS, JS)
  - CDN caching: Long cache times for static assets

---

## 9.3 Monitoring & Observability

**Logging Strategy:**
- **Structured Logging:** JSON logs for all operations
- **Log Levels:** `error`, `warn`, `info`, `debug`
- **Log Aggregation:** Vercel Logs or external service (Datadog, LogRocket)
- **Log Retention:** 30 days for production logs

**Error Tracking:**
- **Service:** Sentry (recommended) or similar
- **Error Reporting:** Automatic error reporting from frontend and backend
- **Alerting:** Critical errors trigger alerts to team
- **Error Context:** Full stack traces, user context, request data

**Performance Monitoring:**
- **APM Tools:** Vercel Analytics or external service (New Relic, Datadog)
- **Metrics Tracked:**
  - API response times
  - Database query performance
  - Background job duration
  - Frontend page load times
- **Dashboards:** Real-time dashboards for monitoring

**Health Check Endpoints:**
```
GET /api/v1/health
```
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "openai": "healthy"
  }
}
```
- **Usage:** Load balancer health checks, monitoring tools
- **Frequency:** Checked every 30 seconds

---

# 10. Deployment Architecture

## 10.1 Hosting Platform

**Frontend Hosting: Vercel**

**Justification:**
- **Next.js Optimization:** Built for Next.js (created by Vercel)
- **Automatic Scaling:** Scales automatically with traffic
- **Global CDN:** Global CDN for fast content delivery
- **Serverless Functions:** API routes run as serverless functions
- **Preview Deployments:** Automatic preview deployments for PRs
- **Analytics:** Built-in analytics and monitoring

**Database & Backend Hosting: Supabase**

**Justification:**
- **Managed PostgreSQL:** Fully managed database
- **Built-in Features:** Auth, storage, real-time included
- **Scalability:** Scales database and storage automatically
- **Backups:** Automatic backups and point-in-time recovery
- **Multi-Region:** Can deploy to multiple regions (future)

**Alternative Hosting Considerations:**
- **Frontend:** Netlify, AWS Amplify (if Vercel doesn't meet requirements)
- **Database:** AWS RDS, Google Cloud SQL (if Supabase doesn't meet requirements)
- **Current Choice:** Vercel + Supabase is optimal for this use case

---

## 10.2 Deployment Strategy

**CI/CD Pipeline Structure:**
```
GitHub → Vercel → Automatic Deployment
  ├── Push to main → Production deployment
  ├── Push to staging → Staging deployment
  └── Pull Request → Preview deployment
```

**Deployment Environments:**
- **Development:** Local development (localhost)
- **Staging:** `staging.epcompliance.com` (Vercel staging environment)
- **Production:** `app.epcompliance.com` (Vercel production environment)

**Database Migration Deployment:**
- **Automatic:** Migrations run automatically on Vercel deployment (via Supabase CLI)
- **Manual:** Critical migrations can be run manually via Supabase dashboard
- **Rollback:** Manual rollback via Supabase dashboard or CLI

**Rollback Strategy:**
- **Code Rollback:** Vercel allows instant rollback to previous deployment
- **Database Rollback:** Manual rollback via Supabase (point-in-time recovery)
- **Feature Flags:** Feature flags allow disabling features without code rollback

---

## 10.3 Infrastructure as Code

**Infrastructure Provisioning:**
- **Tool:** Terraform (recommended) or Pulumi
- **Resources Managed:**
  - Supabase project (if self-hosted)
  - Vercel project configuration
  - Environment variables
  - Domain configuration
- **Version Control:** Infrastructure code in Git repository

**Environment Management:**
- **Environments:** Development, staging, production
- **Configuration:** Environment-specific configurations in Terraform
- **Secrets:** Secrets managed via Vercel environment variables or secret management service

**Current Status:**
- **Initial Setup:** Manual setup via Vercel and Supabase dashboards
- **Future:** Migrate to Infrastructure as Code for better management

---

# Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│                    (Next.js 14 - Vercel)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Server     │  │   Client     │  │   API        │      │
│  │  Components  │  │  Components  │  │   Routes     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│              (Next.js API Routes - Vercel)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auth        │  │  Documents    │  │  Obligations │      │
│  │  Endpoints   │  │  Endpoints   │  │  Endpoints   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Supabase    │   │  BullMQ      │   │  OpenAI      │
│  (Database)  │   │  (Jobs)      │   │  (AI)        │
│              │   │              │   │              │
│  - PostgreSQL│   │  - Redis     │   │  - GPT-4o    │
│  - Storage   │   │  - Workers   │   │  - GPT-4o    │
│  - Auth      │   │              │   │  Mini        │
│  - Realtime  │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Document Processing Flow

```
User Uploads PDF
      │
      ▼
┌─────────────────┐
│  API Endpoint   │
│  /documents     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in       │
│  Supabase       │
│  Storage        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Queue Job      │
│  (BullMQ)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Worker         │
│  Processes Job  │
└────────┬────────┘
         │
         ├─→ OCR (if needed)
         │
         ├─→ Text Extraction
         │
         ├─→ Check Rules Library
         │   └─→ If match ≥90%, skip AI
         │
         ├─→ Call OpenAI API
         │   └─→ GPT-4o Extraction
         │
         └─→ Store Results in DB
             └─→ Update Document Status
```

---

> [v1 UPDATE – Pack Generation Service Architecture – 2024-12-27]

## 10.1 Pack Generation Service Architecture

**Service:** Pack Generation Service

**Purpose:** Handles generation of all pack types (Audit, Regulator, Tender, Board, Insurer)

**Architecture:**
```
Pack Generation Service
├── Pack Type Router
│   ├── Routes to pack-specific generator based on pack_type
│   └── Validates plan access
├── Pack Generators (per type)
│   ├── RegulatorPackGenerator
│   ├── TenderPackGenerator
│   ├── BoardPackGenerator
│   ├── InsurerPackGenerator
│   └── AuditPackGenerator
├── PDF Renderer
│   ├── Template Engine
│   └── PDF/A Generator
└── Storage Service
    └── Supabase Storage Integration
```

**Pack Type-Specific Logic:**
- Each pack generator implements `PackGenerator` interface
- Generators reuse existing data (obligations, evidence, schedules)
- Different content structures per pack type (see PLS Section I.8)

**Multi-Site Aggregation (Board Pack):**
- Aggregates data across all company sites
- Requires `company_id` scope (not `site_id`)
- Performance optimization: Parallel queries per site, then aggregation

**Reference:** Product Logic Specification Section I.8 (v1.0 Pack Types — Generation Logic)

---

## 10.2 Consultant Feature Infrastructure

**Service:** Consultant Control Centre Service

**Purpose:** Manages consultant client assignments and multi-client access

**Architecture:**
```
Consultant Service
├── Client Assignment Manager
│   ├── Assignment CRUD operations
│   └── Assignment validation
├── Multi-Client Data Aggregator
│   ├── Cross-client compliance metrics
│   ├── Cross-client deadline aggregation
│   └── Cross-client activity timeline
├── Consultant Dashboard Service
│   ├── Dashboard data aggregation
│   └── Client switching logic
└── RLS Policy Integration
    └── Consultant isolation enforcement
```

**Data Aggregation:**
- Aggregates data from `consultant_client_assignments` table
- Filters queries by assigned client companies
- Caches dashboard data for performance

**Reference:** Product Logic Specification Section C.5 (Consultant Control Centre Logic)

---

# Summary

This Technical Architecture & Stack document defines the complete technical infrastructure for the EcoComply platform. Key decisions:

- **Database:** Supabase (PostgreSQL) with RLS for multi-tenant isolation
- **Background Jobs:** BullMQ with Redis for reliable job processing
- **API:** REST API with Next.js API routes
- **Frontend:** Next.js 14 App Router with React Query and Zustand
- **AI Service:** OpenAI GPT-4o and GPT-4o-mini integration
- **Hosting:** Vercel (frontend) + Supabase (database/backend)

All technical decisions align with the Product Logic Specification (PLS) and Canonical Dictionary, ensuring consistency across the platform. The architecture supports modular expansion (Modules 1, 2, 3, and future modules) via the data-driven `modules` table.

**Cross-Cutting Technical Requirements:**

**Implementation Notes:**
- These features are not optional - they are foundational
- Must be built into module architecture from the start
- Cannot be retrofitted later without significant rework
- Consistency across modules is critical for user experience

**1. RLS Scoping (Granular Access Control):**
- Site-level permissions: All queries filtered by `site_id` via RLS
- Unit-level permissions: Module 1 supports condition-level permissions
- Condition-level permissions: Fine-grained access control for specific permit conditions
- Implementation: RLS policies check `user_site_assignments` and `obligations.condition_id`

**2. Automated Recurring Task Generation:**
- Dynamic task creation from schedules (not just fixed cron jobs)
- Event-based triggers evaluated on schedule evaluation
- Task assignment and tracking via `recurring_tasks` table
- Integration with monitoring scheduler

**3. Overdue Escalation + Audit Trail:**
- Automatic escalation workflows for overdue obligations
- Decision logging in `compliance_decisions` table
- Complete audit trail in `audit_logs` table
- Escalation history tracked in `escalations` table

**4. Evidence Ageing + Expiry Rules:**
- Evidence expiry tracking in `evidence_items.expiry_date`
- Ageing alerts sent before expiry (configurable threshold)
- Automatic expiry detection via background job
- Renewal reminders for expiring evidence

**5. Full Inspector/Auditor Sharing Flows:**
- Secure pack sharing via `pack_sharing` table
- Time-limited access tokens (expiry configurable)
- Access control for external users (read-only)
- Audit trail of sharing in `audit_logs`

**6. Audit Pack Integration from Day 1:**
- Module-specific pack templates per module
- Standalone pack generation capability (each module can generate its own pack)
- Cross-module pack integration (combines data from multiple modules)
- Pack generation framework reusable across all modules

**Next Steps:**
- Document 2.2: Database Schema (detailed table definitions including Module 4)
- Document 2.3: Background Jobs Specification (detailed job definitions for all modules)
- Document 2.5: Backend API Specification (detailed endpoint definitions including Module 4)

---

**Document Status:** Complete  
**Last Updated:** 2025-01-01  
**Version:** 1.0

