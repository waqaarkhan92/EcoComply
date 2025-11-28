# Phase 4 Background Jobs - Test Summary

## Test Status

### ✅ Passing Tests (No Redis Required)
- **Queue Manager Tests**: Queue name exports, structure validation
- **Job Functions Tests**: Job data structure validation

### ⏭️ Skipped Tests (Require Redis)
- **Document Processing Job**: Full job execution tests
- **Monitoring Schedule Job**: Deadline calculation tests
- **Deadline Alert Job**: Notification creation tests
- **Excel Import Job**: Validation and bulk creation tests
- **Pack Generation Job**: PDF generation tests

## Test Results

```
Test Suites: 5 skipped, 2 passed, 2 of 7 total
Tests:       7 skipped, 6 passed, 13 total
```

## Running Tests

### Without Redis (Current State)
```bash
npm run test:jobs
```
- Tests basic structure and data validation
- Skips queue/worker integration tests

### With Redis (Full Testing)
1. Set `REDIS_URL` in `.env.local`:
   ```
   REDIS_URL=redis://localhost:6379
   ```
2. Start Redis locally or use Upstash Redis URL
3. Run tests:
   ```bash
   npm run test:jobs
   ```

## Manual Testing Guide

Since full integration tests require Redis, here's a manual testing guide:

### 1. Document Processing Job

**Test Steps:**
1. Start worker: `npm run worker`
2. Upload a document via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/documents \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test-permit.pdf" \
     -F "site_id=YOUR_SITE_ID" \
     -F "document_type=PERMIT"
   ```
3. Check `background_jobs` table:
   ```sql
   SELECT * FROM background_jobs 
   WHERE job_type = 'DOCUMENT_EXTRACTION' 
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Verify job status changes: `PENDING` → `RUNNING` → `COMPLETED`
5. Check `documents` table:
   ```sql
   SELECT extraction_status, obligation_count 
   FROM documents 
   WHERE id = 'DOCUMENT_ID';
   ```
6. Verify obligations created:
   ```sql
   SELECT COUNT(*) FROM obligations WHERE document_id = 'DOCUMENT_ID';
   ```

**Expected Results:**
- Job status: `COMPLETED`
- Document status: `EXTRACTED`
- Obligations created: > 0
- Extraction logs created

### 2. Monitoring Schedule Job

**Test Steps:**
1. Create test obligation with frequency:
   ```sql
   INSERT INTO obligations (company_id, site_id, obligation_text, frequency, status)
   VALUES ('COMPANY_ID', 'SITE_ID', 'Test obligation', 'MONTHLY', 'ACTIVE');
   ```
2. Manually trigger job:
   ```typescript
   // In worker or API endpoint
   await getQueue(QUEUE_NAMES.MONITORING_SCHEDULE).add('MONITORING_SCHEDULE', {});
   ```
3. Check `schedules` table:
   ```sql
   SELECT * FROM schedules WHERE obligation_id = 'OBLIGATION_ID';
   ```
4. Check `deadlines` table:
   ```sql
   SELECT * FROM deadlines WHERE obligation_id = 'OBLIGATION_ID';
   ```

**Expected Results:**
- Schedule created/updated with `next_due_date`
- Deadline records created
- Obligation status updated if deadline passed

### 3. Deadline Alert Job

**Test Steps:**
1. Create deadline due in 7 days:
   ```sql
   INSERT INTO deadlines (obligation_id, due_date, status, is_active)
   VALUES ('OBLIGATION_ID', CURRENT_DATE + INTERVAL '7 days', 'PENDING', true);
   ```
2. Trigger job:
   ```typescript
   await getQueue(QUEUE_NAMES.DEADLINE_ALERTS).add('DEADLINE_ALERT', {});
   ```
3. Check `notifications` table:
   ```sql
   SELECT * FROM notifications 
   WHERE notification_type LIKE 'DEADLINE_WARNING%' 
   ORDER BY created_at DESC LIMIT 5;
   ```

**Expected Results:**
- Notifications created for 7/3/1 day warnings
- Notification type: `DEADLINE_WARNING_7D`, `DEADLINE_WARNING_3D`, `DEADLINE_WARNING_1D`
- Priority set correctly (NORMAL, HIGH, URGENT)

### 4. Evidence Reminder Job

**Test Steps:**
1. Create obligation with past deadline (no evidence):
   ```sql
   INSERT INTO obligations (company_id, site_id, obligation_text, deadline_date, status)
   VALUES ('COMPANY_ID', 'SITE_ID', 'Test obligation', CURRENT_DATE - INTERVAL '10 days', 'ACTIVE');
   ```
2. Trigger job:
   ```typescript
   await getQueue(QUEUE_NAMES.EVIDENCE_REMINDERS).add('EVIDENCE_REMINDER', {});
   ```
3. Check notifications:
   ```sql
   SELECT * FROM notifications 
   WHERE notification_type = 'EVIDENCE_REMINDER' 
   ORDER BY created_at DESC LIMIT 5;
   ```

**Expected Results:**
- Notifications created for obligations past grace period
- Notification type: `EVIDENCE_REMINDER`
- Priority: `HIGH`

### 5. Excel Import Processing Job

**Test Steps:**
1. Upload Excel file via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/obligations/import/excel \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test-obligations.xlsx" \
     -F "site_id=YOUR_SITE_ID"
   ```
2. Check `excel_imports` table:
   ```sql
   SELECT status, valid_count, error_count, valid_rows 
   FROM excel_imports 
   WHERE id = 'IMPORT_ID';
   ```
3. Confirm import:
   ```bash
   curl -X POST http://localhost:3000/api/v1/obligations/import/excel/IMPORT_ID/confirm \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. Verify obligations created:
   ```sql
   SELECT COUNT(*) FROM obligations 
   WHERE id = ANY(
     SELECT jsonb_array_elements_text(obligation_ids::jsonb) 
     FROM excel_imports 
     WHERE id = 'IMPORT_ID'
   );
   ```

**Expected Results:**
- Phase 1: Status = `PENDING_REVIEW`, valid_rows populated
- Phase 2: Status = `COMPLETED`, obligations created
- Success count matches valid rows

### 6. Pack Generation Job

**Test Steps:**
1. Generate pack via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/packs/generate \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "pack_type": "AUDIT_PACK",
       "company_id": "COMPANY_ID",
       "site_id": "SITE_ID"
     }'
   ```
2. Check `audit_packs` table:
   ```sql
   SELECT status, file_path, file_size_bytes 
   FROM audit_packs 
   WHERE id = 'PACK_ID';
   ```
3. Download pack:
   ```bash
   curl -X GET http://localhost:3000/api/v1/packs/PACK_ID/download \
     -H "Authorization: Bearer YOUR_TOKEN" \
     --output pack.pdf
   ```

**Expected Results:**
- Status: `COMPLETED`
- File path populated
- File size > 0
- PDF is valid and readable

## Worker Health Check

**Check worker is running:**
```bash
# In terminal
npm run worker
```

**Verify jobs are processing:**
```sql
SELECT job_type, status, COUNT(*) 
FROM background_jobs 
GROUP BY job_type, status;
```

**Check for stale jobs:**
```sql
SELECT * FROM background_jobs 
WHERE health_status = 'STALE' 
OR (last_heartbeat < NOW() - INTERVAL '5 minutes' AND status = 'RUNNING');
```

## Common Issues

### Issue: Jobs not processing
**Solution:**
- Verify worker is running: `npm run worker`
- Check Redis connection: Verify `REDIS_URL` is set
- Check job status: Query `background_jobs` table

### Issue: Jobs stuck in PENDING
**Solution:**
- Verify worker is running
- Check Redis connection
- Check job queue: Verify jobs are in queue

### Issue: Jobs failing immediately
**Solution:**
- Check error_message in `background_jobs` table
- Verify database connection
- Check required environment variables

## Next Steps

1. **Set up Redis** (Upstash or local) for full integration testing
2. **Run manual tests** using the guide above
3. **Monitor worker logs** for errors
4. **Check background_jobs table** for job status

