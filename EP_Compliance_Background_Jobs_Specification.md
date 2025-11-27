# Oblicore Background Jobs Specification

**Oblicore v1.0 — Launch-Ready / Last updated: 2024-12-27**

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Claude  
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Database Schema (2.2) - Complete
- ✅ Technical Architecture (2.1) - Complete

**Purpose:** Defines all background job types, their triggers, execution logic, error handling, retry mechanisms, and integration points for the Oblicore platform.

> [v1 UPDATE – Version Header – 2024-12-27]



---

# Table of Contents

1. [Document Overview & Framework](#1-document-overview--framework)
2. [Core Monitoring Jobs](#2-core-monitoring-jobs)
3. [Document Processing Jobs](#3-document-processing-jobs)
4. [Module 2 Jobs (Trade Effluent)](#4-module-2-jobs-trade-effluent)
5. [Module 3 Jobs (MCPD/Generators)](#5-module-3-jobs-mcpdgenerators)
6. [System Jobs](#6-system-jobs)
7. [Job Infrastructure Details](#7-job-infrastructure-details)
8. [Integration Points](#8-integration-points)
9. [Error Handling & Logging](#9-error-handling--logging)

---

# 1. Document Overview & Framework

## 1.1 Job Execution Framework

**Reference:** Technical Architecture Section 2.1

### Selected Framework: BullMQ with Redis

The Oblicore platform uses BullMQ with Redis for all background job processing. This framework was selected for:

- **Reliability:** Built-in retry mechanisms and dead-letter queue support (required by PLS Section B.7.4)
- **Scalability:** Horizontal scaling with multiple workers
- **Priority Queues:** Support for job prioritization (critical for deadline alerts)
- **Job Scheduling:** Built-in cron-like scheduling for recurring jobs
- **Health Monitoring:** Supports heartbeat and stale job detection (required by PLS Section B.7.4)

### Redis Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Provider | Upstash Redis | Serverless, Vercel-compatible |
| Persistence | Enabled | Job durability required |
| Connection | Environment variable | `REDIS_URL` |

### Queue Structure

Jobs are organized into dedicated queues based on function and priority:

```
┌─────────────────────────────────────────────────────────────┐
│                    BullMQ Queue Architecture                │
├─────────────────────────────────────────────────────────────┤
│  HIGH PRIORITY                                              │
│  ├── deadline-alerts                                        │
│  └── evidence-reminders                                     │
│                                                             │
│  NORMAL PRIORITY                                            │
│  ├── document-processing                                    │
│  ├── monitoring-schedule                                    │
│  ├── module-2-sampling                                      │
│  ├── module-3-run-hours                                     │
│  ├── aer-generation                                         │
│  └── audit-pack-generation                                  │
│                                                             │
│  LOW PRIORITY                                               │
│  └── cross-sell-triggers                                    │
└─────────────────────────────────────────────────────────────┘
```

### Worker Architecture

| Parameter | Value | Notes |
|-----------|-------|-------|
| Concurrency per worker | 5 | Default, configurable |
| Concurrent jobs per queue | 10 | Maximum |
| Global concurrent jobs | 50 | Across all queues |
| Worker deployment | Vercel serverless functions | Or dedicated worker processes |

---

## 1.2 Job Types Overview

The Oblicore platform defines **11 job types** across three categories:

### Complete Job Type Registry

| # | Job Type | Queue | Priority | Trigger | Description |
|---|----------|-------|----------|---------|-------------|
| 1 | Monitoring Schedule | `monitoring-schedule` | NORMAL | Cron (hourly) | Recurring obligation checks, deadline calculations |
| 2 | Deadline Alert | `deadline-alerts` | HIGH | Cron (6-hourly) | 7/3/1 day warnings for upcoming deadlines |
| 3 | Evidence Reminder | `evidence-reminders` | HIGH | Cron (daily) | Notifications for obligations requiring evidence |
| 4 | Document Processing | `document-processing` | NORMAL | API trigger | PDF upload → OCR → text extraction → LLM parsing |
| 5 | Excel Import Processing | `document-processing` | NORMAL | API trigger | Excel upload → validation → preview → bulk obligation creation |
| 6 | Module 2: Sampling Schedule | `module-2-sampling` | NORMAL | Cron (daily) | Daily/weekly/monthly triggers for lab sampling |
| 7 | Module 3: Run-Hour Monitoring | `module-3-run-hours` | NORMAL | Cron (daily) | 80%/90%/100% threshold checks |
| 8 | AER Generation | `aer-generation` | NORMAL | API trigger / Cron (annual) | Annual return compilation and generation |
| 9 | Permit Renewal Reminder | `deadline-alerts` | NORMAL | Cron (daily) | Notifications for approaching permit renewals |
| 10 | Cross-Sell Trigger Detection | `cross-sell-triggers` | LOW | Cron (6-hourly) | Effluent keyword detection, run-hour breach detection |
| 11 | Audit Pack Generation | `audit-pack-generation` | NORMAL | API trigger | Evidence compilation into PDFs (all pack types) |
| 12 | Pack Distribution | `pack-distribution` | NORMAL | API trigger | Distribute packs via email/shared link |
| 13 | Consultant Client Sync | `consultant-sync` | LOW | Scheduled/Manual | Sync consultant assignments and dashboard |

### Queue Assignments by Priority

**High Priority Queues:**
- Jobs requiring immediate attention
- Deadline-sensitive operations
- User-facing notifications

**Normal Priority Queues:**
- Regular processing jobs
- Scheduled maintenance jobs
- Document processing operations

**Low Priority Queues:**
- Analytics and reporting jobs
- Cross-sell detection (non-urgent)
- Background optimization tasks

---

# 2. Core Monitoring Jobs

## 2.1 Monitoring Schedule Job

**Purpose:** Recurring obligation checks, deadline calculations, and schedule maintenance.

**Reference:** PLS Section B.7 (Monitoring Schedule Generation)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `MONITORING_SCHEDULE` |
| Queue | `monitoring-schedule` |
| Priority | NORMAL |
| Trigger | Cron: `0 * * * *` (every hour at minute 0) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface MonitoringScheduleJobInput {
  company_id?: UUID;    // Optional: Process specific company (if null, process all)
  site_id?: UUID;       // Optional: Process specific site (if null, process all sites)
  force_recalculate?: boolean;  // Default: false - Force recalculation even if no changes
}
```

### Execution Steps

```
Step 1: Query Active Obligations
┌─────────────────────────────────────────────────────────────┐
│  SELECT o.*, s.id AS schedule_id, s.next_due_date          │
│  FROM obligations o                                         │
│  LEFT JOIN schedules s ON s.obligation_id = o.id           │
│  WHERE o.status NOT IN ('COMPLETED', 'NOT_APPLICABLE')     │
│    AND o.deleted_at IS NULL                                │
│    AND (o.company_id = :company_id OR :company_id IS NULL) │
│    AND (o.site_id = :site_id OR :site_id IS NULL)          │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Obligation with Frequency
┌─────────────────────────────────────────────────────────────┐
│  2a. Calculate next deadline based on frequency and        │
│      base_date using deadline calculation rules            │
│      (Reference: PLS Section B.3)                          │
│                                                             │
│  2b. If deadline_date has changed:                         │
│      UPDATE obligations                                     │
│      SET deadline_date = :new_deadline,                    │
│          updated_at = NOW()                                │
│      WHERE id = :obligation_id                             │
│                                                             │
│  2c. Create or update schedules record:                    │
│      INSERT INTO schedules (obligation_id, frequency,      │
│        base_date, next_due_date, status)                   │
│      VALUES (:obligation_id, :frequency, :base_date,       │
│        :next_due_date, 'ACTIVE')                           │
│      ON CONFLICT (obligation_id)                           │
│      DO UPDATE SET next_due_date = :next_due_date,         │
│        updated_at = NOW()                                  │
│                                                             │
│  2d. Generate deadline records for upcoming periods:       │
│      INSERT INTO deadlines (obligation_id, schedule_id,    │
│        due_date, status, compliance_period_start,          │
│        compliance_period_end)                              │
│      SELECT :obligation_id, :schedule_id, :due_date,       │
│        'PENDING', :period_start, :period_end               │
│      WHERE NOT EXISTS (SELECT 1 FROM deadlines             │
│        WHERE obligation_id = :obligation_id                │
│        AND due_date = :due_date)                           │
└─────────────────────────────────────────────────────────────┘

Step 3: Update Obligation Statuses
┌─────────────────────────────────────────────────────────────┐
│  -- Update to DUE_SOON if deadline within 7 days           │
│  UPDATE obligations                                         │
│  SET status = 'DUE_SOON', updated_at = NOW()               │
│  WHERE deadline_date <= CURRENT_DATE + INTERVAL '7 days'   │
│    AND deadline_date > CURRENT_DATE                        │
│    AND status = 'PENDING'                                  │
│                                                             │
│  -- Update to OVERDUE if deadline passed                   │
│  UPDATE obligations                                         │
│  SET status = 'OVERDUE', updated_at = NOW()                │
│  WHERE deadline_date < CURRENT_DATE                        │
│    AND status IN ('PENDING', 'DUE_SOON', 'IN_PROGRESS')    │
└─────────────────────────────────────────────────────────────┘

Step 4: Update Schedule next_due_date Fields
┌─────────────────────────────────────────────────────────────┐
│  UPDATE schedules s                                         │
│  SET next_due_date = (                                     │
│    SELECT MIN(d.due_date)                                  │
│    FROM deadlines d                                        │
│    WHERE d.schedule_id = s.id                              │
│      AND d.status IN ('PENDING', 'DUE_SOON')               │
│  ), updated_at = NOW()                                     │
│  WHERE s.status = 'ACTIVE'                                 │
└─────────────────────────────────────────────────────────────┘
```

### Deadline Calculation Logic

**Reference:** PLS Section B.3

```typescript
function calculateNextDeadline(
  frequency: Frequency,
  baseDate: Date,
  lastCompletedDate: Date | null
): Date {
  const referenceDate = lastCompletedDate || baseDate;
  
  switch (frequency) {
    case 'DAILY':
      return addDays(referenceDate, 1);
    case 'WEEKLY':
      return addWeeks(referenceDate, 1);
    case 'MONTHLY':
      return addMonths(referenceDate, 1);
    case 'QUARTERLY':
      return addMonths(referenceDate, 3);
    case 'ANNUAL':
      return addYears(referenceDate, 1);
    case 'ONE_TIME':
      return baseDate; // One-time obligations use base_date as deadline
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}
```

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Database connection error | Retry with exponential backoff | Yes |
| Calculation error | Log to `audit_logs`, continue with next obligation | No |
| Invalid data | Log warning, skip obligation | No |
| Timeout | Mark job as failed, create DLQ entry | Yes |

### Retry Logic

**Reference:** PLS Section B.7.4

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 |
| Backoff Strategy | Exponential: 2^retry_count seconds |
| First Retry Delay | 2 seconds |
| Second Retry Delay | 4 seconds |

### DLQ Rules

**Reference:** PLS Section B.7.4

**DLQ Condition:** `retry_count >= 2` AND `status = 'FAILED'`

**DLQ Action:**
1. Create `dead_letter_queue` record
2. Set `background_jobs.dead_letter_queue_id` to DLQ record UUID
3. Set `background_jobs.status = 'FAILED'` (terminal state)
4. Log error details in DLQ record

### Health Monitoring

| Parameter | Value |
|-----------|-------|
| Heartbeat Interval | 60 seconds |
| Stale Detection Threshold | 5 minutes without heartbeat |
| Health Status Update | `background_jobs.health_status` |

### Notification Rules

| Event | Notification |
|-------|--------------|
| Success | None (silent background job) |
| Failure | Alert admin users via `notifications` table |

---

## 2.2 Deadline Alert Job

**Purpose:** Generate 7/3/1 day warnings for upcoming deadlines.

**Reference:** PLS Section B.6.1 (Alert Triggers)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `DEADLINE_ALERT` |
| Queue | `deadline-alerts` |
| Priority | HIGH |
| Trigger | Cron: `0 */6 * * *` (every 6 hours) OR triggered by monitoring schedule job |
| Timeout | 120 seconds (2 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface DeadlineAlertJobInput {
  company_id?: UUID;    // Optional: Process specific company
  site_id?: UUID;       // Optional: Process specific site
  trigger_source?: 'CRON' | 'MONITORING_JOB';  // Source of trigger
}
```

### Execution Steps

```
Step 1: Query Upcoming Deadlines
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.*, o.summary, o.assigned_to, s.name AS site_name │
│  FROM deadlines d                                           │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  JOIN sites s ON s.id = o.site_id                          │
│  WHERE d.due_date BETWEEN CURRENT_DATE                     │
│    AND CURRENT_DATE + INTERVAL '7 days'                    │
│    AND d.status IN ('PENDING', 'DUE_SOON')                 │
│    AND (d.company_id = :company_id OR :company_id IS NULL) │
│    AND (d.site_id = :site_id OR :site_id IS NULL)          │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Deadline
┌─────────────────────────────────────────────────────────────┐
│  2a. Calculate days until due:                             │
│      days_remaining = due_date - CURRENT_DATE              │
│                                                             │
│  2b. Determine if alert is needed:                         │
│      IF days_remaining IN (7, 3, 1) THEN                   │
│                                                             │
│  2c. Determine notification severity:                       │
│      days = 7 → severity = 'INFO'                          │
│      days = 3 → severity = 'WARNING'                       │
│      days = 1 → severity = 'CRITICAL'                      │
│                                                             │
│  2d. Create notification record:                           │
│      INSERT INTO notifications (                           │
│        user_id, company_id, site_id,                       │
│        alert_type, severity, channel,                      │
│        title, message, entity_type, entity_id,             │
│        action_url, metadata                                │
│      ) VALUES (                                            │
│        :assigned_user_id, :company_id, :site_id,           │
│        'DEADLINE_ALERT', :severity, :channel,              │
│        :title, :message, 'deadline', :deadline_id,         │
│        :action_url, :metadata                              │
│      )                                                     │
└─────────────────────────────────────────────────────────────┘

Step 3: Update Deadline Status
┌─────────────────────────────────────────────────────────────┐
│  -- Mark as DUE_SOON if within 3 days                      │
│  UPDATE deadlines                                           │
│  SET status = 'DUE_SOON', updated_at = NOW()               │
│  WHERE due_date <= CURRENT_DATE + INTERVAL '3 days'        │
│    AND due_date > CURRENT_DATE                             │
│    AND status = 'PENDING'                                  │
│                                                             │
│  -- Mark as OVERDUE if past due                            │
│  UPDATE deadlines                                           │
│  SET status = 'OVERDUE', updated_at = NOW()                │
│  WHERE due_date < CURRENT_DATE                             │
│    AND status IN ('PENDING', 'DUE_SOON')                   │
└─────────────────────────────────────────────────────────────┘
```

### Notification Priority Matrix

| Days Until Due | Severity | Priority | Channel |
|----------------|----------|----------|---------|
| 7 days | INFO | NORMAL | IN_APP, EMAIL |
| 3 days | WARNING | HIGH | IN_APP, EMAIL |
| 1 day | CRITICAL | URGENT | IN_APP, EMAIL, SMS |
| 0 days (overdue) | CRITICAL | URGENT | IN_APP, EMAIL, SMS |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Notification creation error | Log error, continue with next deadline | No |
| Database error | Retry with exponential backoff | Yes |
| Invalid user reference | Skip notification, log warning | No |

### Retry Logic

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 |
| Backoff Strategy | Exponential: 2^retry_count seconds |

### DLQ Rules

**DLQ Condition:** `retry_count >= 2` AND `status = 'FAILED'`

### Health Monitoring

| Parameter | Value |
|-----------|-------|
| Heartbeat Interval | 60 seconds |

### Notification Rules

| Event | Notification |
|-------|--------------|
| Success | None (creates user notifications as part of job) |
| Failure | Alert admin users |

---

## 2.3 Evidence Reminder Job

**Purpose:** Send notifications for obligations requiring evidence submission.

**Reference:** PLS Section B.5 (Evidence Completeness Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `EVIDENCE_REMINDER` |
| Queue | `evidence-reminders` |
| Priority | HIGH |
| Trigger | Cron: `0 9 * * *` (daily at 9 AM) |
| Timeout | 120 seconds (2 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface EvidenceReminderJobInput {
  company_id?: UUID;    // Optional: Process specific company
  site_id?: UUID;       // Optional: Process specific site
}
```

### Execution Steps

```
Step 1: Query Obligations Requiring Evidence
┌─────────────────────────────────────────────────────────────┐
│  SELECT o.*, s.name AS site_name,                          │
│    u.email AS assigned_user_email,                         │
│    u.full_name AS assigned_user_name                       │
│  FROM obligations o                                         │
│  JOIN sites s ON s.id = o.site_id                          │
│  LEFT JOIN users u ON u.id = o.assigned_to                 │
│  WHERE o.status IN ('IN_PROGRESS', 'PENDING', 'DUE_SOON')  │
│    AND o.deadline_date <= CURRENT_DATE + INTERVAL '7 days' │
│    AND (o.company_id = :company_id OR :company_id IS NULL) │
│    AND (o.site_id = :site_id OR :site_id IS NULL)          │
│    AND o.deleted_at IS NULL                                │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Obligation, Check Evidence Status
┌─────────────────────────────────────────────────────────────┐
│  2a. Count linked evidence:                                │
│      SELECT COUNT(*) AS evidence_count                     │
│      FROM obligation_evidence_links                        │
│      WHERE obligation_id = :obligation_id                  │
│        AND unlinked_at IS NULL                             │
│                                                             │
│  2b. If evidence_count = 0:                                │
│      Create reminder notification                           │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Reminder Notifications
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                               │
│    user_id, company_id, site_id,                           │
│    alert_type, severity, channel,                          │
│    title, message, entity_type, entity_id,                 │
│    action_url, metadata                                    │
│  ) VALUES (                                                │
│    COALESCE(:assigned_user_id, :site_manager_id),          │
│    :company_id, :site_id,                                  │
│    'EVIDENCE_REMINDER', 'WARNING', 'EMAIL',                │
│    'Evidence Required: ' || :obligation_summary,           │
│    'Evidence is required for obligation due on ' ||        │
│      :deadline_date,                                       │
│    'obligation', :obligation_id,                           │
│    '/obligations/' || :obligation_id,                      │
│    '{"days_until_due": ' || :days_remaining || '}'         │
│  )                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Recipient Determination Logic

```typescript
function determineRecipient(obligation: Obligation): UUID {
  // Priority order:
  // 1. Assigned user (if set)
  // 2. Site manager
  // 3. Company admin
  
  if (obligation.assigned_to) {
    return obligation.assigned_to;
  }
  
  // Query site manager
  const siteManager = await db.query(`
    SELECT u.id FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN user_site_assignments usa ON usa.user_id = u.id
    WHERE usa.site_id = $1
      AND ur.role IN ('ADMIN', 'OWNER')
    LIMIT 1
  `, [obligation.site_id]);
  
  if (siteManager) {
    return siteManager.id;
  }
  
  // Fallback to company admin
  return getCompanyAdmin(obligation.company_id);
}
```

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Query error | Retry with exponential backoff | Yes |
| Notification creation error | Log error, continue with next obligation | No |
| Missing user | Log warning, skip notification | No |

### Retry Logic

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 |
| Backoff Strategy | Exponential: 2^retry_count seconds |

### DLQ Rules

**DLQ Condition:** `retry_count >= 2` AND `status = 'FAILED'`

### Health Monitoring

| Parameter | Value |
|-----------|-------|
| Heartbeat Interval | 60 seconds |

### Notification Rules

| Event | Notification |
|-------|--------------|
| Success | None (creates user notifications as part of job) |
| Failure | Alert admin users |

---

# 3. Document Processing Jobs

## 3.1 Document Processing Job

**Purpose:** Process uploaded PDF documents through OCR, text extraction, and LLM parsing to extract obligations.

**Reference:** PLS Section A.9 (AI Extraction Processing), Technical Architecture Section 5 (AI Service Integration)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `DOCUMENT_PROCESSING` |
| Queue | `document-processing` |
| Priority | NORMAL |
| Trigger | API endpoint: `POST /api/v1/documents/{id}/extract` |
| Timeout | 30 seconds (standard), 300 seconds (large documents ≥50 pages) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface DocumentProcessingJobInput {
  document_id: UUID;           // Required: Document to process
  force_reprocess?: boolean;   // Default: false - Reprocess even if already completed
  extraction_mode?: 'FULL' | 'INCREMENTAL';  // Default: FULL
}
```

### Execution Steps

```
Step 1: Load Document
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.*, m.module_code                                 │
│  FROM documents d                                          │
│  JOIN modules m ON m.id = d.module_id                      │
│  WHERE d.id = :document_id                                 │
│    AND d.deleted_at IS NULL                                │
└─────────────────────────────────────────────────────────────┘

Step 2: Check Processing Status
┌─────────────────────────────────────────────────────────────┐
│  IF extraction_status = 'COMPLETED' AND force_reprocess    │
│     = false THEN                                           │
│    RETURN existing results (skip processing)               │
│  END IF                                                    │
└─────────────────────────────────────────────────────────────┘

Step 3: Update Document Status
┌─────────────────────────────────────────────────────────────┐
│  UPDATE documents                                           │
│  SET extraction_status = 'PROCESSING',                     │
│      updated_at = NOW()                                    │
│  WHERE id = :document_id                                   │
└─────────────────────────────────────────────────────────────┘

Step 4: Load File from Storage
┌─────────────────────────────────────────────────────────────┐
│  Storage path: documents/{company_id}/{site_id}/           │
│                {document_id}/original.pdf                  │
│                                                             │
│  Load file content from Supabase Storage                   │
│  Validate file exists and is accessible                    │
└─────────────────────────────────────────────────────────────┘

Step 5: OCR Processing (if needed)
┌─────────────────────────────────────────────────────────────┐
│  5a. Check if native PDF:                                  │
│      IF documents.is_native_pdf = false OR                 │
│         documents.ocr_confidence < 0.8 THEN                │
│                                                             │
│  5b. Run OCR:                                              │
│      - Use OpenAI Vision API (preferred) or Tesseract      │
│      - Process each page                                   │
│      - Extract text content                                │
│                                                             │
│  5c. Store OCR results:                                    │
│      UPDATE documents                                       │
│      SET extracted_text = :ocr_text,                       │
│          ocr_confidence = :confidence,                     │
│          updated_at = NOW()                                │
│      WHERE id = :document_id                               │
│                                                             │
│  5d. If OCR confidence < 0.8:                              │
│      Log warning, continue with extracted text             │
│      Flag for review: create review_queue_items record     │
└─────────────────────────────────────────────────────────────┘

Step 6: Text Extraction
┌─────────────────────────────────────────────────────────────┐
│  6a. If native PDF (no OCR needed):                        │
│      Extract text directly from PDF                        │
│                                                             │
│  6b. Store extracted text:                                 │
│      UPDATE documents                                       │
│      SET extracted_text = :text,                           │
│          updated_at = NOW()                                │
│      WHERE id = :document_id                               │
└─────────────────────────────────────────────────────────────┘

Step 7: Rules Library Check (Cost Optimization)
┌─────────────────────────────────────────────────────────────┐
│  Reference: AI Extraction Rules Library (Document 1.6)     │
│                                                             │
│  7a. Load rules for document type:                         │
│      SELECT * FROM extraction_rules                        │
│      WHERE module_code = :module_code                      │
│        AND is_active = true                                │
│                                                             │
│  7b. Pattern matching:                                     │
│      FOR EACH rule IN rules:                               │
│        IF pattern_match(extracted_text, rule.pattern)      │
│           AND confidence >= 0.90 THEN                      │
│          Apply rule extraction (skip LLM for this section) │
│        END IF                                              │
│      END FOR                                               │
│                                                             │
│  7c. Track hit rate for cost optimization:                 │
│      Expected hit rate: 60-70% (per MCP cost optimization) │
└─────────────────────────────────────────────────────────────┘

Step 8: LLM Extraction
┌─────────────────────────────────────────────────────────────┐
│  Reference: AI Integration Layer (Document 2.10)           │
│  Reference: AI Microservice Prompts (Document 1.7)         │
│                                                             │
│  8a. Prepare extraction request:                           │
│      - Select appropriate prompt template for module       │
│      - Chunk document if > 100,000 tokens                  │
│      - Include sections not matched by rules library       │
│                                                             │
│  8b. Call AI service:                                      │
│      POST /api/v1/ai/extract                               │
│      {                                                     │
│        "document_text": :text,                             │
│        "document_type": :document_type,                    │
│        "module_code": :module_code,                        │
│        "extraction_params": :params                        │
│      }                                                     │
│                                                             │
│  8c. Handle response:                                      │
│      - Parse extracted obligations                         │
│      - Validate against expected schema                    │
│      - Store confidence scores                             │
└─────────────────────────────────────────────────────────────┘

Step 9: Process Extraction Results
┌─────────────────────────────────────────────────────────────┐
│  9a. Create obligation records:                            │
│      FOR EACH extracted_obligation:                        │
│        INSERT INTO obligations (                           │
│          document_id, company_id, site_id,                 │
│          original_text, summary, category,                 │
│          condition_type, frequency, confidence_score,      │
│          status, review_status, created_by                 │
│        ) VALUES (                                          │
│          :document_id, :company_id, :site_id,              │
│          :original_text, :summary, :category,              │
│          :condition_type, :frequency, :confidence,         │
│          'PENDING', :review_status, :created_by            │
│        )                                                   │
│      END FOR                                               │
│                                                             │
│  9b. Flag low-confidence items (confidence < 0.85):        │
│      IF confidence < 0.85 THEN                             │
│        INSERT INTO review_queue_items (                    │
│          document_id, obligation_id, company_id, site_id,  │
│          review_type, is_blocking, priority,               │
│          original_data, review_status                      │
│        ) VALUES (                                          │
│          :document_id, :obligation_id, :company_id,        │
│          :site_id, 'LOW_CONFIDENCE', false, 1,             │
│          :extraction_data, 'PENDING'                       │
│        )                                                   │
│      END IF                                                │
└─────────────────────────────────────────────────────────────┘

Step 10: Update Document Status
┌─────────────────────────────────────────────────────────────┐
│  UPDATE documents                                           │
│  SET extraction_status = 'COMPLETED',                      │
│      extraction_completed_at = NOW(),                      │
│      updated_at = NOW()                                    │
│  WHERE id = :document_id                                   │
└─────────────────────────────────────────────────────────────┘

Step 11: Create Extraction Log
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO extraction_logs (                             │
│    document_id, extraction_timestamp, model_identifier,    │
│    rule_library_version, segments_processed,               │
│    obligations_extracted, flagged_for_review,              │
│    processing_time_ms, ocr_required, ocr_confidence,       │
│    errors, warnings, metadata                              │
│  ) VALUES (                                                │
│    :document_id, NOW(), :model_id,                         │
│    :rule_library_version, :segments_count,                 │
│    :obligations_count, :flagged_count,                     │
│    :processing_time_ms, :ocr_required, :ocr_confidence,    │
│    :errors, :warnings, :metadata                           │
│  )                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling

| Error Type | Handling Strategy | Status | Retry |
|------------|-------------------|--------|-------|
| File not found | Set status = 'FAILED', error_message = 'File not found' | FAILED | No |
| OCR failure | Set status = 'OCR_FAILED', create review_queue_item | OCR_FAILED | Yes |
| LLM timeout | Retry with same document (per PLS A.9.1: 30s standard, 5min large) | PROCESSING | Yes |
| LLM error | Set status = 'EXTRACTION_FAILED', create review_queue_item | EXTRACTION_FAILED | Yes |
| Validation errors | Set status = 'REVIEW_REQUIRED', create review_queue_item | REVIEW_REQUIRED | No |
| Zero obligations extracted | Set status = 'ZERO_OBLIGATIONS', flag for review | ZERO_OBLIGATIONS | No |

### Retry Logic

**Reference:** PLS Section B.7.4

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 |
| Backoff Strategy | Exponential: 2^retry_count seconds |
| Retryable Errors | Network errors, LLM timeout, database connection |
| Non-Retryable Errors | Validation errors, file not found, permanent failures |

### DLQ Rules

**Reference:** PLS Section B.7.4

**DLQ Condition:** `retry_count >= 2` AND `status = 'FAILED'`

**DLQ Action:**
1. Create `dead_letter_queue` record:
   ```sql
   INSERT INTO dead_letter_queue (
     job_id, company_id, error_message, error_stack,
     error_context, retry_count, last_attempted_at
   ) VALUES (
     :job_id, :company_id, :error_message, :error_stack,
     :error_context, :retry_count, NOW()
   )
   ```
2. Set `background_jobs.dead_letter_queue_id` to DLQ record UUID
3. Set `background_jobs.status = 'FAILED'` (terminal state)

### Health Monitoring

| Parameter | Standard Documents | Large Documents (≥50 pages) |
|-----------|-------------------|----------------------------|
| Heartbeat Interval | 60 seconds | 30 seconds |
| Timeout | 30 seconds | 300 seconds (5 minutes) |

**Large Document Detection:**
```typescript
function isLargeDocument(document: Document): boolean {
  return document.page_count >= 50 || 
         document.file_size_bytes >= 10_000_000; // 10MB
}
```

### Notification Rules

| Event | Notification |
|-------|--------------|
| Success | "Document processed successfully" - includes obligation count |
| Success with review items | "Document processed - X items flagged for review" |
| Failure | "Document processing failed" - includes error message and review queue link |

### Success Notification Template

```typescript
const successNotification = {
  user_id: document.uploaded_by,
  company_id: document.company_id,
  site_id: document.site_id,
  alert_type: 'SYSTEM',
  severity: 'INFO',
  channel: 'IN_APP',
  title: 'Document Processed Successfully',
  message: `"${document.title}" has been processed. ${obligationsCount} obligations extracted.${flaggedCount > 0 ? ` ${flaggedCount} items flagged for review.` : ''}`,
  entity_type: 'document',
  entity_id: document.id,
  action_url: `/documents/${document.id}`,
  metadata: {
    obligations_extracted: obligationsCount,
    flagged_for_review: flaggedCount,
    processing_time_ms: processingTime
  }
};
```

### Failure Notification Template

```typescript
const failureNotification = {
  user_id: document.uploaded_by,
  company_id: document.company_id,
  site_id: document.site_id,
  alert_type: 'SYSTEM',
  severity: 'ERROR',
  channel: 'IN_APP',
  title: 'Document Processing Failed',
  message: `Processing failed for "${document.title}". ${errorMessage}`,
  entity_type: 'document',
  entity_id: document.id,
  action_url: `/review-queue?document_id=${document.id}`,
  metadata: {
    error_type: errorType,
    error_message: errorMessage,
    can_retry: canRetry
  }
};
```

---

## 3.2 Excel Import Processing Job

**Purpose:** Process uploaded Excel/CSV files to import obligations in bulk, validate data, create preview, and execute bulk obligation creation after user confirmation.

**Reference:** PLS Section 14 (Excel import logic), Master Build Order Section 2.3

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `EXCEL_IMPORT_PROCESSING` |
| Queue | `document-processing` |
| Priority | NORMAL |
| Trigger | API endpoint: `POST /api/v1/obligations/import/excel` |
| Timeout | 60 seconds (validation), 300 seconds (bulk creation) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface ExcelImportJobInput {
  import_id: UUID;              // Required: Excel import record ID
  file_path: string;            // Required: Path to uploaded Excel file in storage
  site_id: UUID;                // Required: Site identifier
  user_id: UUID;                // Required: User who uploaded file
  import_options: {
    create_missing_sites?: boolean;    // Default: false
    create_missing_permits?: boolean;  // Default: false
    skip_duplicates?: boolean;         // Default: true
    column_mapping?: Record<string, string>; // Optional: Custom column mapping
  };
}
```

### Execution Steps (Phase 1: Validation & Preview)

```
Step 1: Load Import Record
┌─────────────────────────────────────────────────────────────┐
│  SELECT ei.*, s.name AS site_name, u.email AS user_email   │
│  FROM excel_imports ei                                      │
│  JOIN sites s ON s.id = ei.site_id                          │
│  JOIN users u ON u.id = ei.user_id                          │
│  WHERE ei.id = :import_id                                   │
│    AND ei.status = 'PENDING'                               │
└─────────────────────────────────────────────────────────────┘

Step 2: Load Excel File from Storage
┌─────────────────────────────────────────────────────────────┐
│  Storage path: imports/{company_id}/{site_id}/             │
│                {import_id}/original.{xlsx|xls|csv}          │
│                                                             │
│  Load file content from Supabase Storage                   │
│  Validate file exists and is accessible                     │
└─────────────────────────────────────────────────────────────┘

Step 3: Parse Excel File
┌─────────────────────────────────────────────────────────────┐
│  3a. Detect file format:                                   │
│      - .xlsx: Use ExcelJS library                          │
│      - .xls: Use ExcelJS library (legacy format)           │
│      - .csv: Use CSV parser                                │
│                                                             │
│  3b. Extract rows and columns:                             │
│      rows = parseExcelFile(file_path)                      │
│      columns = detectColumns(rows[0])                      │
│                                                             │
│  3c. Validate file structure:                              │
│      - Check row count <= 10,000                          │
│      - Check file size <= 10MB                             │
│      - Check required columns exist                        │
└─────────────────────────────────────────────────────────────┘

Step 4: Map Columns to System Fields
┌─────────────────────────────────────────────────────────────┐
│  4a. Auto-detect column mapping:                           │
│      FOR EACH column IN columns:                           │
│        system_field = fuzzyMatch(column.name,              │
│                                  expected_fields)          │
│      END FOR                                               │
│                                                             │
│  4b. Apply custom mapping if provided:                     │
│      IF import_options.column_mapping THEN                 │
│        Apply custom mapping                                │
│      END IF                                                │
│                                                             │
│  4c. Validate required columns mapped:                     │
│      required_fields = ['permit_number', 'obligation_title',│
│                        'frequency', 'deadline_date',       │
│                        'site_id']                          │
│      FOR EACH field IN required_fields:                   │
│        IF NOT mapped THEN                                 │
│          ERROR: "Missing required column: {field}"         │
│        END IF                                              │
│      END FOR                                               │
└─────────────────────────────────────────────────────────────┘

Step 5: Validate Each Row
┌─────────────────────────────────────────────────────────────┐
│  valid_rows = []                                            │
│  errors = []                                                │
│  warnings = []                                              │
│                                                             │
│  FOR EACH row IN rows (starting from row 2):               │
│    row_errors = []                                         │
│    row_warnings = []                                       │
│                                                             │
│    5a. Validate required fields:                           │
│        IF row.permit_number IS NULL OR EMPTY THEN         │
│          row_errors.push("Missing permit_number")          │
│        END IF                                              │
│        IF row.obligation_title IS NULL OR EMPTY THEN      │
│          row_errors.push("Missing obligation_title")       │
│        END IF                                              │
│                                                             │
│    5b. Validate date format:                               │
│        deadline_date = parseDate(row.deadline_date)        │
│        IF deadline_date IS NULL THEN                       │
│          row_errors.push("Invalid date format")            │
│        END IF                                              │
│                                                             │
│    5c. Validate frequency:                                 │
│        valid_frequencies = ['daily', 'weekly', 'monthly',  │
│                            'quarterly', 'annually',        │
│                            'one-time']                     │
│        IF row.frequency NOT IN valid_frequencies THEN     │
│          row_errors.push("Invalid frequency value")        │
│        END IF                                              │
│                                                             │
│    5d. Validate site reference:                            │
│        IF row.site_id IS NULL THEN                         │
│          Use import.site_id                                │
│        ELSE                                                │
│          Check site exists:                                │
│          site = SELECT * FROM sites WHERE id = row.site_id │
│          IF site IS NULL THEN                             │
│            IF import_options.create_missing_sites THEN     │
│              row_warnings.push("Site will be created")    │
│            ELSE                                            │
│              row_errors.push("Site not found")            │
│            END IF                                          │
│          END IF                                            │
│        END IF                                              │
│                                                             │
│    5e. Check for duplicates:                               │
│        IF import_options.skip_duplicates THEN            │
│          existing = SELECT * FROM obligations              │
│                     WHERE permit_number = row.permit_number│
│                       AND obligation_title = row.obligation_title│
│                       AND site_id = row.site_id            │
│          IF existing THEN                                  │
│            row_warnings.push("Duplicate obligation")       │
│          END IF                                            │
│        END IF                                              │
│                                                             │
│    5f. Store row result:                                   │
│        IF row_errors.length > 0 THEN                      │
│          errors.push({row_number, errors: row_errors})    │
│        ELSE                                                │
│          valid_rows.push({row_number, data: row,           │
│                          warnings: row_warnings})          │
│        END IF                                              │
│  END FOR                                                   │
└─────────────────────────────────────────────────────────────┘

Step 6: Store Preview Results
┌─────────────────────────────────────────────────────────────┐
│  UPDATE excel_imports                         │
│  SET status = 'PENDING_REVIEW',                            │
│      valid_rows = :valid_rows,                             │
│      error_rows = :errors,                                 │
│      warning_rows = :warnings,                              │
│      row_count = :total_rows,                              │
│      valid_count = :valid_rows.length,                     │
│      error_count = :errors.length,                         │
│      updated_at = NOW()                                    │
│  WHERE id = :import_id                                     │
└─────────────────────────────────────────────────────────────┘

Step 7: Send Preview Ready Notification
┌─────────────────────────────────────────────────────────────┐
│  Create notification:                                      │
│  {                                                         │
│    user_id: import.user_id,                                │
│    alert_type: 'SYSTEM',                                  │
│    severity: 'INFO',                                      │
│    channel: 'EMAIL',                                      │
│    title: 'Excel import ready for review',                │
│    message: "Your Excel import is ready. {valid_count}    │
│              valid rows, {error_count} errors.",           │
│    action_url: `/obligations/import/${import_id}/preview` │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Execution Steps (Phase 2: Bulk Creation - After User Confirmation)

```
Step 1: Load Import Record and Preview
┌─────────────────────────────────────────────────────────────┐
│  SELECT ei.* FROM excel_imports ei                         │
│  WHERE ei.id = :import_id                                  │
│    AND ei.status = 'PENDING_REVIEW'                       │
│                                                             │
│  Load valid_rows, error_rows from preview                  │
└─────────────────────────────────────────────────────────────┘

Step 2: Create Obligations in Bulk
┌─────────────────────────────────────────────────────────────┐
│  obligation_ids = []                                       │
│                                                             │
│  FOR EACH valid_row IN valid_rows:                         │
│    2a. Find or create permit:                             │
│        permit = SELECT * FROM documents                    │
│                 WHERE permit_number = row.permit_number    │
│                   AND site_id = row.site_id                │
│        IF permit IS NULL THEN                             │
│          IF import_options.create_missing_permits THEN     │
│            permit = INSERT INTO documents (...)            │
│          ELSE                                              │
│            SKIP row (add to errors)                       │
│          END IF                                            │
│        END IF                                              │
│                                                             │
│    2b. Create obligation:                                 │
│        obligation = INSERT INTO obligations (              │
│          document_id: permit.id,                           │
│          site_id: row.site_id,                             │
│          obligation_title: row.obligation_title,           │
│          obligation_description: row.obligation_description,│
│          frequency: row.frequency,                         │
│          import_source: 'excel_import',                    │
│          excel_import_id: import_id,                       │
│          created_by: user_id                               │
│        )                                                   │
│                                                             │
│    2c. Create deadline if deadline_date provided:         │
│        IF row.deadline_date THEN                          │
│          INSERT INTO deadlines (                           │
│            obligation_id: obligation.id,                   │
│            due_date: row.deadline_date,                   │
│            status: 'PENDING'                               │
│          )                                                 │
│        END IF                                              │
│                                                             │
│        obligation_ids.push(obligation.id)                 │
│  END FOR                                                   │
└─────────────────────────────────────────────────────────────┘

Step 3: Update Import Status
┌─────────────────────────────────────────────────────────────┐
│  UPDATE excel_imports                                       │
│  SET status = 'COMPLETED',                                 │
│      success_count = :obligation_ids.length,                │
│      completed_at = NOW(),                                 │
│      updated_at = NOW()                                    │
│  WHERE id = :import_id                                     │
└─────────────────────────────────────────────────────────────┘

Step 4: Send Completion Notification
┌─────────────────────────────────────────────────────────────┐
│  Create notification:                                      │
│  {                                                         │
│    user_id: import.user_id,                                │
│    alert_type: 'SYSTEM',                                  │
│    severity: 'SUCCESS',                                   │
│    channel: 'EMAIL',                                      │
│    title: 'Excel import completed',                        │
│    message: "{success_count} obligations imported         │
│              successfully.",                               │
│    action_url: `/sites/${site_id}/obligations`           │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Error Handling

| Error Type | Handling | Status | Retryable |
|------------|----------|--------|-----------|
| File not found | Fail job, notify user | FAILED | No |
| Invalid file format | Fail job, notify user | FAILED | No |
| File too large (>10MB) | Fail job, notify user | FAILED | No |
| Too many rows (>10,000) | Fail job, notify user | FAILED | No |
| Missing required columns | Fail job, notify user | FAILED | No |
| Database connection error | Retry with backoff | PROCESSING | Yes |
| Storage access error | Retry with backoff | PROCESSING | Yes |

### Retry Logic

**Reference:** PLS Section B.7.4

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 |
| Backoff Strategy | Exponential: 2^retry_count seconds |
| Retryable Errors | Network errors, database connection, storage access |
| Non-Retryable Errors | File format errors, validation errors, file not found |

### DLQ Rules

**Reference:** PLS Section B.7.4

**DLQ Condition:** `retry_count >= 2` AND `status = 'FAILED'`

**DLQ Action:**
1. Create `dead_letter_queue` record with import context
2. Set `background_jobs.dead_letter_queue_id`
3. Set `excel_imports.status = 'FAILED'`
4. Notify user of import failure

### Health Monitoring

| Parameter | Value |
|-----------|-------|
| Heartbeat Interval | 30 seconds |
| Timeout | 60 seconds (validation), 300 seconds (bulk creation) |

### Notification Rules

| Event | Notification |
|-------|-------------|
| Preview ready | "Excel import ready for review - X valid rows, Y errors" |
| Import completed | "Excel import completed - X obligations imported successfully" |
| Import failed | "Excel import failed - [error message]" |

---

# 7. Job Infrastructure Details

## 7.1 Retry Strategy

**Reference:** PLS Section B.7.4

### Retry Configuration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Retries | 2 | Not 3 - per PLS specification |
| Backoff Type | Exponential | `2^retry_count` seconds |
| First Retry Delay | 2 seconds | 2^1 = 2 |
| Second Retry Delay | 4 seconds | 2^2 = 4 |

### Retry Logic Pseudocode

```typescript
async function executeWithRetry(job: Job): Promise<JobResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= job.maxRetries; attempt++) {
    try {
      // Send heartbeat before execution
      await sendHeartbeat(job.id);
      
      // Execute job
      const result = await executeJob(job);
      
      // Update job status to COMPLETED
      await updateJobStatus(job.id, 'COMPLETED', { result });
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        await updateJobStatus(job.id, 'FAILED', { 
          error_message: error.message,
          error_stack: error.stack 
        });
        throw error;
      }
      
      // Check if retries remaining
      if (attempt < job.maxRetries) {
        const delayMs = Math.pow(2, attempt + 1) * 1000;
        
        // Update job for retry
        await db.query(`
          UPDATE background_jobs
          SET status = 'PENDING',
              retry_count = retry_count + 1,
              scheduled_for = NOW() + INTERVAL '${delayMs} milliseconds',
              updated_at = NOW()
          WHERE id = $1
        `, [job.id]);
        
        // Wait before retry
        await sleep(delayMs);
        
      } else {
        // Max retries exceeded - move to DLQ
        await moveToDeadLetterQueue(job, lastError);
      }
    }
  }
  
  throw lastError;
}
```

### Retryable vs Non-Retryable Errors

| Retryable Errors | Non-Retryable Errors |
|------------------|---------------------|
| Network timeouts | Validation errors |
| LLM API timeouts | Authentication errors |
| Database connection errors | Permanent failures (malformed data) |
| Temporary API failures | File not found |
| Rate limiting (429) | Permission denied |

### Retry Trigger Logic

```typescript
function isRetryableError(error: Error): boolean {
  const retryableErrorCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'RATE_LIMITED',
    'SERVICE_UNAVAILABLE',
    'GATEWAY_TIMEOUT',
    'LLM_TIMEOUT'
  ];
  
  return retryableErrorCodes.includes(error.code) ||
         error.statusCode === 429 ||
         error.statusCode === 503 ||
         error.statusCode === 504;
}
```

---

## 7.2 Dead-Letter Queue (DLQ) Rules

**Reference:** PLS Section B.7.4

### DLQ Condition

A job is moved to the Dead-Letter Queue when:

```sql
retry_count >= max_retries AND status = 'FAILED'
```

### DLQ Processing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    DLQ Processing Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Job Fails After Max Retries                               │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │ Create DLQ      │                                       │
│  │ Record          │                                       │
│  └────────┬────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │ Link Job to     │                                       │
│  │ DLQ Record      │                                       │
│  └────────┬────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │ Set Job Status  │                                       │
│  │ = FAILED        │                                       │
│  └────────┬────────┘                                       │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │ Admin Reviews   │◄────────── Manual Review Interface    │
│  │ DLQ Entry       │                                       │
│  └────────┬────────┘                                       │
│           │                                                 │
│     ┌─────┴─────┐                                          │
│     ▼           ▼                                          │
│ ┌───────┐  ┌───────────┐                                   │
│ │ Retry │  │ Mark as   │                                   │
│ │ Job   │  │ Permanent │                                   │
│ │       │  │ Failure   │                                   │
│ └───┬───┘  └─────┬─────┘                                   │
│     │            │                                          │
│     ▼            ▼                                          │
│  New Job      Archive                                       │
│  Created      Entry                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### DLQ Record Creation

```typescript
async function moveToDeadLetterQueue(job: Job, error: Error): Promise<void> {
  // Create DLQ record
  const dlqRecord = await db.query(`
    INSERT INTO dead_letter_queue (
      job_id, company_id, error_message, error_stack,
      error_context, retry_count, last_attempted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id
  `, [
    job.id,
    job.payload.company_id,
    error.message,
    error.stack,
    JSON.stringify({
      job_type: job.job_type,
      payload: job.payload,
      attempts: job.retry_count + 1,
      first_attempted_at: job.started_at,
      last_error_code: error.code
    }),
    job.retry_count
  ]);
  
  // Update job with DLQ reference
  await db.query(`
    UPDATE background_jobs
    SET status = 'FAILED',
        dead_letter_queue_id = $1,
        error_message = $2,
        error_stack = $3,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = $4
  `, [dlqRecord.id, error.message, error.stack, job.id]);
  
  // Create admin notification
  await createAdminAlert(job, error, dlqRecord.id);
}
```

### DLQ Retention Policy

| Policy | Value |
|--------|-------|
| Retention Period | 30 days |
| Auto-Archive | After resolution |
| Permanent Storage | `audit_logs` table |

### DLQ Query for Admin Interface

```sql
-- Active DLQ entries requiring review
SELECT 
  dlq.*,
  bj.job_type,
  bj.payload,
  c.name AS company_name
FROM dead_letter_queue dlq
JOIN background_jobs bj ON bj.id = dlq.job_id
LEFT JOIN companies c ON c.id = dlq.company_id
WHERE dlq.resolved_at IS NULL
ORDER BY dlq.created_at DESC;
```

---

## 7.3 Health Monitoring

**Reference:** PLS Section B.7.4

### Health Status Definitions

| Status | Definition | Trigger |
|--------|------------|---------|
| HEALTHY | Job is running normally | Heartbeat received within interval |
| STALE | Job may be stuck | No heartbeat for > 5 minutes |
| FAILED | Job has failed | Explicit failure or unrecoverable stale |

### Heartbeat Implementation

```typescript
class JobHeartbeat {
  private intervalId: NodeJS.Timeout | null = null;
  
  async start(jobId: UUID, intervalSeconds: number = 60): Promise<void> {
    // Send initial heartbeat
    await this.sendHeartbeat(jobId);
    
    // Set up recurring heartbeat
    this.intervalId = setInterval(async () => {
      await this.sendHeartbeat(jobId);
    }, intervalSeconds * 1000);
  }
  
  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  private async sendHeartbeat(jobId: UUID): Promise<void> {
    await db.query(`
      UPDATE background_jobs
      SET last_heartbeat = NOW(),
          health_status = 'HEALTHY',
          updated_at = NOW()
      WHERE id = $1
        AND status = 'RUNNING'
    `, [jobId]);
  }
}
```

### Stale Job Detection

**Detection Query (runs every minute):**

```sql
-- Detect and mark stale jobs
UPDATE background_jobs
SET health_status = 'STALE',
    updated_at = NOW()
WHERE status = 'RUNNING'
  AND health_status = 'HEALTHY'
  AND last_heartbeat < NOW() - INTERVAL '5 minutes';
```

### Auto-Recovery for Stale Jobs

```typescript
async function recoverStaleJobs(): Promise<void> {
  // Find stale jobs that can be recovered
  const staleJobs = await db.query(`
    SELECT * FROM background_jobs
    WHERE health_status = 'STALE'
      AND status = 'RUNNING'
      AND retry_count < max_retries
  `);
  
  for (const job of staleJobs) {
    // Check if job is truly stale (not just slow)
    const isRecoverable = await checkJobRecoverability(job);
    
    if (isRecoverable) {
      // Reset for retry
      await db.query(`
        UPDATE background_jobs
        SET status = 'PENDING',
            health_status = 'HEALTHY',
            retry_count = retry_count + 1,
            scheduled_for = NOW() + INTERVAL '${Math.pow(2, job.retry_count + 1)} seconds',
            updated_at = NOW()
        WHERE id = $1
      `, [job.id]);
      
      console.log(`Job ${job.id} reset for retry`);
    } else {
      // Mark as failed and move to DLQ
      await moveToDeadLetterQueue(job, new Error('Job became unresponsive'));
    }
  }
}
```

### Health Monitoring Dashboard Query

```sql
-- Job health summary for monitoring dashboard
SELECT 
  health_status,
  status,
  COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (NOW() - last_heartbeat))) AS avg_seconds_since_heartbeat
FROM background_jobs
WHERE status IN ('PENDING', 'RUNNING')
GROUP BY health_status, status
ORDER BY health_status, status;
```

---

## 7.4 Job Status Transitions

### Status Transition Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Job Status State Machine                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐                                               │
│  │ PENDING │◄──────────────────────────────────┐           │
│  └────┬────┘                                   │           │
│       │                                        │           │
│       │ Job starts execution                   │           │
│       ▼                                        │           │
│  ┌─────────┐                                   │           │
│  │ RUNNING │───────────────────────────────────┤           │
│  └────┬────┘                                   │           │
│       │                                        │           │
│       ├───────────────────┐                    │           │
│       │                   │                    │           │
│       │ Success           │ Failure            │ Retry     │
│       ▼                   ▼                    │           │
│  ┌───────────┐      ┌─────────┐               │           │
│  │ COMPLETED │      │ FAILED  │               │           │
│  └───────────┘      └────┬────┘               │           │
│                          │                     │           │
│                          ├─────────────────────┘           │
│                          │ If retry_count < max_retries    │
│                          │                                 │
│                          │ If retry_count >= max_retries   │
│                          ▼                                 │
│                     ┌─────────┐                            │
│                     │  DLQ    │  (Terminal + DLQ record)   │
│                     └─────────┘                            │
│                                                             │
│  ┌───────────┐                                             │
│  │ CANCELLED │◄─── User cancellation                       │
│  └───────────┘     (from PENDING only)                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Valid Status Transitions

| From | To | Trigger |
|------|-----|---------|
| PENDING | RUNNING | Job starts execution |
| PENDING | CANCELLED | User cancels pending job |
| RUNNING | COMPLETED | Job completes successfully |
| RUNNING | FAILED | Job fails permanently or max retries exceeded |
| RUNNING | PENDING | Job set for retry (retry_count < max_retries) |
| FAILED | PENDING | Admin triggers manual retry from DLQ |

### Invalid Status Transitions

| From | To | Reason |
|------|-----|--------|
| COMPLETED | Any | Terminal state - cannot be changed |
| CANCELLED | Any | Terminal state - cannot be changed |
| FAILED (in DLQ) | RUNNING | Must go through PENDING first |

### Status Transition Enforcement

```typescript
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  PENDING: ['RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'PENDING'],
  COMPLETED: [],  // Terminal state
  FAILED: ['PENDING'],  // Only via DLQ manual retry
  CANCELLED: []  // Terminal state
};

async function updateJobStatus(
  jobId: UUID, 
  newStatus: JobStatus, 
  metadata?: Record<string, any>
): Promise<void> {
  // Get current status
  const job = await db.query(
    'SELECT status FROM background_jobs WHERE id = $1',
    [jobId]
  );
  
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  
  // Validate transition
  const currentStatus = job.status as JobStatus;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}`
    );
  }
  
  // Update status
  await db.query(`
    UPDATE background_jobs
    SET status = $1,
        ${newStatus === 'COMPLETED' ? 'completed_at = NOW(),' : ''}
        ${newStatus === 'RUNNING' ? 'started_at = NOW(),' : ''}
        ${metadata?.error_message ? 'error_message = $3,' : ''}
        ${metadata?.result ? 'result = $4,' : ''}
        updated_at = NOW()
    WHERE id = $2
  `, [newStatus, jobId, metadata?.error_message, metadata?.result]);
  
  // Log transition in audit_logs
  await logJobStatusChange(jobId, currentStatus, newStatus, metadata);
}
```

---

## 7.5 Database Tables Reference

### background_jobs Table

**Reference:** Database Schema Section 7.2

```sql
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    priority INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error_message TEXT,
    error_stack TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 2,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_backoff_seconds INTEGER NOT NULL DEFAULT 2,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    health_status TEXT NOT NULL DEFAULT 'HEALTHY' 
        CHECK (health_status IN ('HEALTHY', 'STALE', 'FAILED')),
    heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 60,
    dead_letter_queue_id UUID REFERENCES dead_letter_queue(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### dead_letter_queue Table

**Reference:** Database Schema Section 7.3

```sql
CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES background_jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_context JSONB NOT NULL DEFAULT '{}',
    retry_count INTEGER NOT NULL,
    last_attempted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---



---

# 4. Module 2 Jobs (Trade Effluent)

**Reference:** PLS Section C.2 (Module 2 — Trade Effluent Consents)

## 4.1 Sampling Schedule Job

**Purpose:** Generates and manages sampling schedules for trade effluent parameters based on consent requirements.

**Reference:** PLS Section C.2.6 (Sampling Schedule Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `SAMPLING_SCHEDULE` |
| Queue | `module-2-sampling` |
| Priority | NORMAL |
| Trigger | Cron: `0 6 * * *` (daily at 6:00 AM) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface SamplingScheduleJobInput {
  company_id?: UUID;    // Optional: Process specific company
  site_id?: UUID;       // Optional: Process specific site
  parameter_id?: UUID;  // Optional: Process specific parameter
  force_generate?: boolean; // Default: false - Force schedule regeneration
}
```

### Execution Steps

```
Step 1: Query Active Parameters
┌─────────────────────────────────────────────────────────────┐
│  SELECT p.*, d.title AS document_title, d.expiry_date      │
│  FROM parameters p                                          │
│  JOIN documents d ON d.id = p.document_id                   │
│  WHERE p.is_active = true                                   │
│    AND d.status = 'ACTIVE'                                  │
│    AND d.deleted_at IS NULL                                 │
│    AND (p.company_id = :company_id OR :company_id IS NULL)  │
│    AND (p.site_id = :site_id OR :site_id IS NULL)          │
│    AND (p.id = :parameter_id OR :parameter_id IS NULL)     │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Parameter, Generate Sampling Schedule
┌─────────────────────────────────────────────────────────────┐
│  2a. Calculate next sample date based on sampling_frequency │
│      - DAILY: Next business day                             │
│      - WEEKLY: Next Monday (or configured day)              │
│      - MONTHLY: 1st of next month                           │
│      - QUARTERLY: 1st of next quarter                       │
│      - ANNUAL: Anniversary date                             │
│                                                             │
│  2b. Check if sample already exists for calculated date:    │
│      SELECT COUNT(*) FROM lab_results                       │
│      WHERE parameter_id = :parameter_id                     │
│        AND sample_date = :next_sample_date                  │
│                                                             │
│  2c. If no sample exists and date is today or past:        │
│      - Create notification for sampling reminder            │
│      - Set reminder priority based on frequency             │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Sampling Reminder Notifications
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                                │
│    user_id, company_id, site_id,                           │
│    alert_type, severity, channel,                          │
│    title, message, entity_type, entity_id                  │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    p.company_id,                                            │
│    p.site_id,                                               │
│    'EVIDENCE_REMINDER',                                     │
│    CASE WHEN days_overdue > 7 THEN 'ERROR'                 │
│         WHEN days_overdue > 0 THEN 'WARNING'               │
│         ELSE 'INFO' END,                                    │
│    'IN_APP',                                                │
│    'Sample Due: ' || p.parameter_type,                     │
│    'Sampling is due for ' || p.parameter_type || ' at ' || │
│      s.name,                                                │
│    'PARAMETER',                                             │
│    p.id                                                     │
│  FROM parameters p                                          │
│  JOIN sites s ON s.id = p.site_id                          │
│  JOIN user_site_assignments usa ON usa.site_id = p.site_id │
│  JOIN users u ON u.id = usa.user_id                        │
│  WHERE p.id IN (:parameter_ids_needing_sample)             │
└─────────────────────────────────────────────────────────────┘

Step 4: Update Parameter Tracking
┌─────────────────────────────────────────────────────────────┐
│  -- Log sampling schedule generation to audit_logs          │
│  INSERT INTO audit_logs (                                   │
│    company_id, user_id, action_type, entity_type,          │
│    entity_id, new_values                                    │
│  )                                                          │
│  VALUES (                                                   │
│    :company_id, NULL, 'SAMPLING_SCHEDULE_GENERATED',        │
│    'PARAMETER', :parameter_id,                              │
│    jsonb_build_object(                                      │
│      'next_sample_date', :next_sample_date,                │
│      'sampling_frequency', :sampling_frequency              │
│    )                                                        │
│  )                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Frequency Calculation Logic

```typescript
function calculateNextSampleDate(
  parameter: Parameter,
  lastSampleDate: Date | null
): Date {
  const baseDate = lastSampleDate || parameter.created_at;
  
  switch (parameter.sampling_frequency) {
    case 'DAILY':
      return addBusinessDays(baseDate, 1);
    case 'WEEKLY':
      return nextWeekday(baseDate, 1); // Monday
    case 'MONTHLY':
      return startOfMonth(addMonths(baseDate, 1));
    case 'QUARTERLY':
      return startOfQuarter(addQuarters(baseDate, 1));
    case 'ANNUAL':
      return addYears(baseDate, 1);
    default:
      return addDays(baseDate, 7); // Default weekly
  }
}
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Database connection error | Retry with exponential backoff |
| Invalid parameter data | Log to audit_logs, skip parameter, continue |
| Notification creation failure | Log warning, continue with next parameter |
| Date calculation error | Log error, use default (weekly) frequency |

### Retry Logic

- Max 2 retries with exponential backoff (2s, 4s)
- Transient database errors trigger retry
- Validation errors do not trigger retry (skip and continue)

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`
- DLQ record includes: parameter IDs processed, error context, partial results

### Health Monitoring

- Send heartbeat every 60 seconds
- Log progress: `Processed {n}/{total} parameters`

### Success Notification

- None (silent background job)

### Failure Notification

- Create notification: `alert_type = 'SYSTEM'`, `severity = 'ERROR'`
- Notify admin users: "Sampling schedule job failed"

---

# 5. Module 3 Jobs (MCPD/Generators)

**Reference:** PLS Section C.3 (Module 3 — MCPD/Generator Compliance)

## 5.1 Run-Hour Monitoring Job

**Purpose:** Monitors generator run-hours against annual/monthly limits and triggers threshold alerts at 80%/90%/100%.

**Reference:** PLS Section C.3.3 (Limit Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `RUN_HOUR_MONITORING` |
| Queue | `module-3-run-hours` |
| Priority | NORMAL |
| Trigger | Cron: `0 7 * * *` (daily at 7:00 AM) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface RunHourMonitoringJobInput {
  company_id?: UUID;     // Optional: Process specific company
  generator_id?: UUID;   // Optional: Process specific generator
  check_monthly?: boolean; // Default: true - Check monthly limits
  check_annual?: boolean;  // Default: true - Check annual limits
}
```

### Execution Steps

```
Step 1: Query Active Generators
┌─────────────────────────────────────────────────────────────┐
│  SELECT g.*, d.title AS document_title,                     │
│    (SELECT COALESCE(SUM(hours_recorded), 0)                │
│     FROM run_hour_records                                   │
│     WHERE generator_id = g.id                               │
│       AND recording_date >= g.anniversary_date) AS ytd_hours│
│  FROM generators g                                          │
│  JOIN documents d ON d.id = g.document_id                   │
│  WHERE g.is_active = true                                   │
│    AND g.deleted_at IS NULL                                 │
│    AND (g.company_id = :company_id OR :company_id IS NULL)  │
│    AND (g.id = :generator_id OR :generator_id IS NULL)     │
└─────────────────────────────────────────────────────────────┘

Step 2: Calculate Current Utilisation
┌─────────────────────────────────────────────────────────────┐
│  For each generator:                                        │
│                                                             │
│  2a. Calculate annual utilisation:                          │
│      annual_percentage = (ytd_hours / annual_run_hour_limit)│
│                          × 100                              │
│                                                             │
│  2b. Calculate monthly utilisation (if applicable):         │
│      SELECT COALESCE(SUM(hours_recorded), 0) AS mtd_hours  │
│      FROM run_hour_records                                  │
│      WHERE generator_id = :generator_id                     │
│        AND recording_date >= DATE_TRUNC('month', NOW())     │
│                                                             │
│      monthly_percentage = (mtd_hours / monthly_run_hour_limit)│
│                           × 100                             │
└─────────────────────────────────────────────────────────────┘

Step 3: Check Thresholds and Create Alerts
┌─────────────────────────────────────────────────────────────┐
│  For each threshold breach:                                 │
│                                                             │
│  3a. Determine alert level:                                 │
│      - percentage >= 100: BREACH (operations should cease)  │
│      - percentage >= 90: ELEVATED WARNING                   │
│      - percentage >= 80: WARNING                            │
│                                                             │
│  3b. Check if alert already sent for this threshold:        │
│      SELECT COUNT(*) FROM notifications                     │
│      WHERE entity_type = 'GENERATOR'                        │
│        AND entity_id = :generator_id                        │
│        AND alert_type = 'BREACH'                            │
│        AND metadata->>'threshold_level' = :threshold        │
│        AND created_at >= DATE_TRUNC('year', NOW())          │
│                                                             │
│  3c. If no existing alert, create notification:             │
│      INSERT INTO notifications (                            │
│        user_id, company_id, site_id,                       │
│        alert_type, severity, channel,                      │
│        title, message, entity_type, entity_id, metadata    │
│      ) VALUES (...)                                         │
└─────────────────────────────────────────────────────────────┘

Step 4: Update Generator Records
┌─────────────────────────────────────────────────────────────┐
│  UPDATE generators                                          │
│  SET current_year_hours = :ytd_hours,                       │
│      current_month_hours = :mtd_hours,                      │
│      updated_at = NOW()                                     │
│  WHERE id = :generator_id                                   │
└─────────────────────────────────────────────────────────────┘
```

### Threshold Alert Mapping

| Percentage | Alert Type | Severity | Title |
|------------|------------|----------|-------|
| ≥ 100% | BREACH | CRITICAL | "Run-Hour Limit Breached" |
| ≥ 90% | BREACH | ERROR | "Run-Hour Limit 90% Reached" |
| ≥ 80% | BREACH | WARNING | "Run-Hour Limit 80% Warning" |

### Notification Message Template

```typescript
function getRunHourAlertMessage(
  generator: Generator, 
  percentage: number,
  threshold: number
): string {
  return `Generator ${generator.generator_identifier} has reached ` +
    `${percentage.toFixed(1)}% (${threshold}% threshold) of its annual ` +
    `${generator.annual_run_hour_limit} hour limit. ` +
    `Year-to-date: ${generator.current_year_hours} hours.`;
}
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Database connection error | Retry with exponential backoff |
| Invalid generator data | Log to audit_logs, skip generator, continue |
| Notification creation failure | Log warning, continue |
| Calculation overflow | Log error, cap at 999.9% |

### Retry Logic

- Max 2 retries with exponential backoff (2s, 4s)
- Transient errors trigger retry
- Data validation errors skip and continue

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`
- DLQ record includes: generator IDs processed, threshold breaches detected

### Health Monitoring

- Send heartbeat every 60 seconds
- Log progress: `Checked {n}/{total} generators, {breaches} threshold breaches`

### Success Notification

- None (silent background job)

### Failure Notification

- Alert admin users: "Run-hour monitoring job failed"

---

## 5.2 AER Generation Job

**Purpose:** Compiles Annual Emissions Report data and generates EA-format PDF/CSV for submission.

**Reference:** PLS Section C.3.8 (Annual Return - AER Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AER_GENERATION` |
| Queue | `aer-generation` |
| Priority | NORMAL |
| Trigger | API endpoint OR Cron: `0 8 15 1 *` (Jan 15 at 8:00 AM) |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface AERGenerationJobInput {
  document_id: UUID;        // Required: MCPD registration document
  company_id: UUID;         // Required: Company ID
  reporting_period_start: Date; // Required: Period start
  reporting_period_end: Date;   // Required: Period end
  output_format: 'PDF' | 'CSV' | 'BOTH'; // Default: 'BOTH'
  include_draft_data?: boolean; // Default: false
}
```

### Execution Steps

```
Step 1: Load Document and Generators
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.*, m.module_code                                  │
│  FROM documents d                                           │
│  JOIN modules m ON m.id = d.module_id                       │
│  WHERE d.id = :document_id                                  │
│    AND d.company_id = :company_id                           │
│    AND d.deleted_at IS NULL                                 │
│                                                             │
│  SELECT g.*                                                 │
│  FROM generators g                                          │
│  WHERE g.document_id = :document_id                         │
│    AND g.is_active = true                                   │
│    AND g.deleted_at IS NULL                                 │
└─────────────────────────────────────────────────────────────┘

Step 2: Aggregate Run-Hour Data
┌─────────────────────────────────────────────────────────────┐
│  For each generator:                                        │
│                                                             │
│  SELECT                                                     │
│    generator_id,                                            │
│    SUM(hours_recorded) AS total_hours,                     │
│    COUNT(*) AS record_count,                               │
│    MIN(recording_date) AS first_record,                    │
│    MAX(recording_date) AS last_record                      │
│  FROM run_hour_records                                      │
│  WHERE generator_id = :generator_id                         │
│    AND recording_date BETWEEN :period_start AND :period_end│
│  GROUP BY generator_id                                      │
└─────────────────────────────────────────────────────────────┘

Step 3: Aggregate Stack Test Results
┌─────────────────────────────────────────────────────────────┐
│  SELECT st.*                                                │
│  FROM stack_tests st                                        │
│  WHERE st.generator_id IN (:generator_ids)                  │
│    AND st.test_date BETWEEN :period_start AND :period_end  │
│  ORDER BY st.test_date DESC                                 │
└─────────────────────────────────────────────────────────────┘

Step 4: Calculate Emissions Data
┌─────────────────────────────────────────────────────────────┐
│  For each generator with stack test results:                │
│                                                             │
│  4a. Get emission rates from latest stack test:             │
│      nox_rate, so2_rate, co_rate, particulates_rate        │
│                                                             │
│  4b. Calculate annual emissions:                            │
│      annual_emissions = total_run_hours × emission_rate    │
│                                                             │
│  4c. Build emissions data structure:                        │
│      {                                                      │
│        "generator_id": "uuid",                              │
│        "nox_total": 123.45,                                 │
│        "so2_total": 12.34,                                  │
│        "co_total": 45.67,                                   │
│        "particulates_total": 5.67                           │
│      }                                                      │
└─────────────────────────────────────────────────────────────┘

Step 5: Validate AER Data
┌─────────────────────────────────────────────────────────────┐
│  Validation Rules:                                          │
│  - All generators must have run-hour records                │
│  - All generators must have at least one stack test         │
│  - Total hours must be within annual limit (warning if not) │
│  - Emissions values must be non-negative                    │
│  - Reporting period must be 12 months                       │
│                                                             │
│  Store validation errors in:                                │
│  validation_errors = [                                      │
│    {"field": "run_hours", "error": "Missing data", ...}    │
│  ]                                                          │
└─────────────────────────────────────────────────────────────┘

Step 6: Generate AER Document
┌─────────────────────────────────────────────────────────────┐
│  6a. Build EA Standard Format Structure:                    │
│      - Section 1: Generator Details                         │
│      - Section 2: Reporting Period                          │
│      - Section 3: Run-Hours Summary                         │
│      - Section 4: Fuel Consumption                          │
│      - Section 5: Emissions Data                            │
│      - Section 6: Stack Test Results                        │
│      - Section 7: Incidents/Breakdowns                      │
│                                                             │
│  6b. Generate PDF using template:                           │
│      pdf = generateAERPDF(aerData, template)                │
│                                                             │
│  6c. Generate CSV for data export:                          │
│      csv = generateAERCSV(aerData)                          │
│                                                             │
│  6d. Store files in Supabase Storage:                       │
│      storage_path = `aer-documents/${company_id}/           │
│        ${document_id}/${aer_id}/`                           │
│      - aer-{year}.pdf                                       │
│      - aer-{year}-data.csv                                  │
└─────────────────────────────────────────────────────────────┘

Step 7: Create AER Database Record
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO aer_documents (                                │
│    document_id, company_id,                                 │
│    reporting_period_start, reporting_period_end,           │
│    submission_deadline, status,                            │
│    generator_data, fuel_consumption_data,                  │
│    emissions_data, incidents_data,                         │
│    total_run_hours, is_validated, validation_errors,       │
│    generated_file_path, generated_at, created_by           │
│  )                                                          │
│  VALUES (                                                   │
│    :document_id, :company_id,                               │
│    :period_start, :period_end,                              │
│    :submission_deadline, 'DRAFT',                           │
│    :generator_data::JSONB, :fuel_data::JSONB,              │
│    :emissions_data::JSONB, :incidents_data::JSONB,         │
│    :total_hours, :is_validated, :validation_errors::JSONB, │
│    :storage_path, NOW(), :created_by                        │
│  )                                                          │
│  RETURNING id                                               │
└─────────────────────────────────────────────────────────────┘
```

### AER Data Structure

```typescript
interface AERData {
  document_id: UUID;
  company_id: UUID;
  reporting_period: {
    start: Date;
    end: Date;
  };
  generators: Array<{
    id: UUID;
    identifier: string;
    type: string;
    capacity_mw: number;
    total_run_hours: number;
    fuel_type: string;
    fuel_consumption: number;
    emissions: {
      nox: number;
      so2: number;
      co: number;
      particulates: number;
    };
    stack_tests: Array<{
      test_date: Date;
      results: Record<string, number>;
      compliance_status: string;
    }>;
  }>;
  incidents: Array<{
    date: Date;
    description: string;
    generator_id: UUID;
  }>;
  validation_errors: Array<{
    field: string;
    error: string;
    severity: 'WARNING' | 'ERROR';
  }>;
}
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Missing generator data | Add validation error, continue |
| Missing stack test | Add validation error, continue |
| PDF generation failure | Retry once, then fail job |
| Storage upload failure | Retry with backoff |
| Database error | Retry with backoff |

### Retry Logic

- Max 2 retries with exponential backoff (2s, 4s)
- PDF generation failures: retry once before failing
- Storage failures: retry with backoff

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`
- DLQ record includes: document_id, generators processed, validation errors

### Health Monitoring

- Send heartbeat every 60 seconds
- Log progress: `Processing generator {n}/{total}`

### Success Notification

- Create notification: "AER generated successfully for period {start} - {end}"
- Include download link to generated PDF

### Failure Notification

- Create notification: "AER generation failed"
- Include error details and validation errors

---

# 6. System Jobs

## 6.1 Permit Renewal Reminder Job

**Purpose:** Sends notifications for approaching permit/consent/registration expiry dates.

**Reference:** PLS Section C.1.8 (Renewal Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `PERMIT_RENEWAL_REMINDER` |
| Queue | `deadline-alerts` |
| Priority | NORMAL |
| Trigger | Cron: `0 8 * * *` (daily at 8:00 AM) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface PermitRenewalReminderJobInput {
  company_id?: UUID;    // Optional: Process specific company
  site_id?: UUID;       // Optional: Process specific site
  reminder_days?: number[]; // Default: [90, 30, 7]
}
```

### Execution Steps

```
Step 1: Query Documents with Upcoming Expiry
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.*, s.name AS site_name, c.name AS company_name,  │
│    (d.expiry_date - CURRENT_DATE) AS days_until_expiry     │
│  FROM documents d                                           │
│  JOIN sites s ON s.id = d.site_id                          │
│  JOIN companies c ON c.id = d.company_id                   │
│  WHERE d.status = 'ACTIVE'                                  │
│    AND d.deleted_at IS NULL                                 │
│    AND d.expiry_date IS NOT NULL                           │
│    AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'  │
│    AND d.expiry_date >= CURRENT_DATE                        │
│    AND (d.company_id = :company_id OR :company_id IS NULL)  │
│    AND (d.site_id = :site_id OR :site_id IS NULL)          │
│  ORDER BY d.expiry_date ASC                                 │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Document, Check Reminder Schedule
┌─────────────────────────────────────────────────────────────┐
│  2a. Calculate days until expiry:                           │
│      days_until = expiry_date - CURRENT_DATE                │
│                                                             │
│  2b. Determine if reminder should be sent:                  │
│      - 90 days: Send if days_until = 90                     │
│      - 30 days: Send if days_until = 30                     │
│      - 7 days: Send if days_until = 7                       │
│                                                             │
│  2c. Check if reminder already sent:                        │
│      SELECT COUNT(*) FROM notifications                     │
│      WHERE entity_type = 'DOCUMENT'                         │
│        AND entity_id = :document_id                         │
│        AND alert_type = 'DEADLINE_ALERT'                    │
│        AND metadata->>'reminder_type' = 'PERMIT_RENEWAL'    │
│        AND metadata->>'reminder_days' = :days_until::TEXT   │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Renewal Reminder Notifications
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                                │
│    user_id, company_id, site_id,                           │
│    alert_type, severity, channel,                          │
│    title, message, entity_type, entity_id,                 │
│    action_url, metadata                                     │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    d.company_id,                                            │
│    d.site_id,                                               │
│    'DEADLINE_ALERT',                                        │
│    CASE WHEN :days_until <= 7 THEN 'CRITICAL'              │
│         WHEN :days_until <= 30 THEN 'WARNING'              │
│         ELSE 'INFO' END,                                    │
│    'EMAIL',                                                 │
│    :days_until || ' Days: ' || d.title || ' Renewal',      │
│    'Your ' || d.document_type || ' (' || d.permit_number   │
│      || ') expires on ' || d.expiry_date || '. Please '    │
│      || 'initiate renewal process.',                        │
│    'DOCUMENT',                                              │
│    d.id,                                                    │
│    '/documents/' || d.id,                                   │
│    jsonb_build_object(                                      │
│      'reminder_type', 'PERMIT_RENEWAL',                    │
│      'reminder_days', :days_until,                         │
│      'expiry_date', d.expiry_date                          │
│    )                                                        │
│  FROM documents d                                           │
│  JOIN user_roles ur ON ur.company_id = d.company_id        │
│    AND ur.role IN ('OWNER', 'ADMIN')                        │
│  JOIN users u ON u.id = ur.user_id                         │
│  WHERE d.id = :document_id                                  │
└─────────────────────────────────────────────────────────────┘
```

### Reminder Schedule

| Days Before Expiry | Severity | Recipients |
|--------------------|----------|------------|
| 90 days | INFO | Owner, Admin |
| 30 days | WARNING | Owner, Admin, assigned Staff |
| 7 days | CRITICAL | All users with document access |

### Error Handling

| Error Type | Action |
|------------|--------|
| Database error | Retry with exponential backoff |
| Notification creation failure | Log warning, continue |
| Invalid document data | Log error, skip document |

### Retry Logic

- Max 2 retries with exponential backoff (2s, 4s)

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`

### Health Monitoring

- Send heartbeat every 60 seconds

### Success Notification

- None (silent background job)

### Failure Notification

- Alert admin users: "Permit renewal reminder job failed"

---

## 6.2 Cross-Sell Trigger Detection Job

**Purpose:** Detects keywords in Module 1 documents that indicate potential need for Module 2 or Module 3.

**Reference:** PLS Section D.2 (Cross-Sell Trigger Detection)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `CROSS_SELL_TRIGGER_DETECTION` |
| Queue | `cross-sell-triggers` |
| Priority | LOW |
| Trigger | Cron: `0 */6 * * *` (every 6 hours) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface CrossSellTriggerJobInput {
  company_id?: UUID;    // Optional: Process specific company
  document_id?: UUID;   // Optional: Process specific document
  process_recent_only?: boolean; // Default: true - Only docs from last 24h
}
```

### Execution Steps

```
Step 1: Get Target Module Keywords
┌─────────────────────────────────────────────────────────────┐
│  SELECT id AS module_id, module_code, module_name,         │
│    cross_sell_keywords                                      │
│  FROM modules                                               │
│  WHERE is_active = true                                     │
│    AND cross_sell_keywords IS NOT NULL                      │
│    AND array_length(cross_sell_keywords, 1) > 0            │
│                                                             │
│  Example result:                                            │
│  Module 2: ['trade effluent', 'discharge consent',         │
│             'water company', 'sewer', 'effluent']          │
│  Module 3: ['generator', 'MCPD', 'standby power',          │
│             'CHP', 'combustion plant']                      │
└─────────────────────────────────────────────────────────────┘

Step 2: Query Documents to Scan
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.id, d.company_id, d.site_id,                     │
│    d.extracted_text, d.module_id                            │
│  FROM documents d                                           │
│  JOIN modules m ON m.id = d.module_id                       │
│  WHERE d.status = 'ACTIVE'                                  │
│    AND d.extraction_status = 'COMPLETED'                    │
│    AND d.extracted_text IS NOT NULL                         │
│    AND m.module_code = 'MODULE_1'                           │
│    AND (d.company_id = :company_id OR :company_id IS NULL)  │
│    AND (d.id = :document_id OR :document_id IS NULL)       │
│    AND (:process_recent_only = false OR                     │
│         d.updated_at >= NOW() - INTERVAL '24 hours')        │
│                                                             │
│  -- Exclude documents already processed for cross-sell     │
│  AND NOT EXISTS (                                           │
│    SELECT 1 FROM cross_sell_triggers cst                   │
│    WHERE cst.trigger_source = d.id::TEXT                   │
│      AND cst.trigger_type = 'keyword'                       │
│  )                                                          │
└─────────────────────────────────────────────────────────────┘

Step 3: Scan Documents for Keywords
┌─────────────────────────────────────────────────────────────┐
│  For each document:                                         │
│                                                             │
│  3a. Normalize text (lowercase, remove special chars):      │
│      normalized_text = normalize(extracted_text)            │
│                                                             │
│  3b. For each target module:                                │
│      - Scan for keywords in normalized_text                 │
│      - Build list of detected keywords                      │
│      - Calculate keyword density                            │
│                                                             │
│  3c. If keywords detected:                                  │
│      detected_keywords = ['trade effluent', 'sewer']        │
│      keyword_count = 2                                      │
│      confidence = min(keyword_count / 5, 1.0)               │
└─────────────────────────────────────────────────────────────┘

Step 4: Check Module Activation Status
┌─────────────────────────────────────────────────────────────┐
│  SELECT ma.id                                               │
│  FROM module_activations ma                                 │
│  WHERE ma.company_id = :company_id                          │
│    AND ma.module_id = :target_module_id                     │
│    AND ma.status = 'ACTIVE'                                 │
│                                                             │
│  If module already active, skip trigger creation            │
└─────────────────────────────────────────────────────────────┘

Step 5: Create Cross-Sell Trigger Records
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO cross_sell_triggers (                          │
│    company_id, target_module_id,                           │
│    trigger_type, trigger_source,                           │
│    detected_keywords, status                                │
│  )                                                          │
│  VALUES (                                                   │
│    :company_id, :target_module_id,                          │
│    'keyword', :document_id,                                 │
│    :detected_keywords, 'pending'                            │
│  )                                                          │
│  ON CONFLICT (company_id, target_module_id, trigger_source) │
│  DO NOTHING                                                 │
│  RETURNING id                                               │
└─────────────────────────────────────────────────────────────┘

Step 6: Create User Notification (Optional)
┌─────────────────────────────────────────────────────────────┐
│  If trigger created:                                        │
│                                                             │
│  INSERT INTO notifications (                                │
│    user_id, company_id, alert_type, severity, channel,     │
│    title, message, entity_type, entity_id, action_url      │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    :company_id,                                             │
│    'MODULE_ACTIVATION',                                     │
│    'INFO',                                                  │
│    'IN_APP',                                                │
│    'Module Suggestion: ' || m.module_name,                 │
│    'We detected references to ' || :detected_keywords[1]    │
│      || ' in your permit. Would you like to activate '     │
│      || m.module_name || '?',                               │
│    'CROSS_SELL_TRIGGER',                                    │
│    :trigger_id,                                             │
│    '/modules/activate/' || m.id                            │
│  FROM modules m                                             │
│  JOIN user_roles ur ON ur.company_id = :company_id         │
│    AND ur.role = 'OWNER'                                    │
│  JOIN users u ON u.id = ur.user_id                         │
│  WHERE m.id = :target_module_id                             │
└─────────────────────────────────────────────────────────────┘
```

### Keyword Detection Logic

```typescript
const MODULE_2_KEYWORDS = [
  'trade effluent',
  'discharge consent',
  'water company',
  'sewer',
  'effluent',
  'discharge to drain'
];

const MODULE_3_KEYWORDS = [
  'generator',
  'mcpd',
  'standby power',
  'chp',
  'combustion plant',
  'back-up generator'
];

function detectKeywords(
  text: string, 
  keywords: string[]
): string[] {
  const normalizedText = text.toLowerCase();
  return keywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );
}
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Database error | Retry with exponential backoff |
| Text processing error | Log error, skip document |
| Module lookup failure | Log error, continue |

### Retry Logic

- Max 2 retries with exponential backoff (2s, 4s)

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`

### Health Monitoring

- Send heartbeat every 60 seconds
- Log progress: `Scanned {n}/{total} documents, {triggers} triggers created`

### Success Notification

- None (silent background job)

### Failure Notification

- Alert admin users (low priority)

---

## 6.3 Audit Pack Generation Job

> [v1 UPDATE – Pack Type Support – 2024-12-27]

**Purpose:** Compiles evidence into PDF packs (all pack types: Audit, Regulator, Tender, Board, Insurer) with reference integrity validation.

**Reference:** PLS Section B.8.3 (Reference Integrity Validation), Section I.8 (v1.0 Pack Types — Generation Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AUDIT_PACK_GENERATION` |
| Queue | `audit-pack-generation` |
| Priority | NORMAL |
| Trigger | API endpoint: `POST /api/v1/audit-packs/generate` |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface AuditPackGenerationJobInput {
  pack_type: 'AUDIT_PACK' | 'REGULATOR_INSPECTION' | 'TENDER_CLIENT_ASSURANCE' | 'BOARD_MULTI_SITE_RISK' | 'INSURER_BROKER'; // Required: Pack type
  company_id: UUID;            // Required: Always required
  document_id?: UUID;           // Optional: Target document (required for most pack types, not Board Pack)
  site_id?: UUID;              // Required for all packs except BOARD_MULTI_SITE_RISK (must be null for Board Pack)
  date_range_start: Date;      // Required: Compliance period start
  date_range_end: Date;        // Required: Compliance period end
  filters_applied?: {          // Optional: Filtering options
    obligation_statuses?: string[];
    categories?: string[];
    include_overdue_only?: boolean;
  };
  include_evidence_files?: boolean; // Default: true
  output_format?: 'PDF' | 'ZIP';    // Default: 'PDF'
  recipient_type?: 'REGULATOR' | 'CLIENT' | 'BOARD' | 'INSURER' | 'INTERNAL'; // Optional: Pack recipient type
  recipient_name?: string;     // Optional: Recipient name
  purpose?: string;            // Optional: Pack purpose
  requested_by: UUID;          // Required: User requesting generation
}

**Validation Function:**
```typescript
function validatePackGenerationInput(input: AuditPackGenerationJobInput): void {
  if (input.pack_type === 'BOARD_MULTI_SITE_RISK') {
    if (input.site_id !== null && input.site_id !== undefined) {
      throw new ValidationError('Board Pack must have site_id = null');
    }
    if (!input.company_id) {
      throw new ValidationError('Board Pack requires company_id');
    }
    // Role validation: Board Pack requires Owner/Admin (validated at API level, re-check here)
  } else {
    if (!input.site_id) {
      throw new ValidationError(`${input.pack_type} requires site_id`);
    }
    if (!input.company_id) {
      throw new ValidationError(`${input.pack_type} requires company_id`);
    }
  }
}
```

### Execution Steps

```
Step 1: Load Document and Validate Access
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.*, s.name AS site_name, c.name AS company_name   │
│  FROM documents d                                           │
│  JOIN sites s ON s.id = d.site_id                          │
│  JOIN companies c ON c.id = d.company_id                   │
│  WHERE d.id = :document_id                                  │
│    AND d.company_id = :company_id                           │
│    AND d.site_id = :site_id                                 │
│    AND d.deleted_at IS NULL                                 │
│                                                             │
│  If not found, fail with: "Document not found or           │
│    access denied"                                           │
└─────────────────────────────────────────────────────────────┘

Step 2: Query Obligations Within Date Range
┌─────────────────────────────────────────────────────────────┐
│  SELECT o.*, dl.due_date, dl.status AS deadline_status     │
│  FROM obligations o                                         │
│  LEFT JOIN deadlines dl ON dl.obligation_id = o.id         │
│  WHERE o.document_id = :document_id                         │
│    AND o.deleted_at IS NULL                                 │
│    AND (dl.due_date BETWEEN :date_range_start              │
│         AND :date_range_end                                 │
│         OR dl.due_date IS NULL)                             │
│    AND (:status_filter IS NULL OR                           │
│         o.status = ANY(:status_filter))                     │
│    AND (:category_filter IS NULL OR                         │
│         o.category = ANY(:category_filter))                 │
│  ORDER BY o.condition_reference, dl.due_date               │
└─────────────────────────────────────────────────────────────┘

Step 3: For Each Obligation, Gather Evidence
┌─────────────────────────────────────────────────────────────┐
│  SELECT e.*, oel.linked_at, oel.linked_by                  │
│  FROM evidence_items e                                      │
│  JOIN obligation_evidence_links oel ON oel.evidence_id = e.id│
│  WHERE oel.obligation_id = :obligation_id                   │
│    AND oel.unlinked_at IS NULL                              │
│    AND e.deleted_at IS NULL                                 │
│  ORDER BY e.upload_date DESC                                │
└─────────────────────────────────────────────────────────────┘

Step 4: Validate Evidence Reference Integrity
┌─────────────────────────────────────────────────────────────┐
│  For each evidence item:                                    │
│                                                             │
│  4a. Check file exists in storage:                          │
│      file_exists = await storage.fileExists(e.storage_path) │
│                                                             │
│  4b. Verify file metadata matches database:                 │
│      storage_metadata = await storage.getMetadata(          │
│        e.storage_path)                                      │
│      metadata_match = (                                     │
│        storage_metadata.size === e.file_size_bytes AND     │
│        storage_metadata.contentType === e.mime_type         │
│      )                                                      │
│                                                             │
│  4c. Verify file hash (if stored):                          │
│      if (e.file_hash) {                                     │
│        file_content = await storage.download(e.storage_path)│
│        computed_hash = sha256(file_content)                 │
│        hash_match = (computed_hash === e.file_hash)         │
│      }                                                      │
│                                                             │
│  4d. Record integrity status:                               │
│      integrity_results.push({                               │
│        evidence_id: e.id,                                   │
│        file_exists: file_exists,                            │
│        metadata_valid: metadata_match,                      │
│        hash_valid: hash_match,                              │
│        status: file_exists && metadata_match ? 'VALID' :   │
│                'INTEGRITY_ERROR'                            │
│      })                                                     │
└─────────────────────────────────────────────────────────────┘

Step 5: Compile Pack Content (Pack Type-Specific)
┌─────────────────────────────────────────────────────────────┐
│  Build pack structure based on pack_type:                  │
│                                                             │
│  IF pack_type = 'REGULATOR_INSPECTION':                    │
│    5a. Cover page (inspector-ready)                        │
│    5b. Executive summary (compliance status)                │
│    5c. Permit summary                                       │
│    5d. Compliance dashboard                                 │
│    5e. Obligation matrix (all obligations)                 │
│    5f. Gap analysis (prioritized)                           │
│    5g. Evidence appendix (full files)                       │
│                                                             │
│  IF pack_type = 'TENDER_CLIENT_ASSURANCE':                 │
│    5a. Cover page (client-facing)                          │
│    5b. Compliance overview (summary)                        │
│    5c. Evidence samples (representative)                    │
│    5d. Risk assessment                                      │
│    5e. Action plan (remediation)                            │
│                                                             │
│  IF pack_type = 'BOARD_MULTI_SITE_RISK':                  │
│    5a. Executive summary (multi-site)                      │
│    5b. Risk dashboard (aggregated)                          │
│    5c. Site-by-site compliance matrix                       │
│    5d. Trend analysis                                       │
│    5e. Key metrics                                          │
│    5f. Risk prioritization                                  │
│    5g. Action items (board-level)                           │
│                                                             │
│  IF pack_type = 'INSURER_BROKER':                          │
│    5a. Risk narrative                                       │
│    5b. Compliance controls summary                         │
│    5c. Evidence overview (not full files)                  │
│    5d. Gap analysis (risk-focused)                          │
│    5e. Compliance certification                             │
│                                                             │
│  IF pack_type = 'AUDIT_PACK':                             │
│    5a. Cover page                                           │
│    5b. Summary section                                       │
│    5c. Compliance matrix                                     │
│    5d. Obligation details                                    │
│    5e. Evidence appendix (full files)                       │
└─────────────────────────────────────────────────────────────┘

Step 6: Generate PDF
┌─────────────────────────────────────────────────────────────┐
│  6a. Render PDF using template:                             │
│      pdf = await generatePDF(auditPackContent, template)    │
│                                                             │
│  6b. Add integrity warnings if any failures:                │
│      if (integrity_errors.length > 0) {                     │
│        addIntegrityWarningPage(pdf, integrity_errors)       │
│      }                                                      │
│                                                             │
│  6c. Add page numbers and footer:                           │
│      addPageNumbers(pdf)                                    │
│      addFooter(pdf, "Generated: {date}")                    │
└─────────────────────────────────────────────────────────────┘

Step 7: Store PDF and Create Database Record
┌─────────────────────────────────────────────────────────────┐
│  7a. Upload to Supabase Storage:                            │
│      storage_path = `audit-packs/${company_id}/${site_id}/  │
│        ${audit_pack_id}/audit-pack-${timestamp}.pdf`        │
│      await storage.upload(storage_path, pdf)                │
│                                                             │
│  7b. Create audit_packs record:                             │
│      INSERT INTO audit_packs (                              │
│        document_id, site_id, company_id,                   │
│        pack_type, recipient_type, recipient_name, purpose,│
│        date_range_start, date_range_end,                   │
│        filters_applied, storage_path,                      │
│        total_obligations, complete_count, pending_count,   │
│        overdue_count, evidence_count,                      │
│        integrity_errors_count, generation_time_ms,         │
│        generated_by                                         │
│      )                                                      │
│      VALUES (...)                                           │
│      RETURNING id                                           │
│                                                             │
│  7c. Log generation in audit_logs:                          │
│      INSERT INTO audit_logs (                               │
│        company_id, user_id, action_type,                   │
│        entity_type, entity_id, new_values                  │
│      )                                                      │
│      VALUES (                                               │
│        :company_id, :requested_by,                          │
│        'AUDIT_PACK_GENERATED', 'AUDIT_PACK',               │
│        :audit_pack_id, :generation_metadata                 │
│      )                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Audit Pack Output Structure

```typescript
interface AuditPackContent {
  metadata: {
    company_name: string;
    site_name: string;
    document_title: string;
    permit_number: string;
    date_range: { start: Date; end: Date };
    generated_at: Date;
    generated_by: string;
  };
  summary: {
    total_obligations: number;
    complete_count: number;
    pending_count: number;
    overdue_count: number;
    evidence_count: number;
    integrity_errors_count: number;
  };
  obligations: Array<{
    id: UUID;
    reference: string;
    summary: string;
    original_text: string;
    category: string;
    frequency: string;
    status: string;
    deadlines: Array<{
      due_date: Date;
      status: string;
    }>;
    evidence: Array<{
      id: UUID;
      file_name: string;
      file_type: string;
      upload_date: Date;
      integrity_status: string;
    }>;
  }>;
  integrity_report?: {
    total_checked: number;
    valid_count: number;
    error_count: number;
    errors: Array<{
      evidence_id: UUID;
      file_name: string;
      error_type: string;
    }>;
  };
}
```

### Error Handling

| Error Type | Action |
|------------|--------|
| Document not found | Fail immediately (no retry) |
| Missing evidence files | Log warning, continue, flag in report |
| Reference integrity failure | Log error, flag in audit pack metadata |
| PDF generation failure | Retry once, then fail |
| Storage upload error | Retry with exponential backoff |
| Database error | Retry with exponential backoff |

### Retry Logic

- Max 2 retries for transient errors
- No retry for reference integrity failures (log only)
- PDF generation: retry once before failing

### DLQ Rules

- Move to DLQ if `retry_count >= 2 AND status = 'FAILED'`
- DLQ record includes: document_id, obligations processed, error context

### Health Monitoring

- Send heartbeat every 60 seconds
- Log progress: `Processing obligation {n}/{total}, evidence {m}/{total}`

### Success Notification

```typescript
{
  alert_type: 'SYSTEM',
  severity: 'INFO',
  title: 'Audit Pack Generated Successfully',
  message: `Your audit pack for ${document.title} (${dateRange}) is ready.`,
  action_url: `/audit-packs/${audit_pack_id}/download`,
  entity_type: 'AUDIT_PACK',
  entity_id: audit_pack_id
}
```

### Failure Notification

```typescript
{
  alert_type: 'SYSTEM',
  severity: 'ERROR',
  title: 'Pack Generation Failed',
  message: `Failed to generate ${pack_type} pack. Error: ${error_message}`,
  entity_type: 'AUDIT_PACK',
  entity_id: job_id
}
```

**Pack Type-Specific Error Messages:**
- **Board Pack:** "Board Pack generation failed: {error_message}. Ensure company_id is provided and site_id is null."
- **Other Packs:** "Pack generation failed: {error_message}. Ensure site_id is provided."

---



---

> [v1 UPDATE – Pack Distribution Job – 2024-12-27]

## 6.4 Pack Distribution Job

**Purpose:** Distributes generated packs via email or shared link

**Reference:** Product Logic Specification Section I.8.7 (Pack Distribution Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `PACK_DISTRIBUTION` |
| Queue | `pack-distribution` |
| Priority | NORMAL |
| Trigger | API endpoint: `POST /api/v1/packs/{packId}/distribute` |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 |

### Input Parameters

```typescript
interface PackDistributionJobInput {
  pack_id: UUID;               // Required: Pack to distribute
  distribution_method: 'EMAIL' | 'SHARED_LINK'; // Required: Distribution method
  recipients?: Array<{          // Required for EMAIL
    email: string;
    name?: string;
  }>;
  message?: string;            // Optional: Email message
  expires_in_days?: number;   // Optional: Link expiration (default: 30)
  requested_by: UUID;          // Required: User requesting distribution
}
```

### Execution Steps

**For EMAIL Distribution:**
1. Load pack from `audit_packs` table
2. Download PDF from storage
3. Send email with PDF attachment to recipients
4. Create `pack_distributions` record
5. Send notification to requester

**For SHARED_LINK Distribution:**
1. Load pack from `audit_packs` table
2. Generate unique token (`shared_link_token`)
3. Set expiration (`shared_link_expires_at`)
4. Update `audit_packs` record with token and expiration
5. Create `pack_distributions` record
6. Send email with shareable link to recipients (if provided)
7. Send notification to requester

### Error Handling

| Error Type | Action |
|------------|--------|
| Pack not found | Fail immediately (no retry) |
| Email send failure | Retry with exponential backoff |
| Storage access error | Retry with exponential backoff |
| Token generation collision | Retry with new token |

### Retry Logic

- Max 2 retries for transient errors
- Email failures: retry with exponential backoff (2s, 4s)

---

> [v1 UPDATE – Consultant Client Sync Job – 2024-12-27]

## 6.5 Consultant Client Sync Job

**Purpose:** Syncs consultant client assignments and updates consultant dashboard data

**Reference:** Product Logic Specification Section C.5.3 (Consultant Dashboard Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `CONSULTANT_CLIENT_SYNC` |
| Queue | `consultant-sync` |
| Priority | LOW |
| Trigger | Scheduled (daily at 2 AM), Manual trigger |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 1 |

### Input Parameters

```typescript
interface ConsultantClientSyncJobInput {
  consultant_id?: UUID;        // Optional: Specific consultant (if null, sync all)
  sync_type: 'ASSIGNMENTS' | 'DASHBOARD' | 'FULL'; // Required: Sync scope
}
```

### Execution Steps

**For ASSIGNMENTS Sync:**
1. Query `consultant_client_assignments` for consultant
2. Validate assignments (check client companies exist, consultant role valid)
3. Update assignment status if needed
4. Log sync results

**For DASHBOARD Sync:**
1. For each assigned client:
   - Aggregate compliance metrics
   - Calculate compliance scores
   - Identify upcoming deadlines
   - Collect recent activity
2. Cache dashboard data (optional)
3. Update consultant dashboard view

**For FULL Sync:**
1. Run ASSIGNMENTS sync
2. Run DASHBOARD sync
3. Send summary notification to consultant

### Error Handling

| Error Type | Action |
|------------|--------|
| Consultant not found | Skip consultant, continue |
| Client company deleted | Mark assignment as INACTIVE |
| Sync timeout | Log warning, continue with next consultant |

### Retry Logic

- Max 1 retry for transient errors
- Individual consultant failures don't block other consultants

---

# 8. Integration Points

## 8.1 Database Integration

**Reference:** Technical Architecture Section 2.4 (Integration Points)

### Connection Strategy

All background jobs connect to Supabase PostgreSQL via the connection pooler URL to ensure efficient connection management.

```typescript
// Database connection for background jobs
const dbConfig = {
  connectionString: process.env.SUPABASE_CONNECTION_POOLER_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,  // Max connections per worker
  idleTimeoutMillis: 30000
};
```

### RLS Handling

| Scenario | Strategy |
|----------|----------|
| User-initiated jobs | Use user's JWT for RLS context |
| System jobs (cron) | Use service role key (bypass RLS) |
| Cross-company jobs | Use service role key with explicit company_id filtering |

### Transaction Management

```typescript
// All job database operations use transactions
async function executeWithTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 8.2 Notification Integration

**Reference:** Technical Architecture Section 2.4 (Notification Triggering)

### Notification Creation Flow

```
Background Job
      │
      ▼
┌─────────────────┐
│ Create Record   │
│ in notifications│
│ table           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │
│ Service (2.4)   │
│ processes       │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Email │ │ SMS   │
└───────┘ └───────┘
```

### Notification Record Structure

```sql
INSERT INTO notifications (
  user_id,
  company_id,
  site_id,
  alert_type,
  severity,
  channel,
  title,
  message,
  entity_type,
  entity_id,
  action_url,
  metadata
)
VALUES (
  :user_id,
  :company_id,
  :site_id,
  :alert_type,        -- 'DEADLINE_ALERT', 'EVIDENCE_REMINDER', 'BREACH', etc.
  :severity,          -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
  :channel,           -- 'EMAIL', 'SMS', 'IN_APP', 'PUSH'
  :title,
  :message,
  :entity_type,       -- 'OBLIGATION', 'DOCUMENT', 'GENERATOR', etc.
  :entity_id,
  :action_url,
  :metadata::JSONB
);
```

## 8.3 AI Service Integration

**Reference:** Technical Architecture Section 5 (AI Service Integration)

### Document Processing AI Flow

```
Document Processing Job
         │
         ▼
┌─────────────────────┐
│ AI Integration      │
│ Layer (2.10)        │
│                     │
│ - Check rules lib   │
│ - Call OpenAI API   │
│ - Handle retries    │
│ - Parse results     │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Return Extraction   │
│ Results             │
│                     │
│ - obligations[]     │
│ - confidence_scores │
│ - metadata          │
└─────────────────────┘
```

### AI Service Call Pattern

```typescript
interface AIExtractionRequest {
  document_id: UUID;
  document_text: string;
  document_type: string;
  module_id: UUID;
  extraction_parameters: {
    check_rules_library: boolean;
    confidence_threshold: number;
    max_obligations: number;
  };
}

interface AIExtractionResponse {
  obligations: Array<{
    text: string;
    category: string;
    frequency: string | null;
    confidence_score: number;
    is_subjective: boolean;
    subjective_phrases: string[];
  }>;
  rules_library_matches: number;
  ai_extractions: number;
  processing_time_ms: number;
}
```

## 8.4 Storage Integration

**Reference:** Technical Architecture Section 1.5 (Storage)

### Storage Bucket Structure

```
Supabase Storage
├── documents/
│   └── {company_id}/{site_id}/{document_id}/
│       ├── original.pdf
│       └── extracted_text.txt
│
├── evidence/
│   └── {company_id}/{site_id}/{evidence_id}/
│       └── {uuid}.{ext}
│
├── audit-packs/
│   └── {company_id}/{site_id}/{audit_pack_id}/
│       └── audit-pack-{timestamp}.pdf
│
└── aer-documents/
    └── {company_id}/{document_id}/{aer_id}/
        ├── aer-{year}.pdf
        └── aer-{year}-data.csv
```

### Storage Operations

```typescript
// Upload file to storage
async function uploadToStorage(
  bucket: string,
  path: string,
  content: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, content, { contentType });
  
  if (error) throw error;
  return data.path;
}

// Download file from storage
async function downloadFromStorage(
  bucket: string,
  path: string
): Promise<Buffer> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);
  
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

// Check file existence
async function fileExists(
  bucket: string,
  path: string
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.substring(0, path.lastIndexOf('/')));
  
  if (error) return false;
  const fileName = path.substring(path.lastIndexOf('/') + 1);
  return data.some(file => file.name === fileName);
}
```

## 8.5 Real-Time Integration

**Reference:** Technical Architecture Section 1.6 (Real-time Features)

### Job Status Broadcasting

When job status changes, broadcast to subscribed clients:

```typescript
// Broadcast job status update
async function broadcastJobStatus(
  jobId: UUID,
  status: JobStatus,
  progress?: { current: number; total: number }
): Promise<void> {
  await supabase
    .channel(`job:${jobId}`)
    .send({
      type: 'broadcast',
      event: 'job_status',
      payload: {
        job_id: jobId,
        status,
        progress,
        updated_at: new Date().toISOString()
      }
    });
}
```

### Client Subscription

```typescript
// Client subscribes to job updates
const channel = supabase
  .channel(`job:${jobId}`)
  .on('broadcast', { event: 'job_status' }, (payload) => {
    updateJobStatusUI(payload);
  })
  .subscribe();
```

---

# 9. Error Handling & Logging

## 9.1 Structured Logging

**Reference:** Technical Architecture Section 2.4 (Error Handling and Logging)

### Log Format

All job operations use structured JSON logging:

```typescript
interface JobLogEntry {
  timestamp: string;      // ISO 8601 format
  level: 'debug' | 'info' | 'warn' | 'error';
  job_id: UUID;
  job_type: string;
  company_id?: UUID;
  site_id?: UUID;
  message: string;
  context?: Record<string, any>;
  error_details?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration_ms?: number;
}
```

### Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Detailed execution flow (disabled in production) |
| `info` | Normal operation milestones |
| `warn` | Non-fatal issues, recoverable errors |
| `error` | Fatal errors, job failures |

### Logging Implementation

```typescript
function logJobOperation(entry: JobLogEntry): void {
  const logLine = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString()
  });
  
  switch (entry.level) {
    case 'error':
      console.error(logLine);
      break;
    case 'warn':
      console.warn(logLine);
      break;
    default:
      console.log(logLine);
  }
}

// Usage example
logJobOperation({
  level: 'info',
  job_id: jobId,
  job_type: 'MONITORING_SCHEDULE',
  company_id: companyId,
  message: 'Processing obligations',
  context: { total_obligations: 45, processed: 20 }
});
```

## 9.2 Error Logging

### Audit Log Error Records

All errors are logged to the `audit_logs` table with full context:

```sql
INSERT INTO audit_logs (
  company_id,
  user_id,
  action_type,
  entity_type,
  entity_id,
  previous_values,
  new_values
)
VALUES (
  :company_id,
  NULL,                              -- NULL for system jobs
  'JOB_ERROR',
  'BACKGROUND_JOB',
  :job_id,
  :input_parameters::JSONB,          -- Job input for debugging
  jsonb_build_object(
    'error_name', :error_name,
    'error_message', :error_message,
    'error_stack', :error_stack,
    'retry_count', :retry_count,
    'job_type', :job_type,
    'context', :error_context
  )
);
```

### Error Context Capture

```typescript
interface ErrorContext {
  job_id: UUID;
  job_type: string;
  input_parameters: Record<string, any>;
  execution_step: string;
  partial_results?: any;
  error: {
    name: string;
    message: string;
    stack: string;
    code?: string;
  };
  retry_count: number;
  timestamp: string;
}

async function captureJobError(
  job: BackgroundJob,
  error: Error,
  context: Partial<ErrorContext>
): Promise<void> {
  const errorContext: ErrorContext = {
    job_id: job.id,
    job_type: job.job_type,
    input_parameters: job.payload,
    execution_step: context.execution_step || 'unknown',
    partial_results: context.partial_results,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack || '',
      code: (error as any).code
    },
    retry_count: job.retry_count,
    timestamp: new Date().toISOString()
  };
  
  // Update job record
  await db.query(`
    UPDATE background_jobs
    SET error_message = $1,
        error_stack = $2,
        status = $3,
        updated_at = NOW()
    WHERE id = $4
  `, [error.message, error.stack, 'FAILED', job.id]);
  
  // Log to audit_logs
  await logToAuditLogs(errorContext);
}
```

## 9.3 Alerting

### Critical Job Failure Alerts

When a job fails permanently (moves to DLQ), alert admin users:

```typescript
async function alertJobFailure(
  job: BackgroundJob,
  error: Error
): Promise<void> {
  // Get admin users for company
  const admins = await db.query(`
    SELECT u.id, u.email
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.company_id = $1
      AND ur.role IN ('OWNER', 'ADMIN')
  `, [job.payload.company_id]);
  
  // Create notifications for each admin
  for (const admin of admins.rows) {
    await db.query(`
      INSERT INTO notifications (
        user_id, company_id, alert_type, severity,
        channel, title, message, entity_type, entity_id
      )
      VALUES ($1, $2, 'SYSTEM', 'ERROR', 'EMAIL',
        $3, $4, 'BACKGROUND_JOB', $5)
    `, [
      admin.id,
      job.payload.company_id,
      `Background Job Failed: ${job.job_type}`,
      `The ${job.job_type} job failed after ${job.retry_count} retries. ` +
        `Error: ${error.message}. Please check the admin dashboard for details.`,
      job.id
    ]);
  }
}
```

### Alert Severity Mapping

| Job Type | Failure Severity | Alert Recipients |
|----------|------------------|------------------|
| DOCUMENT_PROCESSING | WARNING | User who uploaded |
| MONITORING_SCHEDULE | ERROR | Admin users |
| DEADLINE_ALERT | CRITICAL | Admin users |
| EVIDENCE_REMINDER | WARNING | Admin users |
| SAMPLING_SCHEDULE | ERROR | Admin users |
| RUN_HOUR_MONITORING | ERROR | Admin users |
| AER_GENERATION | ERROR | User who requested |
| PERMIT_RENEWAL_REMINDER | WARNING | Admin users |
| CROSS_SELL_TRIGGER | INFO | None (low priority) |
| AUDIT_PACK_GENERATION | ERROR | User who requested |

## 9.4 Monitoring

### Job Metrics

Track job performance metrics for monitoring dashboards:

```typescript
interface JobMetrics {
  job_type: string;
  period: 'hour' | 'day' | 'week';
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  success_rate: number;
  average_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  dlq_count: number;
}

// Query for metrics
const metricsQuery = `
  SELECT 
    job_type,
    COUNT(*) AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS successful_jobs,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_jobs,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'COMPLETED')::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 2
    ) AS success_rate,
    AVG(
      EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
    ) FILTER (WHERE status = 'COMPLETED') AS average_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
    ) FILTER (WHERE status = 'COMPLETED') AS p95_duration_ms
  FROM background_jobs
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY job_type
`;
```

### Health Check Endpoint

```typescript
// Job system health check
async function getJobSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: Record<string, any>;
}> {
  const [staleJobs, dlqCount, recentFailures] = await Promise.all([
    db.query(`
      SELECT COUNT(*) FROM background_jobs
      WHERE health_status = 'STALE'
        AND status = 'RUNNING'
    `),
    db.query(`
      SELECT COUNT(*) FROM dead_letter_queue
      WHERE resolved_at IS NULL
    `),
    db.query(`
      SELECT COUNT(*) FROM background_jobs
      WHERE status = 'FAILED'
        AND created_at >= NOW() - INTERVAL '1 hour'
    `)
  ]);
  
  const staleCount = parseInt(staleJobs.rows[0].count);
  const unresolvedDlq = parseInt(dlqCount.rows[0].count);
  const recentFailCount = parseInt(recentFailures.rows[0].count);
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (staleCount > 10 || unresolvedDlq > 50) {
    status = 'unhealthy';
  } else if (staleCount > 0 || unresolvedDlq > 10 || recentFailCount > 20) {
    status = 'degraded';
  }
  
  return {
    status,
    details: {
      stale_jobs: staleCount,
      unresolved_dlq: unresolvedDlq,
      recent_failures: recentFailCount,
      timestamp: new Date().toISOString()
    }
  };
}
```

---



---

# Summary

This complete specification defines all 10 background job types for the Oblicore platform:

## Complete Job Type Registry

| # | Job Type | Section | Description |
|---|----------|---------|-------------|
| 1 | Monitoring Schedule | Section 2.1 | Recurring obligation checks, deadline calculations |
| 2 | Deadline Alert | Section 2.2 | 7/3/1 day warnings for upcoming deadlines |
| 3 | Evidence Reminder | Section 2.3 | Notifications for obligations requiring evidence |
| 4 | Document Processing | Section 3.1 | PDF upload → OCR → text extraction → LLM parsing |
| 5 | Sampling Schedule (Module 2) | Section 4.1 | Daily/weekly/monthly triggers for lab sampling |
| 6 | Run-Hour Monitoring (Module 3) | Section 5.1 | 80%/90%/100% threshold checks |
| 7 | AER Generation | Section 5.2 | Annual return compilation and generation |
| 8 | Permit Renewal Reminder | Section 6.1 | Notifications for approaching permit renewals |
| 9 | Cross-Sell Trigger Detection | Section 6.2 | Keyword-based module suggestions |
| 10 | Audit Pack Generation | Section 6.3 | Evidence compilation into inspector-ready PDFs |

## Document Structure

This specification is organized into 9 main sections:

1. **Document Overview & Framework** - Job execution framework, queue structure, worker architecture
2. **Core Monitoring Jobs** - Monitoring Schedule, Deadline Alert, Evidence Reminder
3. **Document Processing Jobs** - Complete PDF processing pipeline
4. **Module 2 Jobs (Trade Effluent)** - Sampling Schedule
5. **Module 3 Jobs (MCPD/Generators)** - Run-Hour Monitoring, AER Generation
6. **System Jobs** - Permit Renewal Reminder, Cross-Sell Trigger Detection, Audit Pack Generation
7. **Job Infrastructure Details** - Retry strategy, DLQ rules, health monitoring, status transitions
8. **Integration Points** - Database, notifications, AI service, storage, real-time integration
9. **Error Handling & Logging** - Structured logging, error capture, alerting, monitoring

---

**Document Status:** Complete  
**Last Updated:** 2025-01-01  
**Version:** 1.0
