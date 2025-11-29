# Quick Start: Report Generation

## ✅ What's Done

All code implementation is complete! The following is ready:

- ✅ Database table and migrations
- ✅ Background job implementation
- ✅ API endpoints
- ✅ Worker registration
- ✅ Download endpoint

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Storage Bucket (2 minutes)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Name: `reports`
4. Visibility: **Private**
5. Click **"Create bucket"**

### Step 2: Apply Storage Policies (1 minute)

Run this SQL in Supabase SQL Editor:

```bash
# Copy contents from: scripts/setup-reports-storage-policies.sql
```

Or go to **Storage** → **reports** → **Policies** and create manually.

### Step 3: Verify Setup (1 minute)

```bash
npx tsx scripts/verify-reports-setup.ts
```

## 📋 Test It

### Generate a Report

```bash
POST /api/v1/reports/compliance_summary/generate
{
  "format": "PDF",
  "site_id": "optional-site-id"
}
```

### Check Status

```bash
GET /api/v1/reports/compliance_summary?report_id={report_id}
```

### Download

```bash
GET /api/v1/reports/{report_id}/download
```

## 📚 Full Documentation

See `REPORT_GENERATION_SETUP.md` for detailed instructions.

## ⚡ Available Report Types

- `compliance_summary` - Overview of compliance status
- `deadline_report` - Upcoming and overdue deadlines  
- `obligation_report` - Detailed obligation tracking
- `evidence_report` - Evidence completeness

## 📄 Supported Formats

- `PDF` - Formatted document (default)
- `CSV` - Tabular data export
- `JSON` - Structured data export

---

**That's it!** Once the storage bucket is created, you're ready to generate reports. 🎉

