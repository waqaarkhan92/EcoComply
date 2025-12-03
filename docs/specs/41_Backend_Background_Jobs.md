# EcoComply Background Jobs Specification

**EcoComply v1.0 — Launch-Ready / Last updated: 2025-12-01**

**Document Version:** 1.4
**Status:** Complete - Updated to Match Production Implementation
**Created by:** Claude
**Depends on:**
- ✅ Product Logic Specification (1.1) - Complete
- ✅ Database Schema (2.2 → 1.6) - Complete
- ✅ Technical Architecture (2.1) - Complete
- ✅ Backend API Specification (1.6) - Complete

**Purpose:** Defines all background job types, their triggers, execution logic, error handling, retry mechanisms, and integration points for the EcoComply platform.

> [v1.4 UPDATE – Added 6 Missing Production Jobs – 2025-02-03]
> - Added Evidence Expiry Tracking Job
> - Added Recurring Task Generation Job
> - Added Report Generation Job
> - Added Notification Delivery Job
> - Added Digest Delivery Job
> - Added Evidence Retention Job
> [v1.3 UPDATE – Added 12 New Jobs for Database Schema v1.3 Features – 2025-12-01]



---

# Table of Contents

1. [Document Overview & Framework](#1-document-overview--framework)
2. [Core Monitoring Jobs](#2-core-monitoring-jobs)
3. [Document Processing Jobs](#3-document-processing-jobs)
4. [Module 2 Jobs (Trade Effluent)](#4-module-2-jobs-trade-effluent)
5. [Module 3 Jobs (MCPD/Generators)](#5-module-3-jobs-mcpdgenerators)
6. [System Jobs](#6-system-jobs)
7. [Universal Compliance Clock Jobs](#7-universal-compliance-clock-jobs)
8. [Escalation Workflow Jobs](#8-escalation-workflow-jobs)
9. [Permit Workflow Jobs](#9-permit-workflow-jobs)
10. [Corrective Action Jobs](#10-corrective-action-jobs)
11. [Validation Jobs (Module 4)](#11-validation-jobs-module-4)
12. [Runtime Monitoring Jobs (Module 3)](#12-runtime-monitoring-jobs-module-3)
13. [SLA Timer Jobs](#13-sla-timer-jobs)
14. [Trigger Execution Jobs](#14-trigger-execution-jobs)
15. [Job Infrastructure Details](#15-job-infrastructure-details)
16. [Integration Points](#16-integration-points)
17. [Error Handling & Logging](#17-error-handling--logging)

---

# 1. Document Overview & Framework

## 1.1 Job Execution Framework

**Reference:** Technical Architecture Section 2.1

### Selected Framework: BullMQ with Redis

The EcoComply platform uses BullMQ with Redis for all background job processing. This framework was selected for:

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
│  ├── evidence-reminders                                     │
│  ├── escalation-processing                                  │
│  └── sla-breach-alerts                                      │
│                                                             │
│  NORMAL PRIORITY                                            │
│  ├── document-processing                                    │
│  ├── monitoring-schedule                                    │
│  ├── compliance-clocks                                      │
│  ├── permit-workflows                                       │
│  ├── corrective-actions                                     │
│  ├── validation-processing                                  │
│  ├── trigger-execution                                      │
│  ├── runtime-monitoring                                     │
│  ├── module-2-sampling                                      │
│  ├── module-3-run-hours                                     │
│  ├── aer-generation                                         │
│  └── audit-pack-generation                                  │
│                                                             │
│  LOW PRIORITY                                               │
│  ├── cross-sell-triggers                                    │
│  └── dashboard-refresh                                      │
└─────────────────────────────────────────────────────────────┘
```

### Worker Architecture

| Parameter | Value | Notes |
|-----------|-------|-------|
| Concurrency per worker | 5 | Default, configurable |
| Concurrent jobs per queue | 10 | Maximum |
| Global concurrent jobs | 50 | Across all queues |
| Worker deployment | Separate worker service (Railway/Render/Fly.io) | See Technical Architecture Section 1.4 for deployment strategy |

---

## 1.2 Job Types Overview

The EcoComply platform defines **32 job types** across multiple categories:

### Complete Job Type Registry

| # | Job Type | Queue | Priority | Trigger | Description |
|---|----------|-------|----------|---------|-------------|
| **Core Monitoring (Sections 2-6)** |
| 1 | Monitoring Schedule | `monitoring-schedule` | NORMAL | Cron (hourly) | Recurring obligation checks, deadline calculations |
| 2 | Deadline Alert | `deadline-alerts` | HIGH | Cron (6-hourly) | 7/3/1 day warnings for upcoming deadlines |
| 3 | Evidence Reminder | `evidence-reminders` | HIGH | Cron (daily) | Notifications for obligations requiring evidence |
| 4 | Document Processing | `document-processing` | NORMAL | API trigger | PDF upload → text extraction (pdf-parse) → OCR (if needed) → LLM parsing |
| 5 | Excel Import Processing | `document-processing` | NORMAL | API trigger | Excel upload → validation → preview → bulk obligation creation |
| 6 | Module 2: Sampling Schedule | `module-2-sampling` | NORMAL | Cron (daily) | Daily/weekly/monthly triggers for lab sampling |
| 7 | Module 3: Run-Hour Monitoring | `module-3-run-hours` | NORMAL | Cron (daily) | 80%/90%/100% threshold checks |
| 8 | AER Generation | `aer-generation` | NORMAL | API trigger / Cron (annual) | Annual return compilation and generation |
| 9 | Permit Renewal Reminder | `deadline-alerts` | NORMAL | Cron (daily) | Notifications for approaching permit renewals |
| 10 | Cross-Sell Trigger Detection | `cross-sell-triggers` | LOW | Cron (6-hourly) | Effluent keyword detection, run-hour breach detection |
| 11 | Audit Pack Generation | `audit-pack-generation` | NORMAL | API trigger | Evidence compilation into PDFs (all pack types) |
| 12 | Pack Distribution | `pack-distribution` | NORMAL | API trigger | Distribute packs via email/shared link |
| 13 | Consultant Client Sync | `consultant-sync` | LOW | Scheduled/Manual | Sync consultant assignments and dashboard |
| **v1.3 Database Schema Features (Sections 7-14)** |
| 14 | Update Compliance Clocks | `compliance-clocks` | NORMAL | Cron (daily 00:01) | Recalculate days_remaining and criticality for all clocks |
| 15 | Refresh Compliance Dashboard | `dashboard-refresh` | LOW | Cron (every 15min) | Refresh materialized view for dashboard |
| 16 | Process Escalations | `escalation-processing` | HIGH | Cron (daily 00:30) | Auto-escalate overdue obligations |
| 17 | Auto-Create Renewal Workflows | `permit-workflows` | NORMAL | Cron (daily 01:00) | Create renewal workflows 90 days before expiry |
| 18 | Check Regulator Response Deadlines | `permit-workflows` | NORMAL | Cron (daily 09:00) | Alert on overdue regulator responses |
| 19 | Monitor Corrective Action Items | `corrective-actions` | NORMAL | Cron (daily 08:00) | Send reminders for action item due dates |
| 20 | Auto-Transition Corrective Actions | `corrective-actions` | NORMAL | Cron (hourly) | Transition actions when all items complete |
| 21 | Auto-Validate Consignment Notes | `validation-processing` | NORMAL | Cron (every 5min) | Run validation on new consignments |
| 22 | Flag Pending Runtime Validations | `runtime-monitoring` | NORMAL | Cron (daily 10:00) | Alert on manual entries pending validation |
| 23 | Update SLA Breach Timers | `sla-breach-alerts` | HIGH | Cron (hourly) | Track SLA breach duration |
| 24 | Detect Breaches and Trigger Alerts | `sla-breach-alerts` | HIGH | Cron (every 15min) | Detect breaches/SLA misses, trigger critical notifications |
| 25 | Execute Pending Recurrence Triggers | `trigger-execution` | NORMAL | Cron (hourly) | Execute event-based triggers |
| 26 | Process Trigger Conditions | `trigger-execution` | NORMAL | Event-driven | Evaluate conditional triggers on events |
| **v1.4 New Production Jobs (Section 18)** |
| 27 | Evidence Expiry Tracking | `evidence-tracking` | NORMAL | Cron (daily 02:00) | Track evidence expiration dates and send reminders |
| 28 | Recurring Task Generation | `recurring-tasks` | NORMAL | Cron (daily 03:00) | Generate task instances from recurring task definitions |
| 29 | Report Generation | `report-generation` | NORMAL | API trigger | Generate compliance reports (PDF/Excel) |
| 30 | Notification Delivery | `notification-delivery` | HIGH | Event-driven | Deliver queued notifications via email/SMS/push |
| 31 | Digest Delivery | `digest-delivery` | NORMAL | Cron (daily 07:00) | Send daily/weekly digest emails to users |
| 32 | Evidence Retention | `evidence-retention` | LOW | Cron (monthly) | Archive/delete evidence past retention period |

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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│  2c. Determine notification priority:                        │
│      days = 7 → priority = 'NORMAL'                        │
│      days = 3 → priority = 'HIGH'                           │
│      days = 1 → priority = 'URGENT'                         │
│                                                             │
│  2d. Create notification record:                           │
│      INSERT INTO notifications (                           │
│        user_id, company_id, site_id,                       │
│        recipient_email, notification_type, channel,       │
│        priority, subject, body_text,                       │
│        entity_type, entity_id, action_url, metadata        │
│      ) VALUES (                                            │
│        :assigned_user_id, :company_id, :site_id,           │
│        (SELECT email FROM users WHERE id = :assigned_user_id), │
│        CASE WHEN :days_remaining = 7 THEN 'DEADLINE_WARNING_7D' │
│             WHEN :days_remaining = 3 THEN 'DEADLINE_WARNING_3D' │
│             WHEN :days_remaining = 1 THEN 'DEADLINE_WARNING_1D' │
│             ELSE 'DEADLINE_ALERT' END,                    │
│        :channel,                                           │
│        CASE WHEN :days_remaining = 1 THEN 'URGENT'         │
│             WHEN :days_remaining = 3 THEN 'HIGH'           │
│             ELSE 'NORMAL' END,                             │
│        :subject, :body_text,                               │
│        'deadline', :deadline_id,                           │
│        :action_url, :metadata::JSONB                       │
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│    recipient_email, notification_type, channel,            │
│    priority, subject, body_text,                           │
│    entity_type, entity_id, action_url, metadata            │
│  ) VALUES (                                                │
│    COALESCE(:assigned_user_id, :site_manager_id),          │
│    :company_id, :site_id,                                  │
│    (SELECT email FROM users WHERE id = COALESCE(:assigned_user_id, :site_manager_id)), │
│    'EVIDENCE_REMINDER', 'EMAIL',                           │
│    'HIGH',                                                 │
│    'Evidence Required: ' || :obligation_summary,           │
│    'Evidence is required for obligation due on ' ||        │
│      :deadline_date,                                       │
│    'obligation', :obligation_id,                           │
│    '/obligations/' || :obligation_id,                      │
│    '{"days_until_due": ' || :days_remaining || '}'::JSONB │
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |
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

**Purpose:** Process uploaded PDF documents through text extraction, OCR (if needed), and LLM parsing to extract obligations.

**Implementation Details:**
- Uses `pdf-parse` v2 API (`PDFParse` class) for primary text extraction
- Attempts direct text extraction first (efficient for native PDFs)
- Falls back to Tesseract.js OCR only if extracted text < 100 characters
- OCR timeout: 60 seconds per document
- Large document threshold: ≥50 pages AND ≥10MB (both conditions required)

**Reference:** PLS Section A.9 (AI Extraction Processing), Technical Architecture Section 5 (AI Service Integration)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `DOCUMENT_PROCESSING` |
| Queue | `document-processing` |
| Priority | NORMAL |
| Trigger | API endpoint: `POST /api/v1/documents/{id}/extract` |
| Timeout | 30 seconds (standard), 300 seconds (large documents ≥50 pages) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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

Step 5: Text Extraction (Primary Method)
┌─────────────────────────────────────────────────────────────┐
│  Implementation: lib/ai/document-processor.ts              │
│                                                             │
│  5a. Attempt direct text extraction using pdf-parse v2:    │
│      - Use PDFParse class from pdf-parse library          │
│      - Initialize: new PDFParse({ data: fileBuffer })      │
│      - Extract text: await parser.getText()                │
│      - Get metadata: pageCount, fileSizeBytes              │
│                                                             │
│  5b. Check extraction success:                            │
│      IF extracted_text.trim().length < 100 THEN            │
│        - Likely scanned document (insufficient text)       │
│        - Set needsOCR = true                               │
│        - Proceed to Step 6 (OCR Processing)               │
│      ELSE                                                   │
│        - Native PDF with extractable text                  │
│        - Set is_native_pdf = true                          │
│        - Proceed to Step 5c (Store text)                  │
│      END IF                                                │
│                                                             │
│  5c. Store extracted text (if native PDF):                 │
│      UPDATE documents                                       │
│      SET extracted_text = :text,                           │
│          page_count = :page_count,                          │
│          file_size_bytes = :file_size_bytes,                │
│          is_native_pdf = true,                              │
│          updated_at = NOW()                                │
│      WHERE id = :document_id                               │
│                                                             │
│  5d. Detect large document:                               │
│      IF page_count >= 50 AND file_size_bytes >= 10_000_000 │
│         (10MB) THEN                                        │
│        - Set is_large_document = true                      │
│        - Apply extended timeout (300 seconds)               │
│      END IF                                                │
└─────────────────────────────────────────────────────────────┘

Step 6: OCR Processing (Fallback for Scanned PDFs)
┌─────────────────────────────────────────────────────────────┐
│  Implementation: lib/ai/document-processor.ts              │
│  Only executed if Step 5 detected scanned PDF              │
│  (extracted_text.trim().length < 100)                      │
│                                                             │
│  6a. Initialize Tesseract.js OCR worker:                   │
│      - Create worker: createWorker('eng')                   │
│      - Language: English ('eng')                            │
│                                                             │
│  6b. Run OCR with timeout protection:                      │
│      - Set 60-second timeout per document                  │
│      - Use Promise.race pattern for timeout handling       │
│      - Process document buffer: worker.recognize()        │
│      - Extract text from OCR result: data.text              │
│                                                             │
│  6c. Store OCR results:                                    │
│      UPDATE documents                                       │
│      SET extracted_text = :ocr_text,                        │
│          ocr_confidence = :confidence,                      │
│          is_native_pdf = false,                              │
│          updated_at = NOW()                                │
│      WHERE id = :document_id                               │
│                                                             │
│  6d. Cleanup:                                              │
│      - Terminate worker in finally block                   │
│      - Prevents memory leaks                                │
│                                                             │
│  6e. Validate extracted text:                              │
│      IF extracted_text.trim().length < 50 THEN             │
│        - Throw error: "Extracted text is too short"         │
│        - Set status = 'OCR_FAILED'                         │
│        - Flag for manual review                             │
│      END IF                                                │
│                                                             │
│  6f. Handle OCR timeout (60 seconds):                      │
│      IF OCR processing exceeds 60 seconds THEN             │
│        - Reject with error: "OCR timeout after 60 seconds" │
│        - Set status = 'OCR_FAILED'                         │
│        - Create review_queue_item                           │
│        - Do not retry (non-retryable error)                │
│      END IF                                                │
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
| OCR failure | Set status = 'OCR_FAILED', create review_queue_item | OCR_FAILED | No |
| OCR timeout (60s) | Set status = 'OCR_FAILED', error_message = 'OCR timeout after 60 seconds' | OCR_FAILED | No |
| Extracted text too short (<50 chars) | Set status = 'OCR_FAILED', error_message = 'Extracted text is too short. Document may be corrupted or require OCR.' | OCR_FAILED | No |
| LLM timeout | Retry twice (3 total attempts) with same document (per PLS A.9.1: 30s standard, 5min large) | PROCESSING | Yes |
| LLM error | Set status = 'EXTRACTION_FAILED', create review_queue_item | EXTRACTION_FAILED | Yes |
| Validation errors | Set status = 'REVIEW_REQUIRED', create review_queue_item | REVIEW_REQUIRED | No |
| Zero obligations extracted | Set status = 'ZERO_OBLIGATIONS', flag for review | ZERO_OBLIGATIONS | No |

### Retry Logic

**Reference:** PLS Section B.7.4

| Parameter | Value |
|-----------|-------|
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |
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
  // Use AND logic: Both conditions must be met for large document classification
  // This prevents edge cases:
  // - 49 pages + 15MB → treated as standard (30s) but needs 5min → now correctly identified
  // - 100 pages + 5MB → treated as large (5min) but might finish in 30s → now correctly identified
  return document.page_count >= 50 && 
         document.file_size_bytes >= 10_000_000; // 10MB
}

// Medium Document Detection (new tier):
function isMediumDocument(document: Document): boolean {
  // Medium documents: Between standard and large
  // Use 120s timeout (2 minutes) for medium documents
  return (
    (document.page_count >= 20 && document.page_count < 50) ||
    (document.file_size_bytes >= 5_000_000 && document.file_size_bytes < 10_000_000) // 5MB-10MB
  ) && !isLargeDocument(document);
}

// Timeout Selection:
function getDocumentTimeout(document: Document): number {
  if (isLargeDocument(document)) {
    return 300_000; // 5 minutes
  } else if (isMediumDocument(document)) {
    return 120_000; // 2 minutes
  } else {
    return 30_000; // 30 seconds (standard)
  }
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
  recipient_email: user.email,
  notification_type: 'SYSTEM_ALERT',
  channel: 'IN_APP',
  priority: 'NORMAL',
  subject: 'Document Processed Successfully',
  body_text: `"${document.title}" has been processed. ${obligationsCount} obligations extracted.${flaggedCount > 0 ? ` ${flaggedCount} items flagged for review.` : ''}`,
  body_html: null, // Generated by notification service
  entity_type: 'document',
  entity_id: document.id,
  action_url: `/documents/${document.id}`,
  variables: {
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
  recipient_email: user.email,
  notification_type: 'SYSTEM_ALERT',
  channel: 'IN_APP',
  priority: 'CRITICAL',
  subject: 'Document Processing Failed',
  body_text: `Processing failed for "${document.title}". ${errorMessage}`,
  body_html: null, // Generated by notification service
  entity_type: 'document',
  entity_id: document.id,
  action_url: `/review-queue?document_id=${document.id}`,
  variables: {
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│                            'quarterly', 'ANNUAL',        │
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
│    company_id: import.company_id,                          │
│    site_id: import.site_id,                                │
│    recipient_email: user.email,                            │
│    notification_type: 'SYSTEM_ALERT',                     │
│    channel: 'EMAIL',                                      │
│    priority: 'NORMAL',                                    │
│    subject: 'Excel import ready for review',               │
│    body_text: "Your Excel import is ready. {valid_count}   │
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
│          import_source: 'EXCEL_IMPORT',                    │
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
│    company_id: import.company_id,                          │
│    site_id: import.site_id,                                │
│    recipient_email: user.email,                            │
│    notification_type: 'SYSTEM_ALERT',                     │
│    channel: 'EMAIL',                                      │
│    priority: 'NORMAL',                                    │
│    subject: 'Excel import completed',                      │
│    body_text: "{success_count} obligations imported        │
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |
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
| Max Retries | 2 retry attempts | Total attempts: 3 (1 initial + 2 retries) - per PLS Section A.9.1 |
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
      
      // Check if retries remaining (attempt 0 = initial, 1 = first retry, 2 = second retry)
      // Total: 3 attempts (1 initial + 2 retries)
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│    recipient_email, notification_type, channel,            │
│    priority, subject, body_text,                           │
│    entity_type, entity_id                                  │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    p.company_id,                                            │
│    p.site_id,                                               │
│    u.email,                                                 │
│    'EVIDENCE_REMINDER',                                     │
│    'EMAIL',                                                 │
│    CASE WHEN days_overdue > 7 THEN 'CRITICAL'              │
│         WHEN days_overdue > 0 THEN 'HIGH'                  │
│         ELSE 'NORMAL' END,                                  │
│    'Sampling Reminder: ' || p.parameter_type,              │
│    'Sampling is due for parameter ' || p.parameter_type,    │
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

- Create notification: `notification_type = 'SYSTEM_ALERT'`, `priority = 'CRITICAL'`
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│        AND notification_type = 'BREACH'                    │
│        AND metadata->>'threshold_level' = :threshold        │
│        AND created_at >= DATE_TRUNC('year', NOW())          │
│                                                             │
│  3c. If no existing alert, create notification:             │
│      INSERT INTO notifications (                            │
│        user_id, company_id, site_id,                       │
│        recipient_email, notification_type, channel,        │
│        priority, subject, body_text,                       │
│        entity_type, entity_id, metadata                    │
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

**Purpose:** Compiles Annual Emissions Report data and generates EA-format PDF/CSV for submission. Includes fuel usage logs and sulphur content reports aggregation.

**Reference:** PLS Section C.3.8 (Annual Return - AER Logic), PLS Section C.3.9 (Fuel Usage Logging Logic), PLS Section C.3.10 (Sulphur Content Reporting Logic)

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AER_GENERATION` |
| Queue | `aer-generation` |
| Priority | NORMAL |
| Trigger | API endpoint OR Cron: `0 8 15 1 *` (Jan 15 at 8:00 AM) |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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

Step 2b: Aggregate Fuel Usage Logs
┌─────────────────────────────────────────────────────────────┐
│  For each generator:                                        │
│                                                             │
│  SELECT                                                     │
│    generator_id,                                            │
│    fuel_type,                                               │
│    SUM(quantity) AS total_quantity,                        │
│    unit,                                                     │
│    AVG(sulphur_content_percentage) AS avg_sulphur_pct,     │
│    AVG(sulphur_content_mg_per_kg) AS avg_sulphur_mg_kg    │
│  FROM fuel_usage_logs                                       │
│  WHERE generator_id = :generator_id                         │
│    AND log_date BETWEEN :period_start AND :period_end      │
│  GROUP BY generator_id, fuel_type, unit                    │
└─────────────────────────────────────────────────────────────┘

Step 2c: Retrieve Sulphur Content Reports
┌─────────────────────────────────────────────────────────────┐
│  SELECT scr.*                                               │
│  FROM sulphur_content_reports scr                          │
│  WHERE scr.generator_id IN (:generator_ids)                │
│    AND scr.test_date BETWEEN :period_start AND :period_end │
│  ORDER BY scr.test_date DESC                               │
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
│                                                             │
│  Note: fuel_consumption_data is populated from aggregated  │
│  fuel_usage_logs (replaces legacy JSONB field)              │
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
| Missing fuel usage logs | Add validation warning (can be estimated), continue |
| Missing sulphur content reports | Add validation warning (optional for AER), continue |
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

### 5.4 AER Generation Job (Module 3)

**Purpose:** Generate Annual Emissions Report (AER) for MCPD registrations

**Queue:** `aer-generation`

**Priority:** NORMAL

**Trigger:** 
- API trigger: User requests AER generation via `/api/v1/module-3/aer/generate`
- Scheduled: Annual cron job (1st January each year) for all active MCPD registrations

**Job Data:**
```typescript
interface AERGenerationJobData {
  mcpd_registration_id: string;
  reporting_period_start: string; // ISO date
  reporting_period_end: string; // ISO date
  generator_ids?: string[]; // Optional: specific generators, otherwise all
  company_id: string;
  site_id: string;
  requested_by: string; // User ID
}
```

**Execution Logic:**
1. Fetch generator data for registration
2. Aggregate run-hour records for reporting period
3. Aggregate fuel usage logs by fuel type for reporting period
4. Retrieve sulphur content reports for fuel batches used during period
5. Retrieve most recent stack test results per generator
6. Calculate emissions (run-hours × emission rates)
7. Compile fuel consumption data from fuel_usage_logs (replaces legacy JSONB field)
8. Include sulphur content compliance verification from sulphur_content_reports
9. Generate AER PDF document
10. Store AER document in `aer_documents` table
11. Update AER status to READY
12. Notify user when generation complete

**Data Sources:**
- `generators` table
- `run_hour_records` table (aggregated)
- `fuel_usage_logs` table (aggregated by fuel type)
- `sulphur_content_reports` table (for compliance verification)
- `stack_tests` table (most recent per generator)
- `runtime_monitoring` table (if used)

**Output:**
- AER PDF document stored in Supabase Storage
- `aer_documents` record with status = READY
- File path stored in `generated_file_path`

**Error Handling:**
- Retry up to 3 times on transient failures
- Log errors to `extraction_logs` table
- Notify user on final failure

**Reference:** PLS Section C.3.8 (Annual Return Logic), High Level Product Plan Module 3 - Fuel usage logs + sulphur content reporting

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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│        AND notification_type IN ('DEADLINE_ALERT', 'PERMIT_RENEWAL_REMINDER') │
│        AND metadata->>'reminder_type' = 'PERMIT_RENEWAL'    │
│        AND metadata->>'reminder_days' = :days_until::TEXT   │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Renewal Reminder Notifications
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                                │
│    user_id, company_id, site_id,                           │
│    recipient_email, notification_type, channel,            │
│    priority, subject, body_text,                           │
│    entity_type, entity_id, action_url, metadata            │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    d.company_id,                                            │
│    d.site_id,                                               │
│    u.email,                                                 │
│    'PERMIT_RENEWAL_REMINDER',                              │
│    'EMAIL',                                                 │
│    CASE WHEN :days_until <= 7 THEN 'URGENT'                │
│         WHEN :days_until <= 30 THEN 'HIGH'                │
│         ELSE 'NORMAL' END,                                  │
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
│  JOIN users u ON u.company_id = d.company_id               │
│  JOIN user_roles ur ON ur.user_id = u.id                    │
│    AND ur.role IN ('OWNER', 'ADMIN')                        │
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
│      AND cst.trigger_type = 'KEYWORD'                       │
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
│    'KEYWORD', :document_id,                                 │
│    :detected_keywords, 'PENDING'                            │
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
│    user_id, company_id, recipient_email,                   │
│    notification_type, channel, priority,                    │
│    subject, body_text, entity_type, entity_id, action_url  │
│  )                                                          │
│  SELECT                                                     │
│    u.id,                                                    │
│    :company_id,                                             │
│    u.email,                                                 │
│    'MODULE_ACTIVATION',                                     │
│    'IN_APP',                                                │
│    'NORMAL',                                                │
│    'Module Suggestion: ' || m.module_name,                 │
│    'We detected references to ' || :detected_keywords[1]    │
│      || ' in your permit. Would you like to activate '     │
│      || m.module_name || '?',                               │
│    'CROSS_SELL_TRIGGER',                                    │
│    :trigger_id,                                             │
│    '/modules/activate/' || m.id                            │
│  FROM modules m                                             │
│  JOIN users u ON u.company_id = :company_id                │
│  JOIN user_roles ur ON ur.user_id = u.id                    │
│    AND ur.role = 'OWNER'                                    │
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
  user_id: user.id,
  company_id: document.company_id,
  site_id: document.site_id,
  recipient_email: user.email,
  notification_type: 'AUDIT_PACK_READY',
  channel: 'EMAIL',
  priority: 'NORMAL',
  subject: 'Audit Pack Generated Successfully',
  body_text: `Your audit pack for ${document.title} (${dateRange}) is ready.`,
  body_html: null, // Generated by notification service
  entity_type: 'AUDIT_PACK',
  entity_id: audit_pack_id,
  action_url: `/audit-packs/${audit_pack_id}/download`
}
```

### Failure Notification

```typescript
{
  user_id: user.id,
  company_id: document.company_id,
  site_id: document.site_id,
  recipient_email: user.email,
  notification_type: 'SYSTEM_ALERT',
  channel: 'EMAIL',
  priority: 'CRITICAL',
  subject: 'Pack Generation Failed',
  body_text: `Failed to generate ${pack_type} pack. Error: ${error_message}`,
  body_html: null, // Generated by notification service
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
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

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
4. Create `pack_sharing` record with `distribution_method = 'EMAIL'` and `distributed_to` set
5. Send notification to requester

**For SHARED_LINK Distribution:**
1. Load pack from `audit_packs` table
2. Generate unique token (`shared_link_token`)
3. Set expiration (`shared_link_expires_at`)
4. Update `audit_packs` record with token and expiration
5. Create `pack_sharing` record with `distribution_method = 'SHARED_LINK'` and `distributed_to` set
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

# 7. Universal Compliance Clock Jobs

**Reference:** Database Schema v1.3 - compliance_clocks_universal table

These jobs manage the Universal Compliance Clock system that provides Red/Amber/Green criticality tracking across all modules.

## 7.1 Update Compliance Clocks Job

**Purpose:** Recalculate days_remaining and criticality for all active compliance clocks daily.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `UPDATE_COMPLIANCE_CLOCKS` |
| Queue | `compliance-clocks` |
| Priority | NORMAL |
| Trigger | Cron: `1 0 * * *` (daily at 00:01 UTC) |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface UpdateComplianceClocksJobInput {
  company_id?: UUID;    // Optional: Process specific company
  site_id?: UUID;       // Optional: Process specific site
  module_id?: UUID;     // Optional: Process specific module
  batch_size?: number;  // Default: 1000
}
```

### Execution Steps

```
Step 1: Query Active Compliance Clocks
┌─────────────────────────────────────────────────────────────┐
│  SELECT id, company_id, site_id, entity_type, entity_id,   │
│         target_date, reminder_days, reminders_sent          │
│  FROM compliance_clocks_universal                           │
│  WHERE status = 'ACTIVE'                                    │
│    AND (company_id = :company_id OR :company_id IS NULL)   │
│    AND (site_id = :site_id OR :site_id IS NULL)            │
│    AND (module_id = :module_id OR :module_id IS NULL)      │
│  ORDER BY target_date ASC                                   │
│  LIMIT :batch_size                                          │
└─────────────────────────────────────────────────────────────┘

Step 2: For Each Clock (Batch Processing)
┌─────────────────────────────────────────────────────────────┐
│  2a. Calculate days_remaining:                             │
│      days_remaining = target_date - CURRENT_DATE           │
│                                                             │
│  2b. Determine criticality:                                │
│      IF days_remaining < 0 THEN                            │
│        criticality = 'RED' (overdue)                       │
│      ELSIF days_remaining <= 7 THEN                        │
│        criticality = 'RED' (critical)                      │
│      ELSIF days_remaining <= 30 THEN                       │
│        criticality = 'AMBER' (warning)                     │
│      ELSE                                                   │
│        criticality = 'GREEN' (on track)                    │
│                                                             │
│  2c. Check if overdue:                                     │
│      IF target_date < CURRENT_DATE THEN                    │
│        status = 'OVERDUE'                                  │
│                                                             │
│  2d. Generate reminders if needed:                         │
│      FOR EACH day IN reminder_days                         │
│        IF days_remaining = day AND                         │
│           day NOT IN reminders_sent THEN                   │
│          -- Create notification                            │
│          INSERT INTO notifications (...)                   │
│          -- Update reminders_sent array                    │
│          UPDATE compliance_clocks_universal                │
│          SET reminders_sent = array_append(                │
│              reminders_sent, :day)                         │
│          WHERE id = :clock_id                              │
└─────────────────────────────────────────────────────────────┘

Step 3: Batch Update Clocks
┌─────────────────────────────────────────────────────────────┐
│  -- Use temporary table for batch update                   │
│  CREATE TEMP TABLE clock_updates AS                        │
│  SELECT id, days_remaining, criticality, status            │
│  FROM (calculated_values);                                 │
│                                                             │
│  UPDATE compliance_clocks_universal c                      │
│  SET days_remaining = u.days_remaining,                    │
│      criticality = u.criticality,                          │
│      status = u.status,                                    │
│      updated_at = NOW()                                    │
│  FROM clock_updates u                                      │
│  WHERE c.id = u.id;                                        │
└─────────────────────────────────────────────────────────────┘

Step 4: Process Next Batch (if exists)
┌─────────────────────────────────────────────────────────────┐
│  IF more clocks exist with status = 'ACTIVE' THEN          │
│    Schedule immediate follow-up job                        │
│  ELSE                                                       │
│    Complete job                                            │
└─────────────────────────────────────────────────────────────┘
```

### Criticality Rules

```typescript
function calculateCriticality(daysRemaining: number): 'RED' | 'AMBER' | 'GREEN' {
  if (daysRemaining < 0) return 'RED';      // Overdue
  if (daysRemaining <= 7) return 'RED';     // Critical (≤ 7 days)
  if (daysRemaining <= 30) return 'AMBER';  // Warning (8-30 days)
  return 'GREEN';                           // On track (> 30 days)
}
```

### Reminder Logic

```typescript
// Default reminder_days: [90, 30, 7]
// Send notifications at 90, 30, and 7 days before target_date
// Track sent reminders to avoid duplicates

function shouldSendReminder(
  daysRemaining: number,
  reminderDays: number[],
  remindersSent: number[]
): boolean {
  return reminderDays.includes(daysRemaining) &&
         !remindersSent.includes(daysRemaining);
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 1000 clocks per batch |
| Job Duration | < 10 minutes for 10,000 clocks |
| Database Load | < 100 queries per second |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Database connection error | Retry with exponential backoff | Yes |
| Individual clock error | Log error, continue with next clock | No |
| Batch timeout | Process partial batch, schedule continuation | Yes |

### Monitoring Metrics

- Total clocks processed
- Clocks by criticality (RED/AMBER/GREEN)
- Clocks transitioned to OVERDUE
- Reminders generated
- Processing duration

---

## 7.2 Refresh Compliance Clock Dashboard Job

**Purpose:** Refresh materialized view for compliance clock dashboard.

> [v1.6 UPDATE – Materialized View Optimization – 2025-01-01]
> - Materialized view should be tested against regular view first
> - Only use materialized view if queries are slow (>500ms)
> - For V1 scale, regular view may be sufficient
> - If materialized view is not needed, this job can be removed

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `REFRESH_COMPLIANCE_DASHBOARD` |
| Queue | `dashboard-refresh` |
| Priority | LOW |
| Trigger | Cron: `*/15 * * * *` (every 15 minutes) |
| Timeout | 60 seconds |
| Max Retries | 1 retry attempt (2 total attempts: 1 initial + 1 retry) |

### Input Parameters

```typescript
interface RefreshComplianceDashboardJobInput {
  refresh_mode?: 'CONCURRENT' | 'FULL';  // Default: CONCURRENT
}
```

### Execution Steps

```
Step 1: Refresh Materialized View
┌─────────────────────────────────────────────────────────────┐
│  -- Use CONCURRENTLY to avoid locking                      │
│  REFRESH MATERIALIZED VIEW CONCURRENTLY                     │
│    compliance_clock_dashboard;                             │
│                                                             │
│  -- View aggregates:                                       │
│  --   - Total clocks by company/site/module                │
│  --   - Count by criticality (RED/AMBER/GREEN)             │
│  --   - Count by status (ACTIVE/OVERDUE/COMPLETED)         │
│  --   - Upcoming target dates                              │
└─────────────────────────────────────────────────────────────┘

Step 2: Verify Refresh Completion
┌─────────────────────────────────────────────────────────────┐
│  SELECT COUNT(*) FROM compliance_clock_dashboard;          │
│  -- Ensure view has data                                   │
└─────────────────────────────────────────────────────────────┘
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Refresh Duration | < 30 seconds |
| Lock Duration | None (CONCURRENT mode) |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| View locked | Retry with backoff | Yes |
| Refresh timeout | Alert admins, skip refresh | No |

---

# 8. Escalation Workflow Jobs

**Reference:** Database Schema v1.3 - escalation_workflows table

These jobs manage automated escalation of overdue obligations based on configurable company-specific workflows.

> **⚠️ IMPLEMENTATION STATUS (2025-02-01):**
> - **Current Implementation:** Hardcoded escalation logic exists in `lib/services/escalation-service.ts` and `lib/jobs/escalation-check-job.ts` using role-based escalation (Level 1 = ADMIN/OWNER, Level 2 = ADMIN/OWNER, Level 3 = OWNER) with time-based progression (24 hours, 48 hours).
> - **Specification Requirements:** This section describes the full configurable escalation workflow system using `escalation_workflows` table, which is **NOT YET IMPLEMENTED**.
> - **Missing Features:**
>   - ❌ Days-overdue-based escalation matching (currently time-based)
>   - ❌ Escalation workflow matching logic (obligation_category + company_id)
>   - ❌ Configurable recipients per level from `escalation_workflows.level_N_recipients`
>   - ❌ Sequential level progression based on threshold days
>   - ❌ Integration with `escalations` table for escalation record tracking
> - **Action Required:** Implement full escalation workflow job per this specification, replacing hardcoded logic with configurable workflow system.

## 8.1 Process Escalations Job

**Purpose:** Auto-escalate overdue obligations based on escalation workflows.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `PROCESS_ESCALATIONS` |
| Queue | `escalation-processing` |
| Priority | HIGH |
| Trigger | Cron: `30 0 * * *` (daily at 00:30 UTC, after clock update) |
| Timeout | 600 seconds (10 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface ProcessEscalationsJobInput {
  company_id?: UUID;    // Optional: Process specific company
  obligation_category?: string;  // Optional: Process specific category
  batch_size?: number;  // Default: 500
}
```

### Execution Steps

```
Step 1: Query Overdue Obligations and Deadlines
┌─────────────────────────────────────────────────────────────┐
│  -- Find all overdue obligations                           │
│  SELECT o.id, o.company_id, o.obligation_category,         │
│         o.due_date, o.assigned_to,                         │
│         CURRENT_DATE - o.due_date AS days_overdue          │
│  FROM obligations o                                        │
│  WHERE o.status = 'OVERDUE'                                │
│    AND (o.company_id = :company_id OR :company_id IS NULL)│
│    AND (o.obligation_category = :obligation_category       │
│         OR :obligation_category IS NULL)                   │
│                                                             │
│  UNION ALL                                                 │
│                                                             │
│  -- Find all overdue deadlines                             │
│  SELECT d.id, d.company_id, o.obligation_category,         │
│         d.due_date, o.assigned_to,                         │
│         CURRENT_DATE - d.due_date AS days_overdue          │
│  FROM deadlines d                                          │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  WHERE d.status = 'OVERDUE'                                │
│    AND (d.company_id = :company_id OR :company_id IS NULL)│
│  ORDER BY days_overdue DESC                                │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Match to Escalation Workflows
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH overdue_item                                     │
│    -- Find applicable escalation workflow                  │
│    SELECT * FROM escalation_workflows                      │
│    WHERE company_id = :overdue_item.company_id             │
│      AND is_active = true                                  │
│      AND (obligation_category = :overdue_item.category     │
│           OR obligation_category IS NULL)                  │
│    ORDER BY obligation_category NULLS LAST                 │
│    LIMIT 1;                                                │
│                                                             │
│    -- Category-specific workflow takes precedence          │
│    -- NULL category = fallback for all categories          │
└─────────────────────────────────────────────────────────────┘

Step 3: Determine Escalation Level
┌─────────────────────────────────────────────────────────────┐
│  3a. Compare days_overdue to level thresholds:             │
│      IF days_overdue >= level_4_days THEN                  │
│        escalation_level = 4                                │
│      ELSIF days_overdue >= level_3_days THEN               │
│        escalation_level = 3                                │
│      ELSIF days_overdue >= level_2_days THEN               │
│        escalation_level = 2                                │
│      ELSIF days_overdue >= level_1_days THEN               │
│        escalation_level = 1                                │
│      ELSE                                                   │
│        escalation_level = 0 (no escalation yet)            │
│                                                             │
│  3b. Check existing escalation record:                     │
│      SELECT current_level FROM escalations                 │
│      WHERE entity_id = :overdue_item.id                    │
│        AND entity_type = 'OBLIGATION' OR 'DEADLINE'        │
│      ORDER BY created_at DESC LIMIT 1;                     │
│                                                             │
│  3c. Enforce sequential escalation:                        │
│      -- Cannot skip levels                                 │
│      IF new_level > current_level + 1 THEN                 │
│        new_level = current_level + 1                       │
└─────────────────────────────────────────────────────────────┘

Step 4: Create/Update Escalation Record
┌─────────────────────────────────────────────────────────────┐
│  IF escalation_level > current_level THEN                  │
│    -- Create new escalation record                         │
│    INSERT INTO escalations (                               │
│      company_id, entity_type, entity_id,                   │
│      escalation_level, escalated_at,                       │
│      escalated_to, escalation_reason                       │
│    ) VALUES (                                              │
│      :company_id, :entity_type, :entity_id,                │
│      :escalation_level, NOW(),                             │
│      :level_N_recipients, -- From workflow config          │
│      :reason                                               │
│    );                                                      │
└─────────────────────────────────────────────────────────────┘

Step 5: Send Notifications to Recipients
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH recipient IN level_N_recipients                  │
│    INSERT INTO notifications (                             │
│      user_id, recipient_email, notification_type,         │
│      priority, subject, body_text,                         │
│      entity_type, entity_id, metadata                      │
│    ) VALUES (                                              │
│      :recipient_id, :recipient_email,                      │
│      'ESCALATION_ALERT', 'URGENT',                         │
│      'Level :level Escalation: :obligation_summary',       │
│      :body_text,                                           │
│      :entity_type, :entity_id,                             │
│      jsonb_build_object(                                   │
│        'escalation_level', :level,                         │
│        'days_overdue', :days_overdue,                      │
│        'workflow_id', :workflow_id                         │
│      )                                                     │
│    );                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Escalation Level Logic

```typescript
function determineEscalationLevel(
  daysOverdue: number,
  workflow: EscalationWorkflow
): number {
  if (daysOverdue >= workflow.level_4_days) return 4;
  if (daysOverdue >= workflow.level_3_days) return 3;
  if (daysOverdue >= workflow.level_2_days) return 2;
  if (daysOverdue >= workflow.level_1_days) return 1;
  return 0; // Not yet eligible for escalation
}

function canEscalateToLevel(
  currentLevel: number,
  targetLevel: number
): boolean {
  // Enforce sequential escalation - cannot skip levels
  return targetLevel === currentLevel + 1;
}
```

### Default Escalation Thresholds

```typescript
// Default thresholds (configurable per company)
const DEFAULT_ESCALATION_CONFIG = {
  level_1_days: 7,   // Escalate to Level 1 after 7 days overdue
  level_2_days: 14,  // Escalate to Level 2 after 14 days overdue
  level_3_days: 21,  // Escalate to Level 3 after 21 days overdue
  level_4_days: 30,  // Escalate to Level 4 after 30 days overdue
};
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 500 obligations per batch |
| Job Duration | < 10 minutes for 5000 obligations |
| Notification Rate | < 50 notifications per second |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Missing workflow | Use company default or skip | No |
| Invalid recipients | Log warning, skip recipient | No |
| Notification failure | Log error, continue processing | No |
| Database error | Retry with exponential backoff | Yes |

### Monitoring Metrics

- Total escalations processed
- Escalations by level (1-4)
- Notifications sent
- Processing duration
- Escalation creation rate

---

# 9. Permit Workflow Jobs

**Reference:** Database Schema v1.3 - permit_workflows table

These jobs manage automated permit lifecycle workflows including renewals, variations, and regulatory response tracking.

## 9.1 Auto-Create Renewal Workflows Job

**Purpose:** Auto-create renewal workflows 90 days before permit expiry.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AUTO_CREATE_RENEWAL_WORKFLOWS` |
| Queue | `permit-workflows` |
| Priority | NORMAL |
| Trigger | Cron: `0 1 * * *` (daily at 01:00 UTC) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface AutoCreateRenewalWorkflowsJobInput {
  company_id?: UUID;           // Optional: Process specific company
  advance_notice_days?: number; // Default: 90
}
```

### Execution Steps

```
Step 1: Query Expiring Permits
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.id AS document_id, d.company_id, d.site_id,      │
│         d.document_type, d.expiry_date,                     │
│         u.id AS owner_id, u.email AS owner_email            │
│  FROM documents d                                           │
│  JOIN users u ON u.id = d.assigned_to                      │
│  WHERE d.document_type IN ('PERMIT', 'CONSENT',            │
│                            'REGISTRATION', 'LICENCE')       │
│    AND d.expiry_date = CURRENT_DATE + INTERVAL             │
│        ':advance_notice_days days'                         │
│    AND d.status = 'ACTIVE'                                 │
│    AND (d.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
└─────────────────────────────────────────────────────────────┘

Step 2: Check for Existing Renewal Workflows
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH permit                                           │
│    -- Avoid creating duplicate workflows                   │
│    SELECT COUNT(*) FROM permit_workflows                   │
│    WHERE document_id = :permit.document_id                 │
│      AND workflow_type = 'RENEWAL'                         │
│      AND status NOT IN ('COMPLETED', 'CANCELLED');         │
│                                                             │
│    IF count = 0 THEN                                       │
│      -- No active renewal workflow exists                  │
│      proceed_to_step_3 = true                              │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Renewal Workflow
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO permit_workflows (                            │
│    document_id, workflow_type, status,                     │
│    regulator_response_deadline,                            │
│    workflow_notes, created_by                              │
│  ) VALUES (                                                │
│    :document_id, 'RENEWAL', 'DRAFT',                       │
│    :expiry_date - INTERVAL '30 days',  -- Expected        │
│    'Auto-created renewal workflow - permit expires in 90   │
│     days', :system_user_id                                │
│  );                                                        │
└─────────────────────────────────────────────────────────────┘

Step 4: Create Notification
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                               │
│    user_id, recipient_email, notification_type,           │
│    priority, subject, body_text,                           │
│    entity_type, entity_id, action_url                      │
│  ) VALUES (                                                │
│    :owner_id, :owner_email,                                │
│    'PERMIT_RENEWAL_REQUIRED', 'HIGH',                      │
│    'Permit Renewal Required: Expires in 90 Days',          │
│    'Your :document_type (:document_name) expires on        │
│     :expiry_date. A renewal workflow has been created.     │
│     Please start the renewal process.',                    │
│    'permit_workflow', :workflow_id,                        │
│    '/permits/:document_id/workflows/:workflow_id'          │
│  );                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Renewal Timeline

```typescript
// Default timeline for permit renewals
const RENEWAL_TIMELINE = {
  advance_notice_days: 90,          // Create workflow 90 days before expiry
  regulator_response_days: 60,      // Expected regulator response time
  submission_deadline_days: 30,     // Submit application 30 days before expiry
};
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 100+ permits per day |
| Job Duration | < 5 minutes |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Duplicate workflow | Skip permit, continue | No |
| Missing owner | Assign to admin, continue | No |
| Notification failure | Log error, continue | No |

### Monitoring Metrics

- Renewal workflows created
- Permits expiring in next 90 days
- Processing duration

---

## 9.2 Check Regulator Response Deadlines Job

**Purpose:** Alert when regulator hasn't responded by deadline.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `CHECK_REGULATOR_RESPONSE_DEADLINES` |
| Queue | `permit-workflows` |
| Priority | NORMAL |
| Trigger | Cron: `0 9 * * *` (daily at 09:00 UTC, business hours) |
| Timeout | 120 seconds (2 minutes) |
| Max Retries | 1 retry attempt (2 total attempts: 1 initial + 1 retry) |

### Input Parameters

```typescript
interface CheckRegulatorResponseDeadlinesJobInput {
  company_id?: UUID;    // Optional: Process specific company
}
```

### Execution Steps

```
Step 1: Query Workflows Awaiting Regulator Response
┌─────────────────────────────────────────────────────────────┐
│  SELECT pw.id AS workflow_id, pw.document_id,              │
│         pw.workflow_type, pw.submitted_date,                │
│         pw.regulator_response_deadline,                     │
│         d.document_name, u.id AS owner_id,                 │
│         u.email AS owner_email                              │
│  FROM permit_workflows pw                                  │
│  JOIN documents d ON d.id = pw.document_id                 │
│  JOIN users u ON u.id = d.assigned_to                      │
│  WHERE pw.status = 'UNDER_REVIEW'                          │
│    AND pw.regulator_response_deadline < CURRENT_DATE       │
│    AND pw.regulator_response_date IS NULL                  │
│    AND (pw.company_id = :company_id                        │
│         OR :company_id IS NULL)                            │
└─────────────────────────────────────────────────────────────┘

Step 2: Calculate Days Overdue
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH workflow                                         │
│    days_overdue = CURRENT_DATE -                           │
│                   regulator_response_deadline              │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Alert Notifications
┌─────────────────────────────────────────────────────────────┐
│  -- Notify permit owner                                    │
│  INSERT INTO notifications (                               │
│    user_id, recipient_email, notification_type,           │
│    priority, subject, body_text,                           │
│    entity_type, entity_id                                  │
│  ) VALUES (                                                │
│    :owner_id, :owner_email,                                │
│    'REGULATOR_RESPONSE_OVERDUE', 'URGENT',                 │
│    'Regulator Response Overdue: :workflow_type',           │
│    'The regulator response for your :workflow_type         │
│     workflow was due on :deadline and is now :days_overdue │
│     days overdue. Consider following up with the           │
│     regulator.', 'permit_workflow', :workflow_id           │
│  );                                                        │
│                                                             │
│  -- Escalate to admins if > 7 days overdue                │
│  IF days_overdue > 7 THEN                                  │
│    -- Send to all admins                                   │
│    INSERT INTO notifications (...)                         │
│    SELECT ... FROM users WHERE role = 'ADMIN'              │
└─────────────────────────────────────────────────────────────┘

Step 4: Update Workflow Metadata
┌─────────────────────────────────────────────────────────────┐
│  UPDATE permit_workflows                                   │
│  SET workflow_notes = COALESCE(workflow_notes, '') ||      │
│      E'\n[' || CURRENT_DATE || '] Regulator response       │
│      overdue - alert sent',                                │
│      updated_at = NOW()                                    │
│  WHERE id = :workflow_id;                                  │
└─────────────────────────────────────────────────────────────┘
```

### Alert Escalation Rules

```typescript
function determineAlertPriority(daysOverdue: number): 'HIGH' | 'URGENT' {
  return daysOverdue > 7 ? 'URGENT' : 'HIGH';
}

function shouldEscalateToAdmins(daysOverdue: number): boolean {
  return daysOverdue > 7;
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Job Duration | < 2 minutes |
| Query Time | < 5 seconds |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Missing permit owner | Escalate to admins | No |
| Notification failure | Log error, continue | No |

---

# 10. Corrective Action Jobs

**Reference:** Database Schema v1.3 - corrective_action_items table

These jobs manage automated tracking and reminders for corrective action items.

## 10.1 Monitor Corrective Action Items Job

**Purpose:** Send reminders for upcoming action item due dates.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `MONITOR_CORRECTIVE_ACTION_ITEMS` |
| Queue | `corrective-actions` |
| Priority | NORMAL |
| Trigger | Cron: `0 8 * * *` (daily at 08:00 UTC, business hours) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface MonitorCorrectiveActionItemsJobInput {
  company_id?: UUID;    // Optional: Process specific company
  batch_size?: number;  // Default: 200
}
```

### Execution Steps

```
Step 1: Query Action Items Needing Reminders
┌─────────────────────────────────────────────────────────────┐
│  -- Items due in 3 days OR already overdue                 │
│  SELECT cai.id AS item_id, cai.item_title,                 │
│         cai.due_date, cai.assigned_to,                      │
│         ca.id AS corrective_action_id,                      │
│         ca.corrective_action_name,                          │
│         u.email AS assignee_email,                          │
│         CURRENT_DATE - cai.due_date AS days_overdue        │
│  FROM corrective_action_items cai                          │
│  JOIN corrective_actions ca                                │
│    ON ca.id = cai.corrective_action_id                     │
│  JOIN users u ON u.id = cai.assigned_to                    │
│  WHERE cai.status IN ('PENDING', 'IN_PROGRESS')            │
│    AND (                                                    │
│      cai.due_date = CURRENT_DATE + INTERVAL '3 days'       │
│      OR cai.due_date <= CURRENT_DATE                       │
│    )                                                        │
│    AND (ca.company_id = :company_id                        │
│         OR :company_id IS NULL)                            │
│  ORDER BY cai.due_date ASC                                 │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Send Reminders to Assigned Users
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH item                                             │
│    -- Determine notification priority                      │
│    priority = (days_overdue > 0) ? 'URGENT' : 'HIGH'       │
│                                                             │
│    -- Create notification                                  │
│    INSERT INTO notifications (                             │
│      user_id, recipient_email, notification_type,         │
│      priority, subject, body_text,                         │
│      entity_type, entity_id, action_url                    │
│    ) VALUES (                                              │
│      :assigned_to, :assignee_email,                        │
│      CASE WHEN :days_overdue > 0                           │
│           THEN 'CORRECTIVE_ACTION_OVERDUE'                 │
│           ELSE 'CORRECTIVE_ACTION_DUE_SOON' END,           │
│      :priority,                                            │
│      CASE WHEN :days_overdue > 0                           │
│           THEN 'Corrective Action Item Overdue'            │
│           ELSE 'Corrective Action Item Due in 3 Days' END, │
│      :body_text, 'corrective_action_item', :item_id,       │
│      '/corrective-actions/:corrective_action_id/           │
│       items/:item_id'                                      │
│    );                                                      │
└─────────────────────────────────────────────────────────────┘

Step 3: Escalate Severely Overdue Items (> 7 days)
┌─────────────────────────────────────────────────────────────┐
│  -- Find items overdue by more than 7 days                 │
│  FOR EACH item WHERE days_overdue > 7                      │
│    -- Notify managers and admins                           │
│    INSERT INTO notifications (...)                         │
│    SELECT u.id, u.email FROM users u                       │
│    WHERE u.company_id = :company_id                        │
│      AND u.role IN ('MANAGER', 'ADMIN');                   │
└─────────────────────────────────────────────────────────────┘
```

### Reminder Rules

```typescript
// Reminder schedule
const REMINDER_RULES = {
  advance_notice_days: 3,        // Remind 3 days before due date
  overdue_reminder_frequency: 1, // Daily reminders when overdue
  escalation_threshold_days: 7,  // Escalate to managers after 7 days overdue
};

function determineNotificationPriority(daysOverdue: number): 'HIGH' | 'URGENT' {
  return daysOverdue > 0 ? 'URGENT' : 'HIGH';
}

function shouldEscalateToManagers(daysOverdue: number): boolean {
  return daysOverdue > 7;
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 200 items per batch |
| Job Duration | < 5 minutes |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Missing assignee | Escalate to manager | No |
| Notification failure | Log error, continue | No |

### Monitoring Metrics

- Total items monitored
- Reminders sent
- Overdue items
- Escalations to managers

---

## 10.2 Auto-Transition Corrective Actions Job

**Purpose:** Auto-transition corrective actions when all items complete.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AUTO_TRANSITION_CORRECTIVE_ACTIONS` |
| Queue | `corrective-actions` |
| Priority | NORMAL |
| Trigger | Cron: `0 * * * *` (every hour) |
| Timeout | 120 seconds (2 minutes) |
| Max Retries | 1 retry attempt (2 total attempts: 1 initial + 1 retry) |

### Input Parameters

```typescript
interface AutoTransitionCorrectiveActionsJobInput {
  company_id?: UUID;    // Optional: Process specific company
}
```

### Execution Steps

```
Step 1: Find Corrective Actions Ready for Transition
┌─────────────────────────────────────────────────────────────┐
│  -- Actions in ACTION phase with all items completed       │
│  SELECT ca.id AS corrective_action_id,                     │
│         ca.corrective_action_name,                          │
│         ca.created_by,                                      │
│         COUNT(cai.id) AS total_items,                      │
│         COUNT(cai.id) FILTER (                             │
│           WHERE cai.status = 'COMPLETED'                   │
│         ) AS completed_items                                │
│  FROM corrective_actions ca                                │
│  LEFT JOIN corrective_action_items cai                     │
│    ON cai.corrective_action_id = ca.id                     │
│  WHERE ca.lifecycle_phase = 'ACTION'                       │
│    AND ca.status = 'IN_PROGRESS'                           │
│    AND (ca.company_id = :company_id                        │
│         OR :company_id IS NULL)                            │
│  GROUP BY ca.id                                            │
│  HAVING COUNT(cai.id) > 0                                  │
│    AND COUNT(cai.id) FILTER (                              │
│         WHERE cai.status = 'COMPLETED') = COUNT(cai.id)    │
└─────────────────────────────────────────────────────────────┘

Step 2: Transition to RESOLUTION Phase
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH corrective_action                                │
│    UPDATE corrective_actions                               │
│    SET lifecycle_phase = 'RESOLUTION',                     │
│        updated_at = NOW()                                  │
│    WHERE id = :corrective_action_id;                       │
└─────────────────────────────────────────────────────────────┘

Step 3: Notify Action Owner
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO notifications (                               │
│    user_id, recipient_email, notification_type,           │
│    priority, subject, body_text,                           │
│    entity_type, entity_id, action_url                      │
│  ) VALUES (                                                │
│    :created_by, (SELECT email FROM users                   │
│                  WHERE id = :created_by),                  │
│    'CORRECTIVE_ACTION_READY_FOR_RESOLUTION', 'NORMAL',     │
│    'Corrective Action Ready for Resolution',               │
│    'All action items for :corrective_action_name have been │
│     completed. The corrective action is now ready for      │
│     resolution verification.', 'corrective_action',        │
│    :corrective_action_id,                                  │
│    '/corrective-actions/:corrective_action_id'             │
│  );                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Lifecycle Phase Transition

```typescript
// Corrective action lifecycle phases
enum LifecyclePhase {
  IDENTIFICATION = 'IDENTIFICATION',  // Initial identification
  ACTION = 'ACTION',                  // Implementing actions
  RESOLUTION = 'RESOLUTION',          // Verifying resolution
  CLOSED = 'CLOSED'                   // Completed and closed
}

// Auto-transition rule
function canAutoTransition(
  currentPhase: LifecyclePhase,
  allItemsCompleted: boolean
): boolean {
  return currentPhase === LifecyclePhase.ACTION && allItemsCompleted;
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Job Duration | < 2 minutes |
| Query Time | < 5 seconds |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Transition failure | Log error, retry | Yes |
| Missing owner | Skip notification | No |

---

# 11. Validation Jobs (Module 4)

**Reference:** Database Schema v1.3 - validation_rules and validation_executions tables

These jobs manage automated pre-validation of consignment notes for hazardous waste tracking.

## 11.1 Auto-Validate Consignment Notes Job

**Purpose:** Auto-run validation on newly created/updated consignments.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `AUTO_VALIDATE_CONSIGNMENT_NOTES` |
| Queue | `validation-processing` |
| Priority | NORMAL |
| Trigger | Cron: `*/5 * * * *` (every 5 minutes) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface AutoValidateConsignmentNotesJobInput {
  company_id?: UUID;    // Optional: Process specific company
  batch_size?: number;  // Default: 50
}
```

### Execution Steps

```
Step 1: Query Unvalidated Consignment Notes
┌─────────────────────────────────────────────────────────────┐
│  SELECT cn.id AS consignment_note_id, cn.company_id,       │
│         cn.waste_stream_id, cn.carrier_id,                  │
│         cn.consignment_date, cn.quantity, cn.unit,          │
│         cn.ewc_code, cn.destination_site_id                 │
│  FROM consignment_notes cn                                 │
│  WHERE cn.pre_validation_status = 'NOT_VALIDATED'          │
│    AND (cn.company_id = :company_id                        │
│         OR :company_id IS NULL)                            │
│  ORDER BY cn.created_at ASC                                │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Fetch Applicable Validation Rules
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH consignment_note                                 │
│    SELECT vr.* FROM validation_rules vr                    │
│    WHERE vr.company_id = :consignment_note.company_id      │
│      AND vr.is_active = true                               │
│      AND (                                                  │
│        vr.waste_stream_id = :consignment_note.             │
│                              waste_stream_id               │
│        OR vr.waste_stream_id IS NULL                       │
│      )                                                      │
│    ORDER BY vr.waste_stream_id NULLS LAST;                 │
│                                                             │
│    -- Waste-stream-specific rules take precedence          │
└─────────────────────────────────────────────────────────────┘

Step 3: Execute Each Validation Rule
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH validation_rule                                  │
│    3a. Execute rule based on rule_type:                    │
│                                                             │
│    CARRIER_LICENCE:                                        │
│      -- Check if carrier has valid waste carrier licence   │
│      SELECT licence_number, expiry_date                    │
│      FROM contractors                                      │
│      WHERE id = :carrier_id                                │
│        AND licence_expiry_date >= CURRENT_DATE;            │
│      result = (licence_number IS NOT NULL AND              │
│                expiry_date >= consignment_date)            │
│                ? 'PASS' : 'FAIL'                           │
│                                                             │
│    VOLUME_LIMIT:                                           │
│      -- Check if quantity within allowed limit             │
│      max_volume = rule_config->>'max_volume'               │
│      result = (quantity <= max_volume) ? 'PASS' : 'FAIL'   │
│                                                             │
│    STORAGE_DURATION:                                       │
│      -- Check storage duration limits                      │
│      max_days = rule_config->>'max_storage_days'           │
│      storage_days = CURRENT_DATE - consignment_date        │
│      result = (storage_days <= max_days) ? 'PASS' : 'FAIL' │
│                                                             │
│    EWC_CODE:                                               │
│      -- Validate EWC code format and approval              │
│      result = validate_ewc_code(ewc_code, rule_config)     │
│                                                             │
│    DESTINATION:                                            │
│      -- Validate destination site                          │
│      result = validate_destination_site(                   │
│                 destination_site_id, rule_config)          │
│                                                             │
│    CUSTOM:                                                 │
│      -- Execute custom validation logic                    │
│      result = execute_custom_validation(                   │
│                 consignment_note, rule_config)             │
│                                                             │
│    3b. Record execution result:                            │
│    INSERT INTO validation_executions (                     │
│      validation_rule_id, entity_type, entity_id,          │
│      execution_date, result, error_message                 │
│    ) VALUES (                                              │
│      :validation_rule_id, 'CONSIGNMENT_NOTE',              │
│      :consignment_note_id, NOW(), :result,                 │
│      :error_message                                        │
│    );                                                      │
└─────────────────────────────────────────────────────────────┘

Step 4: Aggregate Validation Results
┌─────────────────────────────────────────────────────────────┐
│  4a. Determine overall validation status:                  │
│      IF any ERROR severity rule failed THEN                │
│        pre_validation_status = 'FAILED'                    │
│      ELSIF all rules passed THEN                           │
│        pre_validation_status = 'PASSED'                    │
│      ELSE                                                   │
│        pre_validation_status = 'PASSED_WITH_WARNINGS'      │
│                                                             │
│  4b. Collect error messages:                               │
│      pre_validation_errors = ARRAY_AGG(                    │
│        error_message WHERE result = 'FAIL'                 │
│      )                                                      │
│                                                             │
│  4c. Update consignment note:                              │
│      UPDATE consignment_notes                              │
│      SET pre_validation_status = :status,                  │
│          pre_validation_errors = :errors,                  │
│          pre_validated_at = NOW(),                         │
│          updated_at = NOW()                                │
│      WHERE id = :consignment_note_id;                      │
└─────────────────────────────────────────────────────────────┘

Step 5: Notify on Validation Failure
┌─────────────────────────────────────────────────────────────┐
│  IF pre_validation_status = 'FAILED' THEN                  │
│    INSERT INTO notifications (                             │
│      user_id, notification_type, priority,                 │
│      subject, body_text, entity_type, entity_id            │
│    ) VALUES (                                              │
│      :created_by, 'VALIDATION_FAILED', 'HIGH',             │
│      'Consignment Note Validation Failed',                 │
│      :error_details, 'consignment_note',                   │
│      :consignment_note_id                                  │
│    );                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Validation Rule Types

```typescript
enum ValidationRuleType {
  CARRIER_LICENCE = 'CARRIER_LICENCE',    // Verify carrier has valid licence
  VOLUME_LIMIT = 'VOLUME_LIMIT',          // Check quantity limits
  STORAGE_DURATION = 'STORAGE_DURATION',  // Check storage time limits
  EWC_CODE = 'EWC_CODE',                  // Validate waste code
  DESTINATION = 'DESTINATION',            // Validate destination site
  CUSTOM = 'CUSTOM'                       // Custom validation logic
}

enum ValidationSeverity {
  ERROR = 'ERROR',      // Blocks submission
  WARNING = 'WARNING',  // Warns user but allows submission
  INFO = 'INFO'         // Informational only
}
```

### Example Rule Configurations

```typescript
// VOLUME_LIMIT rule config
{
  "max_volume": 100,
  "unit": "TONNES",
  "error_message": "Quantity exceeds maximum allowed volume of 100 tonnes"
}

// STORAGE_DURATION rule config
{
  "max_storage_days": 30,
  "error_message": "Waste storage duration exceeds 30-day limit"
}

// CARRIER_LICENCE rule config
{
  "require_upper_tier": true,
  "error_message": "Carrier must have valid upper-tier waste carrier licence"
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 50 consignments per batch |
| Validation Time | < 2 seconds per consignment |
| Job Duration | < 5 minutes |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Rule execution error | Log error, mark as FAILED | No |
| Missing rule config | Skip rule, log warning | No |
| Database error | Retry with backoff | Yes |

### Monitoring Metrics

- Total consignments validated
- Validation status (PASSED/FAILED/WARNINGS)
- Failed validations by rule type
- Processing duration

---

# 12. Runtime Monitoring Jobs (Module 3)

**Reference:** Database Schema v1.3 - runtime_monitoring table enhancements with run_date, run_duration, reason_code, evidence_linkage_id, and job_escalation flags

These jobs manage alerts for manual runtime entries pending validation and check for threshold exceedances.

## 12.1 Flag Pending Runtime Validations Job

**Purpose:** Alert managers about manual runtime entries pending validation.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `FLAG_PENDING_RUNTIME_VALIDATIONS` |
| Queue | `runtime-monitoring` |
| Priority | NORMAL |
| Trigger | Cron: `0 10 * * *` (daily at 10:00 UTC, business hours) |
| Timeout | 120 seconds (2 minutes) |
| Max Retries | 1 retry attempt (2 total attempts: 1 initial + 1 retry) |

### Input Parameters

```typescript
interface FlagPendingRuntimeValidationsJobInput {
  company_id?: UUID;         // Optional: Process specific company
  pending_threshold_hours?: number;  // Default: 24
}
```

### Execution Steps

```
Step 1: Query Pending Manual Entries
┌─────────────────────────────────────────────────────────────┐
│  SELECT rm.id AS runtime_id, rm.generator_id,              │
│         rm.run_date, rm.runtime_hours,                      │
│         rm.reason_code, rm.entry_reason_notes,               │
│         g.generator_identifier, g.site_id,                  │
│         COUNT(*) OVER (PARTITION BY rm.generator_id)         │
│           AS pending_count                                   │
│  FROM runtime_monitoring rm                                │
│  JOIN generators g ON g.id = rm.generator_id               │
│  WHERE rm.validation_status = 'PENDING'                    │
│    AND rm.data_source = 'MANUAL'                           │
│    AND rm.created_at < NOW() -                             │
│        INTERVAL ':pending_threshold_hours hours'           │
│    AND (g.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
│  ORDER BY g.id, rm.run_date DESC                           │
└─────────────────────────────────────────────────────────────┘

Step 2: Group by Generator
┌─────────────────────────────────────────────────────────────┐
│  -- Aggregate pending entries by generator                 │
│  SELECT generator_id, generator_identifier, site_id,      │
│         ARRAY_AGG(runtime_id) AS pending_entries,            │
│         COUNT(*) AS pending_count,                          │
│         MIN(run_date) AS oldest_entry_date                  │
│  FROM pending_entries                                      │
│  GROUP BY generator_id, generator_identifier, site_id       │
│  HAVING COUNT(*) > 0                                       │
└─────────────────────────────────────────────────────────────┘

Step 3: Send Manager Notifications
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH generator_group                                  │
│    -- Find managers for site                               │
│    SELECT u.id, u.email FROM users u                       │
│    JOIN sites s ON s.company_id = u.company_id             │
│    WHERE s.id = :site_id                                   │
│      AND u.role IN ('MANAGER', 'ADMIN');                   │
│                                                             │
│    FOR EACH manager                                        │
│      INSERT INTO notifications (                           │
│        user_id, recipient_email, notification_type,       │
│        priority, subject, body_text,                       │
│        entity_type, entity_id, metadata                    │
│      ) VALUES (                                            │
│        :manager_id, :manager_email,                        │
│        'RUNTIME_VALIDATION_PENDING', 'NORMAL',             │
│        ':pending_count Manual Runtime Entries Pending      │
│         Validation', 'Generator :generator_identifier has  │
│         :pending_count manual runtime entries pending       │
│         validation. Oldest entry: :oldest_entry_date.     │
│         Please review and validate.', 'generator',         │
│        :generator_id,                                      │
│        jsonb_build_object(                                 │
│          'pending_count', :pending_count,                  │
│          'oldest_entry_date', :oldest_entry_date,          │
│          'pending_entry_ids', :pending_entries             │
│        )                                                   │
│      );                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Validation Status Flow

```typescript
enum ValidationStatus {
  PENDING = 'PENDING',            // Manual entry awaiting validation
  APPROVED = 'APPROVED',           // Manager approved
  REJECTED = 'REJECTED'           // Manager rejected
}

// Entry requires validation if:
// - data_source = 'MANUAL'
// - validation_status = 'PENDING'
// - created_at > 24 hours ago
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Job Duration | < 2 minutes |
| Query Time | < 5 seconds |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| No managers found | Log warning, skip site | No |
| Notification failure | Log error, continue | No |

### Monitoring Metrics

- Total pending entries flagged
- Generators with pending validations
- Notifications sent to managers

---

## 12.2 Check Runtime Exceedances Job

**Purpose:** Check runtime monitoring entries for threshold exceedances, set escalation flags, update Compliance Clock, and send notifications.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `CHECK_RUNTIME_EXCEEDANCES` |
| Queue | `runtime-monitoring` |
| Priority | HIGH |
| Trigger | Cron: `0 * * * *` (every hour) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface CheckRuntimeExceedancesJobInput {
  company_id?: UUID;         // Optional: Process specific company
  generator_id?: UUID;       // Optional: Process specific generator
  batch_size?: number;       // Default: 100
}
```

### Execution Steps

```
Step 1: Query Recent Runtime Entries (Not Yet Checked)
┌─────────────────────────────────────────────────────────────┐
│  SELECT rm.id AS runtime_id, rm.generator_id,              │
│         rm.run_date, rm.runtime_hours,                      │
│         rm.reason_code, rm.company_id, rm.site_id,          │
│         g.generator_identifier, g.annual_run_hour_limit,    │
│         g.monthly_run_hour_limit,                           │
│         g.current_year_hours, g.current_month_hours,        │
│         g.anniversary_date                                   │
│  FROM runtime_monitoring rm                                │
│  JOIN generators g ON g.id = rm.generator_id               │
│  WHERE rm.validation_status = 'APPROVED'                   │
│    AND (rm.job_escalation_notification_sent = false         │
│         OR rm.job_escalation_notification_sent IS NULL)     │
│    AND rm.created_at >= NOW() - INTERVAL '7 days'          │
│    AND (g.company_id = :company_id                          │
│         OR :company_id IS NULL)                             │
│    AND (rm.generator_id = :generator_id                     │
│         OR :generator_id IS NULL)                           │
│  ORDER BY rm.run_date DESC                                  │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Calculate Exceedances for Each Entry
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH runtime_entry                                    │
│    -- Calculate annual percentage                           │
│    annual_percentage = (current_year_hours /                │
│                        annual_run_hour_limit) * 100         │
│                                                             │
│    -- Calculate monthly percentage                          │
│    IF monthly_run_hour_limit IS NOT NULL THEN              │
│      monthly_percentage = (current_month_hours /            │
│                           monthly_run_hour_limit) * 100     │
│    END IF                                                   │
│                                                             │
│    -- Check threshold exceedances                           │
│    threshold_exceeded = (annual_percentage >= 90 OR        │
│                          (monthly_percentage IS NOT NULL    │
│                           AND monthly_percentage >= 90))    │
│                                                             │
│    annual_limit_exceeded = (annual_percentage >= 100)       │
│                                                             │
│    monthly_limit_exceeded = (monthly_percentage IS NOT NULL │
│                              AND monthly_percentage >= 100)  │
└─────────────────────────────────────────────────────────────┘

Step 3: Update Escalation Flags
┌─────────────────────────────────────────────────────────────┐
│  UPDATE runtime_monitoring                                  │
│  SET job_escalation_threshold_exceeded = :threshold_exceeded,
│      job_escalation_annual_limit_exceeded = :annual_limit_exceeded,
│      job_escalation_monthly_limit_exceeded = :monthly_limit_exceeded,
│      updated_at = NOW()                                    │
│  WHERE id = :runtime_id                                     │
└─────────────────────────────────────────────────────────────┘

Step 4: Update Compliance Clock for Exceedances
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH exceedance                                       │
│    -- Find or create compliance clock for generator         │
│    INSERT INTO compliance_clocks_universal (                │
│      company_id, site_id, module_id,                        │
│      entity_type, entity_id,                                │
│      clock_type, target_date,                               │
│      days_remaining, status, criticality,                   │
│      metadata                                                │
│    ) VALUES (                                               │
│      :company_id, :site_id, 'MODULE_3',                     │
│      'generator', :generator_id,                            │
│      CASE                                                    │
│        WHEN :annual_limit_exceeded THEN 'ANNUAL_LIMIT_EXCEEDED'
│        WHEN :monthly_limit_exceeded THEN 'MONTHLY_LIMIT_EXCEEDED'
│        ELSE 'THRESHOLD_EXCEEDED'                            │
│      END,                                                   │
│      CURRENT_DATE,                                          │
│      0, -- Days remaining (0 = overdue)                     │
│      'ACTIVE',                                               │
│      'RED', -- Criticality                                   │
│      jsonb_build_object(                                    │
│        'runtime_entry_id', :runtime_id,                     │
│        'run_date', :run_date,                               │
│        'runtime_hours', :runtime_hours,                     │
│        'annual_percentage', :annual_percentage,            │
│        'monthly_percentage', :monthly_percentage           │
│      )                                                      │
│    )                                                        │
│    ON CONFLICT (entity_type, entity_id, clock_type)         │
│    DO UPDATE SET                                            │
│      days_remaining = 0,                                    │
│      status = 'ACTIVE',                                     │
│      criticality = 'RED',                                   │
│      metadata = EXCLUDED.metadata,                         │
│      updated_at = NOW()                                    │
└─────────────────────────────────────────────────────────────┘

Step 5: Send Exceedance Notifications
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH exceedance WHERE notification not sent           │
│    -- Find managers and admins for site                     │
│    SELECT u.id, u.email FROM users u                       │
│    JOIN sites s ON s.company_id = u.company_id             │
│    WHERE s.id = :site_id                                   │
│      AND u.role IN ('MANAGER', 'ADMIN', 'OWNER')           │
│                                                             │
│    FOR EACH recipient                                       │
│      INSERT INTO notifications (                           │
│        user_id, recipient_email, notification_type,         │
│        priority, subject, body_text,                       │
│        entity_type, entity_id, metadata                    │
│      ) VALUES (                                            │
│        :user_id, :email,                                   │
│        'RUNTIME_EXCEEDANCE', 'HIGH',                       │
│        'Generator Runtime Limit Exceeded: :generator_identifier',
│        'Generator :generator_identifier has exceeded its   │
│         runtime limit. Run date: :run_date.                 │
│         Annual: :annual_percentage% of limit.               │
│         Monthly: :monthly_percentage% of limit.            │
│         Please review and take corrective action.',        │
│        'generator', :generator_id,                         │
│        jsonb_build_object(                                 │
│          'runtime_entry_id', :runtime_id,                   │
│          'exceedance_type', :exceedance_type,               │
│          'annual_percentage', :annual_percentage,          │
│          'monthly_percentage', :monthly_percentage          │
│        )                                                   │
│      );                                                    │
│                                                             │
│    -- Mark notification as sent                             │
│    UPDATE runtime_monitoring                                │
│    SET job_escalation_notification_sent = true,            │
│        updated_at = NOW()                                  │
│    WHERE id = :runtime_id                                  │
└─────────────────────────────────────────────────────────────┘
```

### Exceedance Types

```typescript
enum ExceedanceType {
  THRESHOLD_EXCEEDED = 'THRESHOLD_EXCEEDED',        // >= 90% of limit
  ANNUAL_LIMIT_EXCEEDED = 'ANNUAL_LIMIT_EXCEEDED',  // >= 100% of annual limit
  MONTHLY_LIMIT_EXCEEDED = 'MONTHLY_LIMIT_EXCEEDED' // >= 100% of monthly limit
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Job Duration | < 5 minutes |
| Query Time | < 10 seconds |
| Batch Processing | 100 entries per batch |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Generator not found | Log error, skip entry | No |
| Compliance clock update failure | Log error, continue | Yes |
| Notification failure | Log error, continue | No |

### Monitoring Metrics

- Total runtime entries checked
- Exceedances detected (by type)
- Compliance clocks updated
- Notifications sent
- Escalation flags set

---

# 13. SLA Timer Jobs

**Reference:** Database Schema v1.3 - deadlines table SLA tracking fields

These jobs track SLA breach duration for overdue deadlines.

## 13.1 Update SLA Breach Timers Job

**Purpose:** Track SLA breach duration for overdue deadlines.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `UPDATE_SLA_BREACH_TIMERS` |
| Queue | `sla-breach-alerts` |
| Priority | HIGH |
| Trigger | Cron: `0 * * * *` (every hour) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface UpdateSLABreachTimersJobInput {
  company_id?: UUID;    // Optional: Process specific company
  batch_size?: number;  // Default: 500
}
```

### Execution Steps

```
Step 1: Query Overdue Deadlines with SLA Breach
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.id AS deadline_id, d.obligation_id,              │
│         d.due_date, d.sla_target_date,                      │
│         d.sla_breached_at, d.sla_breach_duration_hours,     │
│         o.summary AS obligation_summary,                    │
│         o.assigned_to                                       │
│  FROM deadlines d                                          │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  WHERE d.sla_breached_at IS NOT NULL                       │
│    AND d.status = 'OVERDUE'                                │
│    AND (d.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
│  ORDER BY d.sla_breached_at ASC                            │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Calculate Breach Duration
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH deadline                                         │
│    -- Calculate hours since SLA breach                     │
│    sla_breach_duration_hours =                             │
│      EXTRACT(EPOCH FROM (NOW() - sla_breached_at)) / 3600  │
└─────────────────────────────────────────────────────────────┘

Step 3: Batch Update Breach Durations
┌─────────────────────────────────────────────────────────────┐
│  UPDATE deadlines d                                        │
│  SET sla_breach_duration_hours =                           │
│      EXTRACT(EPOCH FROM (NOW() - d.sla_breached_at)) /     │
│      3600,                                                  │
│      updated_at = NOW()                                    │
│  WHERE d.sla_breached_at IS NOT NULL                       │
│    AND d.status = 'OVERDUE'                                │
│    AND (d.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
└─────────────────────────────────────────────────────────────┘

Step 4: Escalate Long-Running Breaches
┌─────────────────────────────────────────────────────────────┐
│  -- Find breaches > 24 hours                               │
│  SELECT d.id, d.obligation_id,                             │
│         d.sla_breach_duration_hours,                        │
│         o.assigned_to, o.company_id                         │
│  FROM deadlines d                                          │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  WHERE d.sla_breach_duration_hours > 24                    │
│    AND d.status = 'OVERDUE';                               │
│                                                             │
│  FOR EACH breach                                           │
│    -- Escalate to managers                                 │
│    INSERT INTO notifications (                             │
│      user_id, notification_type, priority,                 │
│      subject, body_text, entity_type, entity_id            │
│    )                                                        │
│    SELECT u.id, 'SLA_BREACH_ESCALATION', 'URGENT',         │
│           'SLA Breach Exceeds 24 Hours',                   │
│           'Obligation ":obligation_summary" has been in    │
│            SLA breach for :breach_hours hours.',           │
│           'deadline', :deadline_id                         │
│    FROM users u                                            │
│    WHERE u.company_id = :company_id                        │
│      AND u.role IN ('MANAGER', 'ADMIN');                   │
└─────────────────────────────────────────────────────────────┘
```

### SLA Breach Tracking

```typescript
// When a deadline becomes overdue
function markSLABreach(deadline: Deadline): void {
  if (deadline.sla_target_date &&
      currentDate > deadline.sla_target_date &&
      !deadline.sla_breached_at) {
    deadline.sla_breached_at = currentDate;
    deadline.sla_breach_duration_hours = 0;
  }
}

// Calculate breach duration
function calculateBreachDuration(breachedAt: Date): number {
  const now = new Date();
  const durationMs = now.getTime() - breachedAt.getTime();
  return durationMs / (1000 * 60 * 60); // Convert to hours
}

// Escalation thresholds
const SLA_ESCALATION_THRESHOLDS = {
  warning: 12,   // Warn at 12 hours
  urgent: 24,    // Escalate to managers at 24 hours
  critical: 48   // Escalate to admins at 48 hours
};
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 500 deadlines per batch |
| Job Duration | < 5 minutes |
| Update Speed | < 1 second per batch update |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Calculation error | Log error, continue | No |
| Database error | Retry with backoff | Yes |
| Notification failure | Log error, continue | No |

### Monitoring Metrics

- Total breached deadlines tracked
- Average breach duration
- Breaches by duration bucket (<24h, 24-48h, >48h)
- Escalations sent

---

## 13.2 Detect Breaches and Trigger Alerts Job

**Purpose:** Detect compliance breaches (deadlines passed without completion) and SLA misses, then trigger critical notifications with deep links.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `DETECT_BREACHES_AND_ALERTS` |
| Queue | `sla-breach-alerts` |
| Priority | HIGH |
| Trigger | Cron: `*/15 * * * *` (every 15 minutes) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface DetectBreachesAndAlertsJobInput {
  company_id?: UUID;    // Optional: Process specific company
  batch_size?: number;  // Default: 500
}
```

### Execution Steps

```
Step 1: Query Breached Deadlines (Regulatory Deadline Passed)
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.id AS deadline_id, d.obligation_id,              │
│         d.due_date, d.status,                               │
│         o.id AS obligation_id, o.summary AS obligation_title,│
│         o.assigned_to, o.site_id, o.company_id,            │
│         s.name AS site_name, c.name AS company_name,        │
│         d.sla_target_date, d.sla_breached_at,               │
│         EXTRACT(EPOCH FROM (NOW() - d.due_date)) / 86400    │
│           AS days_overdue                                    │
│  FROM deadlines d                                          │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  JOIN sites s ON s.id = o.site_id                          │
│  JOIN companies c ON c.id = o.company_id                     │
│  WHERE d.status = 'OVERDUE'                                │
│    AND d.due_date < NOW()                                  │
│    AND d.breach_notification_sent = false                  │
│    AND (d.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
│  ORDER BY d.due_date ASC                                   │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Check for Missing Evidence
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH breached deadline                                │
│    -- Check if obligation has required evidence            │
│    evidence_count = SELECT COUNT(*)                        │
│      FROM obligation_evidence_links oel                    │
│      JOIN evidence_items ei ON ei.id = oel.evidence_id     │
│      WHERE oel.obligation_id = :obligation_id              │
│        AND ei.is_archived = false                          │
│        AND ei.validation_status = 'APPROVED'               │
│                                                             │
│    -- Check if evidence is required                        │
│    evidence_required = SELECT evidence_required            │
│      FROM obligations                                       │
│      WHERE id = :obligation_id                             │
│                                                             │
│    IF evidence_required = true AND evidence_count = 0      │
│      THEN notification_type = 'REGULATORY_DEADLINE_BREACH' │
│      ELSE notification_type = 'COMPLIANCE_BREACH_DETECTED'  │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Breach Notifications
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH breached deadline                                │
│    -- Get recipients (assignee + managers + admins)         │
│    recipients = SELECT u.id, u.email, u.phone, ur.role      │
│      FROM users u                                           │
│      JOIN user_roles ur ON ur.user_id = u.id                │
│      WHERE (u.id = :assigned_to                            │
│             OR u.company_id = :company_id                  │
│                AND ur.role IN ('ADMIN', 'OWNER'))          │
│                                                             │
│    -- Create notification for each recipient               │
│    FOR EACH recipient                                       │
│      INSERT INTO notifications (                            │
│        user_id, company_id, site_id,                        │
│        recipient_email, recipient_phone,                    │
│        notification_type, channel, priority, severity,      │
│        subject, body_html, body_text,                       │
│        variables, entity_type, entity_id,                   │
│        obligation_id, action_url,                           │
│        status, scheduled_for                                │
│      ) VALUES (                                             │
│        :user_id, :company_id, :site_id,                     │
│        :email, :phone,                                      │
│        :notification_type,                                  │
│        CASE WHEN :severity = 'CRITICAL'                     │
│          THEN 'EMAIL, SMS, IN_APP'                          │
│          ELSE 'EMAIL, IN_APP' END,                          │
│        'CRITICAL', 'CRITICAL',                              │
│        :subject, :body_html, :body_text,                    │
│        :variables::JSONB,                                   │
│        'deadline', :deadline_id,                            │
│        :obligation_id,                                      │
│        'https://app.epcompliance.com/sites/' ||            │
│          :site_id || '/obligations/' || :obligation_id,    │
│        'PENDING', NOW()                                     │
│      )                                                       │
└─────────────────────────────────────────────────────────────┘

Step 4: Mark Notification as Sent
┌─────────────────────────────────────────────────────────────┐
│  UPDATE deadlines                                           │
│  SET breach_notification_sent = true,                       │
│      breach_detected_at = NOW()                            │
│  WHERE id = :deadline_id                                    │
└─────────────────────────────────────────────────────────────┘

Step 5: Detect SLA Misses (SLA Target Date Passed)
┌─────────────────────────────────────────────────────────────┐
│  SELECT d.id AS deadline_id, d.obligation_id,              │
│         d.sla_target_date, d.sla_breached_at,                │
│         o.summary AS obligation_title,                      │
│         o.site_id, o.company_id,                           │
│         EXTRACT(EPOCH FROM (NOW() - d.sla_target_date)) /   │
│           3600 AS sla_breach_hours                          │
│  FROM deadlines d                                          │
│  JOIN obligations o ON o.id = d.obligation_id              │
│  WHERE d.sla_target_date IS NOT NULL                       │
│    AND d.sla_target_date < NOW()                           │
│    AND d.sla_breached_at IS NULL                           │
│    AND d.status != 'COMPLETED'                             │
│    AND (d.company_id = :company_id                         │
│         OR :company_id IS NULL)                            │
│  ORDER BY d.sla_target_date ASC                            │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 6: Create SLA Breach Notifications
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH SLA miss                                          │
│    -- Mark SLA as breached                                 │
│    UPDATE deadlines                                        │
│    SET sla_breached_at = NOW(),                            │
│        sla_breach_duration_hours = 0                       │
│    WHERE id = :deadline_id                                 │
│                                                             │
│    -- Create SLA_BREACH_DETECTED notification              │
│    (Same notification creation logic as Step 3,            │
│     but with notification_type = 'SLA_BREACH_DETECTED')   │
└─────────────────────────────────────────────────────────────┘
```

### Notification Variables

```typescript
interface BreachNotificationVariables {
  obligation_title: string;
  obligation_id: UUID;
  deadline_id: UUID;
  deadline_date: string; // Formatted date
  days_overdue: number;
  site_name: string;
  company_name: string;
  regulator_name?: string;
  action_url: string; // REQUIRED: Deep link to obligation
  evidence_upload_url?: string;
  unsubscribe_url: string;
}

interface SLABreachNotificationVariables {
  deadline_title: string;
  deadline_id: UUID;
  obligation_id: UUID;
  site_name: string;
  company_name: string;
  sla_target_date: string;
  due_date: string;
  days_to_due_date: number;
  sla_breach_hours: number;
  action_url: string; // REQUIRED: Deep link to obligation
  unsubscribe_url: string;
}
```

### Severity Level Assignment

```typescript
function determineSeverity(deadline: Deadline, daysOverdue: number): 'INFO' | 'WARNING' | 'CRITICAL' {
  // Regulatory deadline breach is always CRITICAL
  if (deadline.due_date < NOW()) {
    return 'CRITICAL';
  }
  
  // SLA breach severity based on duration
  if (deadline.sla_breach_duration_hours > 48) {
    return 'CRITICAL';
  } else if (deadline.sla_breach_duration_hours > 24) {
    return 'WARNING';
  } else {
    return 'INFO';
  }
}
```

### Deep Link Generation

```typescript
function generateActionUrl(siteId: UUID, obligationId: UUID, evidenceId?: UUID): string {
  const baseUrl = process.env.APP_URL || 'https://app.epcompliance.com';
  
  if (evidenceId) {
    return `${baseUrl}/sites/${siteId}/obligations/${obligationId}/evidence/${evidenceId}`;
  }
  
  return `${baseUrl}/sites/${siteId}/obligations/${obligationId}`;
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 500 deadlines per batch |
| Job Duration | < 5 minutes |
| Notification Creation | < 100ms per notification |
| Breach Detection Accuracy | 100% (all breaches detected) |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Database query error | Retry with backoff | Yes |
| Notification creation failure | Log error, continue with next | No |
| Missing obligation data | Skip deadline, log warning | No |
| Missing action_url | Generate default URL, log warning | No |

### Monitoring Metrics

- Total breaches detected
- Breaches by type (regulatory deadline vs SLA)
- Notifications sent per breach
- Average time to breach detection
- Breaches resolved after notification

### Integration with Notification System

This job MUST trigger notifications for:
- **All regulatory deadline breaches** (deadline passed without completion)
- **All SLA misses** (SLA target date passed without completion)

Notifications MUST include:
- **Severity level:** CRITICAL for breaches, WARNING/CRITICAL for SLA misses
- **Deep links:** `action_url` pointing to obligation detail page
- **Obligation reference:** `obligation_id` for linking
- **Evidence reference:** `evidence_id` if evidence is missing

**Reference:** Notification Specification Section 2.19 (Breach Detection Templates)

---

# 14. Trigger Execution Jobs

**Reference:** Database Schema v1.3 - recurrence_trigger_rules and recurrence_trigger_executions tables

These jobs execute event-based and conditional triggers for automated schedule/deadline creation.

## 14.1 Execute Pending Recurrence Triggers Job

**Purpose:** Execute scheduled recurrence triggers based on next_execution_date.

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `EXECUTE_PENDING_RECURRENCE_TRIGGERS` |
| Queue | `trigger-execution` |
| Priority | NORMAL |
| Trigger | Cron: `0 * * * *` (every hour) |
| Timeout | 300 seconds (5 minutes) |
| Max Retries | 2 retry attempts (3 total attempts: 1 initial + 2 retries) |

### Input Parameters

```typescript
interface ExecutePendingRecurrenceTriggersJobInput {
  company_id?: UUID;    // Optional: Process specific company
  batch_size?: number;  // Default: 100
}
```

### Execution Steps

```
Step 1: Query Triggers Ready for Execution
┌─────────────────────────────────────────────────────────────┐
│  SELECT rtr.id AS trigger_rule_id, rtr.company_id,         │
│         rtr.rule_name, rtr.trigger_type,                    │
│         rtr.trigger_expression, rtr.rule_config,            │
│         rtr.target_entity_type, rtr.template_data,          │
│         rtr.execution_count, rtr.last_executed_at           │
│  FROM recurrence_trigger_rules rtr                         │
│  WHERE rtr.is_active = true                                │
│    AND rtr.next_execution_date <= CURRENT_DATE             │
│    AND (rtr.company_id = :company_id                       │
│         OR :company_id IS NULL)                            │
│  ORDER BY rtr.next_execution_date ASC                      │
│  LIMIT :batch_size                                         │
└─────────────────────────────────────────────────────────────┘

Step 2: Evaluate Trigger Expression
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH trigger_rule                                     │
│    2a. Evaluate trigger based on trigger_type:             │
│                                                             │
│    SCHEDULED:                                              │
│      -- Check if current date matches schedule             │
│      should_fire = (CURRENT_DATE >= next_execution_date)   │
│                                                             │
│    EVENT_BASED:                                            │
│      -- Check for triggering events                        │
│      SELECT * FROM recurrence_events                       │
│      WHERE event_type = :trigger_expression                │
│        AND occurred_at >= :last_executed_at                │
│        AND occurred_at <= NOW();                           │
│      should_fire = (event_count > 0)                       │
│                                                             │
│    CONDITIONAL:                                            │
│      -- Evaluate condition from rule_config                │
│      should_fire = evaluate_condition(                     │
│        trigger_expression, rule_config)                    │
│                                                             │
│    2b. If should_fire = true, proceed to Step 3            │
└─────────────────────────────────────────────────────────────┘

Step 3: Create Target Entity
┌─────────────────────────────────────────────────────────────┐
│  3a. Determine target entity type:                         │
│      IF target_entity_type = 'SCHEDULE' THEN               │
│        -- Create schedule record                           │
│        INSERT INTO schedules (                             │
│          obligation_id, frequency, base_date,              │
│          next_due_date, status                             │
│        ) VALUES (...template_data...)                      │
│        RETURNING id INTO new_schedule_id;                  │
│                                                             │
│      ELSIF target_entity_type = 'DEADLINE' THEN            │
│        -- Create deadline record                           │
│        INSERT INTO deadlines (                             │
│          obligation_id, schedule_id, due_date,             │
│          status, compliance_period_start,                  │
│          compliance_period_end                             │
│        ) VALUES (...template_data...)                      │
│        RETURNING id INTO new_deadline_id;                  │
│                                                             │
│  3b. Calculate next_due_date from template_data            │
└─────────────────────────────────────────────────────────────┘

Step 4: Record Trigger Execution
┌─────────────────────────────────────────────────────────────┐
│  INSERT INTO recurrence_trigger_executions (               │
│    trigger_rule_id, event_id, schedule_id,                 │
│    execution_date, next_due_date,                          │
│    execution_result, execution_data                        │
│  ) VALUES (                                                │
│    :trigger_rule_id,                                       │
│    :event_id,  -- NULL if not event-based                 │
│    :new_schedule_id OR :new_deadline_id,                   │
│    NOW(), :calculated_next_due_date,                       │
│    CASE WHEN successful THEN 'SUCCESS'                     │
│         WHEN skipped THEN 'SKIPPED'                        │
│         ELSE 'FAILED' END,                                 │
│    jsonb_build_object(                                     │
│      'created_entity_type', :target_entity_type,           │
│      'created_entity_id', :new_entity_id,                  │
│      'execution_context', :context                         │
│    )                                                       │
│  );                                                        │
└─────────────────────────────────────────────────────────────┘

Step 5: Update Trigger Rule
┌─────────────────────────────────────────────────────────────┐
│  UPDATE recurrence_trigger_rules                           │
│  SET last_executed_at = NOW(),                             │
│      execution_count = execution_count + 1,                │
│      next_execution_date = calculate_next_execution_date(  │
│        rule_config, CURRENT_DATE),                         │
│      updated_at = NOW()                                    │
│  WHERE id = :trigger_rule_id;                              │
└─────────────────────────────────────────────────────────────┘
```

### Trigger Types

```typescript
enum TriggerType {
  SCHEDULED = 'SCHEDULED',      // Time-based trigger (e.g., monthly)
  EVENT_BASED = 'EVENT_BASED',  // Triggered by system events
  CONDITIONAL = 'CONDITIONAL'   // Triggered when condition is met
}

// Example trigger expressions
const TRIGGER_EXPRESSIONS = {
  SCHEDULED: 'MONTHLY_ON_DAY_1',
  EVENT_BASED: 'PERMIT_APPROVED',
  CONDITIONAL: 'VOLUME_EXCEEDS_THRESHOLD'
};
```

### Rule Configuration Examples

```typescript
// SCHEDULED trigger config
{
  "frequency": "MONTHLY",
  "day_of_month": 1,
  "create_advance_days": 7,  // Create 7 days before due date
  "template_data": {
    "obligation_id": "uuid",
    "frequency": "MONTHLY"
  }
}

// EVENT_BASED trigger config
{
  "event_types": ["PERMIT_APPROVED", "VARIATION_APPROVED"],
  "delay_days": 30,  // Create deadline 30 days after event
  "template_data": {
    "obligation_id": "uuid",
    "relative_to_event": true
  }
}

// CONDITIONAL trigger config
{
  "condition": "waste_volume > threshold",
  "threshold_value": 1000,
  "check_frequency": "DAILY",
  "template_data": {
    "obligation_id": "uuid",
    "triggered_by_condition": true
  }
}
```

### Performance Requirements

| Metric | Target |
|--------|--------|
| Processing Rate | 100 triggers per batch |
| Evaluation Time | < 1 second per trigger |
| Job Duration | < 5 minutes |

### Error Handling

| Error Type | Handling Strategy | Retry |
|------------|-------------------|-------|
| Trigger evaluation error | Log error, mark as FAILED | No |
| Entity creation error | Log error, mark as FAILED, retry | Yes |
| Missing template data | Skip trigger, log warning | No |

### Monitoring Metrics

- Total triggers executed
- Triggers by type (SCHEDULED/EVENT_BASED/CONDITIONAL)
- Success/failure rate
- Entities created (schedules/deadlines)
- Processing duration

---

## 14.2 Process Trigger Conditions Job

**Purpose:** Evaluate conditional triggers on relevant events (event-driven).

### Job Configuration

| Property | Value |
|----------|-------|
| Job Type | `PROCESS_TRIGGER_CONDITIONS` |
| Queue | `trigger-execution` |
| Priority | NORMAL |
| Trigger | Event-driven (API trigger on relevant events) |
| Timeout | 60 seconds |
| Max Retries | 1 retry attempt (2 total attempts: 1 initial + 1 retry) |

### Input Parameters

```typescript
interface ProcessTriggerConditionsJobInput {
  event_type: string;           // Required: Event that occurred
  event_data: Record<string, any>;  // Required: Event context data
  company_id: UUID;             // Required: Company context
}
```

### Execution Steps

```
Step 1: Find Applicable Conditional Triggers
┌─────────────────────────────────────────────────────────────┐
│  SELECT rtr.* FROM recurrence_trigger_rules rtr            │
│  WHERE rtr.trigger_type = 'CONDITIONAL'                    │
│    AND rtr.is_active = true                                │
│    AND rtr.company_id = :company_id                        │
│    AND rtr.trigger_expression LIKE '%:event_type%';        │
└─────────────────────────────────────────────────────────────┘

Step 2: Evaluate Each Trigger Condition
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH trigger                                          │
│    -- Evaluate condition against event data                │
│    condition_met = evaluate_condition(                     │
│      trigger.trigger_expression,                           │
│      trigger.rule_config,                                  │
│      :event_data                                           │
│    );                                                      │
│                                                             │
│    IF condition_met THEN                                   │
│      -- Queue trigger for execution                        │
│      -- (Reuse Step 3-5 from Job 14.1)                    │
└─────────────────────────────────────────────────────────────┘
```

### Example Event Types

```typescript
// Events that can trigger conditional rules
const TRIGGER_EVENTS = {
  VOLUME_THRESHOLD: 'waste_volume_threshold_exceeded',
  PERMIT_STATUS: 'permit_status_changed',
  BREACH_DETECTED: 'compliance_breach_detected',
  PARAMETER_LIMIT: 'parameter_limit_exceeded',
  GENERATOR_RUNTIME: 'generator_runtime_threshold',
};
```

---

# 15. Job Infrastructure Details

## 15.1 Database Integration

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

## 15.2 Notification Integration

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

> [UPDATED - Rich Notification Schema - 2025-01-01]
> 
> **All notification inserts now use the rich schema from Database Schema (Section 7.1) and Notification Messaging Specification.**

```sql
INSERT INTO notifications (
  user_id,
  company_id,
  site_id,
  recipient_email,
  recipient_phone,
  notification_type,      -- 'DEADLINE_WARNING_7D', 'EVIDENCE_REMINDER', etc. (see Database Schema for full enum)
  channel,                -- 'EMAIL', 'SMS', 'IN_APP', 'PUSH'
  priority,                -- 'LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'URGENT'
  subject,                -- Email subject or SMS preview
  body_text,              -- Plain text email body or SMS content
  body_html,              -- HTML email body (optional, for EMAIL channel)
  variables,              -- Template variables used (JSONB)
  status,                 -- 'PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED'
  delivery_status,        -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED'
  delivery_provider,      -- 'SENDGRID', 'TWILIO', 'SUPABASE_REALTIME'
  delivery_provider_id,   -- Provider's message ID for tracking
  delivery_error,         -- Error message if delivery failed
  is_escalation,          -- BOOLEAN
  escalation_level,       -- INTEGER (1-3)
  escalation_state,       -- 'PENDING', 'ESCALATED_LEVEL_1', 'ESCALATED_LEVEL_2', 'ESCALATED_LEVEL_3', 'RESOLVED'
  entity_type,            -- 'obligation', 'deadline', 'evidence', 'audit_pack', etc.
  entity_id,
  action_url,             -- URL to relevant page
  scheduled_for,          -- TIMESTAMP (default: NOW())
  metadata
)
VALUES (
  :user_id,
  :company_id,
  :site_id,
  :recipient_email,       -- From users.email
  :recipient_phone,       -- From users.phone (optional, for SMS)
  :notification_type,     -- Mapped from old alert_type (see mapping below)
  :channel,               -- 'EMAIL', 'SMS', 'IN_APP', 'PUSH'
  :priority,              -- Mapped from old severity (see mapping below)
  :subject,               -- Mapped from old title
  :body_text,             -- Mapped from old message
  :body_html,             -- NULL or generated from body_text
  :variables::JSONB,      -- Template variables (default: '{}')
  'PENDING',              -- Default status
  NULL,                   -- delivery_status starts as NULL
  NULL,                   -- delivery_provider set by notification service
  NULL,                   -- delivery_provider_id set after sending
  NULL,                   -- delivery_error set on failure
  :is_escalation,         -- BOOLEAN (default: false)
  :escalation_level,      -- INTEGER (optional)
  :escalation_state,      -- Default: 'PENDING'
  :entity_type,
  :entity_id,
  :action_url,
  :scheduled_for,         -- Default: NOW()
  :metadata::JSONB
);
```

**Field Mapping (Old → New):**
- `alert_type` → `notification_type` (with enum value mapping, see below)
- `severity` → `priority` (INFO/WARNING → NORMAL/HIGH, ERROR/CRITICAL → CRITICAL/URGENT)
- `title` → `subject`
- `message` → `body_text` (and optionally `body_html`)

**Notification Type Mapping:**
- `'DEADLINE_ALERT'` → `'DEADLINE_WARNING_7D'` or `'DEADLINE_WARNING_3D'` or `'DEADLINE_WARNING_1D'` (based on days remaining)
- `'EVIDENCE_REMINDER'` → `'EVIDENCE_REMINDER'` (unchanged)
- `'BREACH'` → `'BREACH'` (unchanged)
- `'SYSTEM'` → `'SYSTEM_ALERT'` (unchanged)
- Other types map directly or use closest match

**Priority Mapping (from old severity):**
- `'INFO'` → `'NORMAL'`
- `'WARNING'` → `'HIGH'`
- `'ERROR'` → `'CRITICAL'`
- `'CRITICAL'` → `'URGENT'`

## 15.3 AI Service Integration

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

## 15.4 Storage Integration

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

## 15.5 Real-Time Integration

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

# 16. Integration Points

Covered in Section 15 (Job Infrastructure Details) above.

---

# 18. Additional Production Jobs (v1.4)

This section documents 6 additional jobs discovered in production that were not previously documented.

## 18.1 Evidence Expiry Tracking Job

**Job Type:** `evidence-expiry-tracking-job`
**Queue:** `evidence-tracking`
**Priority:** NORMAL
**Trigger:** Cron (daily at 02:00 UTC)

### Purpose

Track evidence items approaching expiration and send reminders to users to renew/replace evidence before it expires.

### Execution Logic

```typescript
async function executeEvidenceExpiryTracking() {
  const thresholds = [30, 14, 7, 1]; // days before expiry

  for (const threshold of thresholds) {
    const expiringEvidence = await db.query(`
      SELECT e.*, s.site_name, c.company_name
      FROM evidence_items e
      JOIN sites s ON e.site_id = s.id
      JOIN companies c ON e.company_id = c.id
      WHERE e.expiry_date IS NOT NULL
        AND e.expiry_date = CURRENT_DATE + INTERVAL '${threshold} days'
        AND e.deleted_at IS NULL
    `);

    for (const evidence of expiringEvidence) {
      await createNotification({
        type: 'EVIDENCE_EXPIRING',
        severity: threshold <= 7 ? 'HIGH' : 'MEDIUM',
        message: `Evidence "${evidence.file_name}" expires in ${threshold} days`,
        evidence_id: evidence.id,
        site_id: evidence.site_id,
        company_id: evidence.company_id
      });
    }
  }
}
```

### Business Rules

- Sends reminders at 30, 14, 7, and 1 day before expiry
- Higher urgency (HIGH priority) for evidence expiring within 7 days
- Only tracks evidence with `expiry_date` set
- Skips soft-deleted evidence

### Performance

- Expected execution time: 5-30 seconds
- Scales with number of evidence items with expiry dates
- Uses indexed query on `expiry_date`

---

## 18.2 Recurring Task Generation Job

**Job Type:** `recurring-task-generation-job`
**Queue:** `recurring-tasks`
**Priority:** NORMAL
**Trigger:** Cron (daily at 03:00 UTC)

### Purpose

Generate task instances from recurring task definitions based on frequency rules.

### Execution Logic

```typescript
async function executeRecurringTaskGeneration() {
  const recurringTasks = await db.query(`
    SELECT * FROM recurring_tasks
    WHERE is_active = true
      AND (next_due_date IS NULL OR next_due_date <= CURRENT_DATE)
  `);

  for (const task of recurringTasks) {
    // Generate task instance
    await db.insert('tasks', {
      recurring_task_id: task.id,
      title: task.title,
      description: task.description,
      due_date: calculateDueDate(task.frequency, task.next_due_date),
      assigned_to: task.default_assignee_id,
      company_id: task.company_id,
      site_id: task.site_id
    });

    // Update next due date
    await db.update('recurring_tasks', task.id, {
      next_due_date: calculateNextDueDate(task.frequency, task.next_due_date),
      last_generated_at: new Date()
    });
  }
}
```

### Business Rules

- Generates task instances based on frequency (DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL)
- Updates `next_due_date` after generating instance
- Only processes active recurring tasks
- Assigns tasks to default assignee if specified

### Performance

- Expected execution time: 10-60 seconds
- Scales with number of active recurring tasks
- Batches task creation for efficiency

---

## 18.3 Report Generation Job

**Job Type:** `report-generation-job`
**Queue:** `report-generation`
**Priority:** NORMAL
**Trigger:** API trigger (user-initiated)

### Purpose

Generate compliance reports (PDF/Excel) on demand with data compilation and formatting.

### Execution Logic

```typescript
async function executeReportGeneration(reportId: string) {
  const report = await db.findOne('reports', reportId);

  // Compile data based on report type
  const data = await compileReportData(report.report_type, report.filters);

  // Generate report file
  let fileUrl: string;
  if (report.format === 'PDF') {
    fileUrl = await generatePDFReport(data, report.template);
  } else if (report.format === 'EXCEL') {
    fileUrl = await generateExcelReport(data, report.template);
  }

  // Update report record
  await db.update('reports', reportId, {
    status: 'COMPLETED',
    file_url: fileUrl,
    generated_at: new Date(),
    row_count: data.length
  });

  // Notify user
  await createNotification({
    type: 'REPORT_READY',
    message: `Your ${report.report_type} report is ready`,
    report_id: reportId,
    user_id: report.requested_by
  });
}
```

### Report Types

- **Obligations Report** - List of all obligations with status
- **Compliance Summary** - Compliance scores and trends
- **Evidence Register** - Complete evidence inventory
- **Deadline Calendar** - Upcoming deadlines
- **Module-Specific Reports** - Lab results, run hours, etc.

### Performance

- Expected execution time: 30 seconds - 5 minutes
- Depends on report complexity and data volume
- Large reports (>10,000 rows) streamed to prevent memory issues

---

## 18.4 Notification Delivery Job

**Job Type:** `notification-delivery-job`
**Queue:** `notification-delivery`
**Priority:** HIGH
**Trigger:** Event-driven (queued notifications)

### Purpose

Deliver queued notifications via configured channels (email, SMS, in-app, push).

### Execution Logic

```typescript
async function executeNotificationDelivery(notificationId: string) {
  const notification = await db.findOne('notifications', notificationId);
  const user = await db.findOne('users', notification.user_id);
  const preferences = await db.findOne('notification_preferences', {
    user_id: user.id,
    notification_type: notification.notification_type
  });

  // Determine delivery channels based on preferences
  const channels = determineChannels(preferences, notification.severity);

  for (const channel of channels) {
    try {
      if (channel === 'EMAIL') {
        await sendEmail({
          to: user.email,
          subject: notification.subject,
          body: notification.message,
          template: notification.template_id
        });
      } else if (channel === 'SMS') {
        await sendSMS({
          to: user.phone_number,
          message: notification.message
        });
      } else if (channel === 'PUSH') {
        await sendPushNotification({
          user_id: user.id,
          title: notification.subject,
          body: notification.message
        });
      }

      await db.update('notifications', notificationId, {
        status: 'DELIVERED',
        delivered_at: new Date(),
        channel: channel
      });
    } catch (error) {
      await db.update('notifications', notificationId, {
        status: 'FAILED',
        error_message: error.message,
        retry_count: notification.retry_count + 1
      });
      throw error; // Will trigger retry via BullMQ
    }
  }
}
```

### Business Rules

- Respects user notification preferences
- HIGH severity notifications ignore "digest only" preferences
- Retries up to 3 times with exponential backoff
- Falls back to in-app notification if email/SMS fails

### Performance

- Expected execution time: 1-5 seconds per notification
- Rate limited by email/SMS provider
- Processes notifications in order of creation

---

## 18.5 Digest Delivery Job

**Job Type:** `digest-delivery-job`
**Queue:** `digest-delivery`
**Priority:** NORMAL
**Trigger:** Cron (daily at 07:00 UTC, weekly Monday 07:00)

### Purpose

Send daily or weekly digest emails summarizing notifications and activity for users who prefer batched notifications.

### Execution Logic

```typescript
async function executeDigestDelivery(frequency: 'DAILY' | 'WEEKLY') {
  const users = await db.query(`
    SELECT DISTINCT u.*
    FROM users u
    JOIN notification_preferences np ON u.id = np.user_id
    WHERE np.frequency_preference = '${frequency}_DIGEST'
      AND u.is_active = true
  `);

  for (const user of users) {
    const startDate = frequency === 'DAILY'
      ? subDays(new Date(), 1)
      : subDays(new Date(), 7);

    const notifications = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = $1
        AND created_at >= $2
        AND status IN ('PENDING', 'QUEUED')
        AND severity != 'CRITICAL'
      ORDER BY created_at DESC
    `, [user.id, startDate]);

    if (notifications.length > 0) {
      await sendDigestEmail({
        to: user.email,
        frequency: frequency,
        notifications: notifications,
        summary: {
          total_count: notifications.length,
          by_type: groupBy(notifications, 'notification_type')
        }
      });

      // Mark notifications as delivered
      await db.update('notifications',
        { id: { in: notifications.map(n => n.id) } },
        { status: 'DELIVERED', delivered_at: new Date() }
      );
    }
  }
}
```

### Business Rules

- Only includes non-CRITICAL notifications (critical bypass digest)
- Groups notifications by type for easy scanning
- Includes summary statistics (total count, breakdown by type)
- Weekly digests sent on Monday mornings

### Performance

- Expected execution time: 5-30 minutes
- Scales with number of users preferring digest delivery
- Batches email sending for efficiency

---

## 18.6 Evidence Retention Job

**Job Type:** `evidence-retention-job`
**Queue:** `evidence-retention`
**Priority:** LOW
**Trigger:** Cron (monthly on 1st at 04:00 UTC)

### Purpose

Archive or delete evidence items past their retention period according to company retention policies.

### Execution Logic

```typescript
async function executeEvidenceRetention() {
  const companies = await db.query(`
    SELECT id, evidence_retention_years FROM companies
    WHERE evidence_retention_years IS NOT NULL
  `);

  for (const company of companies) {
    const cutoffDate = subYears(new Date(), company.evidence_retention_years);

    const expiredEvidence = await db.query(`
      SELECT * FROM evidence_items
      WHERE company_id = $1
        AND created_at < $2
        AND deleted_at IS NULL
        AND is_archived = false
    `, [company.id, cutoffDate]);

    for (const evidence of expiredEvidence) {
      // Check if evidence is still linked to active obligations
      const activeLinks = await db.count('obligation_evidence_links', {
        evidence_id: evidence.id,
        deleted_at: null
      });

      if (activeLinks === 0) {
        // Archive evidence (soft delete + move to cold storage)
        await archiveEvidence(evidence.id);

        await db.update('evidence_items', evidence.id, {
          is_archived: true,
          archived_at: new Date(),
          archived_reason: 'RETENTION_POLICY'
        });
      }
    }
  }
}
```

### Business Rules

- Only archives evidence past retention period
- Never archives evidence linked to active obligations
- Soft deletes evidence (keeps metadata)
- Moves files to cold storage (cheaper storage tier)
- Creates audit log of all archiving actions

### Performance

- Expected execution time: 5-60 minutes
- Scales with total evidence volume and retention periods
- Runs monthly during low-traffic hours

---

# 17. Error Handling & Logging

## 17.1 Structured Logging

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

## 17.2 Error Logging

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

## 17.3 Alerting

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
    WHERE u.company_id = $1
      AND ur.role IN ('OWNER', 'ADMIN')
  `, [job.payload.company_id]);
  
  // Create notifications for each admin
  for (const admin of admins.rows) {
    await db.query(`
      INSERT INTO notifications (
        user_id, company_id, recipient_email,
        notification_type, channel, priority,
        subject, body_text, entity_type, entity_id
      )
      VALUES ($1, $2, $3, 'SYSTEM_ALERT', 'EMAIL', 'CRITICAL',
        $4, $5, 'BACKGROUND_JOB', $6)
    `, [
      admin.id,
      job.payload.company_id,
      admin.email,
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

## 17.4 Monitoring

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

This complete specification defines all **25 background job types** for the EcoComply platform:

## Complete Job Type Registry

### Core Jobs (v1.0 - Sections 2-6)
| # | Job Type | Section | Description |
|---|----------|---------|-------------|
| 1 | Monitoring Schedule | Section 2.1 | Recurring obligation checks, deadline calculations |
| 2 | Deadline Alert | Section 2.2 | 7/3/1 day warnings for upcoming deadlines |
| 3 | Evidence Reminder | Section 2.3 | Notifications for obligations requiring evidence |
| 4 | Document Processing | Section 3.1 | PDF upload → text extraction (pdf-parse) → OCR (if needed) → LLM parsing |
| 5 | Excel Import Processing | Section 3.2 | Excel upload → validation → preview → bulk creation |
| 6 | Sampling Schedule (Module 2) | Section 4.1 | Daily/weekly/monthly triggers for lab sampling |
| 7 | Run-Hour Monitoring (Module 3) | Section 5.1 | 80%/90%/100% threshold checks |
| 8 | AER Generation | Section 5.2 | Annual return compilation and generation |
| 9 | Permit Renewal Reminder | Section 6.1 | Notifications for approaching permit renewals |
| 10 | Cross-Sell Trigger Detection | Section 6.2 | Keyword-based module suggestions |
| 11 | Audit Pack Generation | Section 6.3 | Evidence compilation into inspector-ready PDFs |
| 12 | Pack Distribution | Section 6.4 | Distribute packs via email/shared link |
| 13 | Consultant Client Sync | Section 6.5 | Sync consultant assignments and dashboard |

### v1.3 Enhancement Jobs (Sections 7-14)
| # | Job Type | Section | Description |
|---|----------|---------|-------------|
| 14 | Update Compliance Clocks | Section 7.1 | Recalculate days_remaining and criticality for all clocks |
| 15 | Refresh Compliance Dashboard | Section 7.2 | Refresh materialized view for dashboard |
| 16 | Process Escalations | Section 8.1 | Auto-escalate overdue obligations based on workflows |
| 17 | Auto-Create Renewal Workflows | Section 9.1 | Create renewal workflows 90 days before expiry |
| 18 | Check Regulator Response Deadlines | Section 9.2 | Alert on overdue regulator responses |
| 19 | Monitor Corrective Action Items | Section 10.1 | Send reminders for action item due dates |
| 20 | Auto-Transition Corrective Actions | Section 10.2 | Transition actions when all items complete |
| 21 | Auto-Validate Consignment Notes | Section 11.1 | Run validation on new consignments |
| 22 | Flag Pending Runtime Validations | Section 12.1 | Alert on manual entries pending validation |
| 23 | Update SLA Breach Timers | Section 13.1 | Track SLA breach duration for overdue deadlines |
| 24 | Execute Pending Recurrence Triggers | Section 14.1 | Execute scheduled recurrence triggers |
| 25 | Process Trigger Conditions | Section 14.2 | Evaluate conditional triggers on events |

## Document Structure

This specification is organized into **17 main sections**:

1. **Document Overview & Framework** - Job execution framework, queue structure, worker architecture
2. **Core Monitoring Jobs** - Monitoring Schedule, Deadline Alert, Evidence Reminder
3. **Document Processing Jobs** - PDF processing, Excel import
4. **Module 2 Jobs (Trade Effluent)** - Sampling Schedule
5. **Module 3 Jobs (MCPD/Generators)** - Run-Hour Monitoring, AER Generation
6. **System Jobs** - Permit Renewal Reminder, Cross-Sell, Audit Pack, Consultant Sync
7. **Universal Compliance Clock Jobs** - Clock updates, dashboard refresh
8. **Escalation Workflow Jobs** - Automated escalation processing
9. **Permit Workflow Jobs** - Renewal workflows, regulator response tracking
10. **Corrective Action Jobs** - Action item monitoring, auto-transitions
11. **Validation Jobs (Module 4)** - Consignment note validation
12. **Runtime Monitoring Jobs (Module 3)** - Manual entry validation alerts
13. **SLA Timer Jobs** - SLA breach tracking and escalation
14. **Trigger Execution Jobs** - Recurrence trigger execution
15. **Job Infrastructure Details** - Retry strategy, DLQ rules, health monitoring, status transitions, integration points
16. **Integration Points** - See Section 15
17. **Error Handling & Logging** - Structured logging, error capture, alerting, monitoring

## Version History

### Version 1.3 (2025-12-01)
**Major Enhancement: Database Schema v1.3 Features**

Added 12 new background jobs for features from Database Schema v1.3:

**Cross-Cutting Features:**
- Universal Compliance Clock jobs (2 jobs) - Red/Amber/Green criticality tracking
- Escalation Workflow jobs (1 job) - Automated escalation processing

**Module 1 Enhancements:**
- Permit Workflow jobs (2 jobs) - Renewal workflows and regulator response tracking
- SLA Timer jobs (1 job) - SLA breach tracking
- Trigger Execution jobs (2 jobs) - Event-based and conditional triggers

**Module 2 & 4 Enhancements:**
- Corrective Action jobs (2 jobs) - Action item monitoring and auto-transitions
- Validation jobs (1 job) - Consignment note pre-validation

**Module 3 Enhancements:**
- Runtime Monitoring jobs (1 job) - Manual entry validation alerts

### Version 1.0 (2025-01-01)
Initial release with 13 core background jobs.

---

**Document Status:** Complete - Enhanced with v1.3 Features
**Last Updated:** 2025-12-01
**Version:** 1.3
