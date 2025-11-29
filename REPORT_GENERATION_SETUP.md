# Report Generation Setup Guide

This guide covers the setup steps required to enable report generation functionality in the Oblicore platform.

## Prerequisites

- ✅ Database migrations applied
- ✅ Supabase project configured
- ✅ Worker service running (for background jobs)

## Setup Steps

### 1. Create Reports Storage Bucket

The reports bucket must be created in Supabase Storage to store generated report files.

#### Option A: Via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Storage** > **Buckets**
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name:** `reports`
   - **Visibility:** Private (NOT public)
   - **File size limit:** 100 MB
   - **Allowed MIME types:** 
     - `application/pdf`
     - `text/csv`
     - `application/json`
5. Click **"Create bucket"**

#### Option B: Via Supabase CLI

```bash
supabase storage create reports --public false
```

### 2. Configure Storage Bucket Policies

After creating the bucket, apply RLS policies for secure access:

1. Go to **Storage** > **Policies** > **reports** bucket
2. Run the SQL from `scripts/setup-reports-storage-policies.sql` in the SQL Editor
   - Or manually create policies in the Storage Policies UI

The policies will:
- Allow users to download reports for their company
- Allow service role to upload/update reports (for background jobs)
- Allow Admin+ roles to delete reports

### 3. Configure CORS (Optional but Recommended)

For direct browser downloads:

1. Go to **Storage** > **reports** bucket > **Settings**
2. Configure CORS:
   - **Allowed Origins:** Your app URL (e.g., `https://your-app.vercel.app`)
   - **Allowed Methods:** GET, POST, PUT, DELETE
   - **Allowed Headers:** Authorization, Content-Type
   - **Max Age:** 3600

### 4. Verify Database Migrations

Ensure all migrations have been applied:

```bash
# Check migration status
supabase migration list

# Apply any pending migrations
supabase migration up
```

Required migrations:
- ✅ `20250128000021_create_reports_table.sql`
- ✅ `20250128000022_create_reports_rls_policies.sql`
- ✅ `20250128000012_enable_rls_on_tables.sql` (updated)

### 5. Verify Worker Registration

Ensure the report generation worker is registered:

1. Check `lib/workers/worker-manager.ts` includes report generation worker
2. Verify queue name `REPORT_GENERATION` is in `lib/queue/queue-manager.ts`
3. Restart worker service if needed

### 6. Test Report Generation

Test the complete flow:

#### Create a Report

```bash
POST /api/v1/reports/compliance_summary/generate
Content-Type: application/json
Authorization: Bearer {token}

{
  "site_id": "optional-site-id",
  "date_range_start": "2025-01-01",
  "date_range_end": "2025-12-31",
  "format": "PDF"
}
```

#### Check Report Status

```bash
GET /api/v1/reports/compliance_summary?report_id={report_id}
Authorization: Bearer {token}
```

#### Download Report

```bash
GET /api/v1/reports/{report_id}/download
Authorization: Bearer {token}
```

## Verification Checklist

- [ ] Reports storage bucket created (`reports`)
- [ ] Storage bucket is private (not public)
- [ ] Storage RLS policies applied
- [ ] Database migrations applied
- [ ] Reports table exists and RLS enabled
- [ ] Worker service running with report generation worker
- [ ] Queue name `REPORT_GENERATION` configured
- [ ] Can create report via API
- [ ] Background job is queued successfully
- [ ] Report generation completes successfully
- [ ] Report file appears in storage bucket
- [ ] Can download report file via API

## Troubleshooting

### Reports Not Generating

1. **Check worker logs:**
   ```bash
   # Check if worker is processing jobs
   # Look for "Report generation job" logs
   ```

2. **Verify queue connection:**
   - Check Redis connection
   - Verify `REDIS_URL` environment variable

3. **Check background jobs table:**
   ```sql
   SELECT * FROM background_jobs 
   WHERE job_type = 'REPORT_GENERATION' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Storage Upload Fails

1. **Verify bucket exists:**
   - Check Supabase Dashboard > Storage
   - Bucket name must be exactly `reports`

2. **Check service role key:**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - Service role is required for background job uploads

3. **Check file size:**
   - Reports should be under 100 MB
   - Check bucket file size limit configuration

### Access Denied Errors

1. **Verify RLS policies:**
   - Check storage bucket policies are applied
   - Verify user has access to company

2. **Check report ownership:**
   - Users can only access reports for their company
   - Verify `company_id` matches user's company

## Report Types

The system supports 4 report types:

1. **compliance_summary** - Overview of compliance status
2. **deadline_report** - Upcoming and overdue deadlines
3. **obligation_report** - Detailed obligation tracking
4. **evidence_report** - Evidence completeness report

## Report Formats

Reports can be generated in 3 formats:

- **PDF** - Formatted document (default)
- **CSV** - Tabular data export
- **JSON** - Structured data export

## Storage Structure

Reports are stored with the following structure:

```
reports/
  └── {report_id}/
      ├── report-{report_id}.pdf
      ├── report-{report_id}.csv
      └── report-{report_id}.json
```

Example:
```
reports/
  └── a1b2c3d4-e5f6-7890-abcd-ef1234567890/
      └── report-a1b2c3d4.pdf
```

## Next Steps

After setup:

1. Test all 4 report types
2. Test all 3 formats (PDF, CSV, JSON)
3. Verify notifications are sent when reports complete
4. Test report expiration (30 days)
5. Set up monitoring for failed report generations

## Support

If you encounter issues:

1. Check worker logs for errors
2. Check background_jobs table for failed jobs
3. Verify all migrations are applied
4. Check Supabase Storage bucket configuration
5. Review RLS policies for access issues

