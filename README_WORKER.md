# ⚠️ CRITICAL: Worker Must Be Running for PDF Extraction

## The Problem

**PDF extraction will NOT work unless the worker is running!**

When you upload a PDF:
- ✅ Document is created
- ✅ Job is enqueued to Redis
- ❌ **Nothing processes it** (worker not running)
- ❌ Document stays in "PROCESSING" status forever

## Quick Fix: Start the Worker

```bash
# Option 1: Start worker in separate terminal
npm run worker

# Option 2: Start both app and worker together
npm run dev:with-worker

# Option 3: Check if worker is running and start if needed
npm run check-worker
```

## How to Verify Worker is Running

```bash
# Check if worker process exists
ps aux | grep "tsx.*workers" | grep -v grep

# Should see output like:
# waqaar  12345  ... tsx workers/index.ts
```

## What the Worker Does

The worker process:
1. Connects to Redis
2. Listens for `DOCUMENT_EXTRACTION` jobs
3. Processes PDFs: extracts text → extracts obligations → creates records
4. Updates document status to `EXTRACTED`

## Production Setup

For production, the worker MUST run as a persistent service:

```bash
# Using PM2 (recommended)
npm install -g pm2
npm run start:worker
pm2 save
pm2 startup  # Auto-start on server reboot
```

See `docs/WORKER_DEPLOYMENT.md` for full production setup.

## Current Status

**Check if worker is running right now:**
```bash
npm run check-worker
```

If it says "Worker is NOT running", extraction won't work!

