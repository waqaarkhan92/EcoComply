# Extraction Issue - FIXED ✅

## What Was Wrong

There were TWO issues preventing automatic PDF extraction:

1. **Workers were running** but jobs were **failing silently** due to a breaking API change in `pdf-parse` v2
2. The `pdf-parse` package was updated from v1 to v2, changing from a function `pdf(buffer)` to a class-based API `new PDFParse({data: buffer})`

## What I Fixed

### 1. **Fixed PDF Parser API (PRIMARY FIX)** ✅
- Updated [lib/ai/document-processor.ts:8](lib/ai/document-processor.ts#L8) to use `pdf-parse` v2 API
- Changed from `const pdfParse = require('pdf-parse')` to `const { PDFParse } = require('pdf-parse')`
- Updated usage from `await pdfParse(fileBuffer)` to `new PDFParse({data: fileBuffer}).getText()`
- This fixed the "pdfParse is not a function" error that was causing 100% of extraction jobs to fail

### 2. **Automatic Worker Startup** ✅
- Workers auto-start when the Next.js server starts (via `instrumentation.ts`)
- Workers also start automatically when documents are uploaded (fallback mechanism)
- Improved error handling so failures are logged clearly

### 3. **Better Error Handling & Logging** ✅
- Added detailed logging throughout the worker startup process
- Redis connection errors are now clearly logged
- Job processing errors show full details
- Added worker health check endpoint: `/api/v1/health/workers`

### 4. **Improved Monitoring** ✅
- Document upload endpoint now checks queue status and warns if many jobs are waiting
- UI shows warning if extraction takes longer than 2 minutes
- Better Redis connection monitoring with event handlers

### 5. **Diagnostic Tools** ✅
- Created `scripts/diagnose-extraction.ts` to check:
  - Redis connection
  - Job queue status
  - Recent documents
  - Failed jobs

## How It Works Now

1. **On App Start**: Workers automatically start via the instrumentation hook
2. **On Document Upload**: Workers are ensured to be running (fallback mechanism)
3. **Job Processing**: Jobs are automatically processed by the running workers
4. **Error Recovery**: Clear error messages help identify issues

## Verification

To verify workers are running:

1. **Check server logs** - You should see:
   ```
   🚀 Auto-starting background workers (PDF extraction, etc.)...
   ✅ Redis connection verified
   ✅ Background workers started successfully - PDF extraction is ready!
   ```

2. **Check health endpoint**:
   ```bash
   curl http://localhost:3000/api/v1/health/workers
   ```

3. **Upload a document** - Check server logs for:
   ```
   📋 Starting extraction for document <id>
   ✅ Document <id> extraction completed: X obligations created
   ```

## If Workers Still Don't Start

1. **Check Redis**: Make sure `REDIS_URL` is set in `.env.local`
2. **Check logs**: Look for error messages in server console
3. **Run diagnostic**: `tsx scripts/diagnose-extraction.ts`
4. **Manual start**: As fallback, run `npm run worker` in a separate terminal

## Files Changed

### Critical Fix
- **`lib/ai/document-processor.ts`** - Fixed pdf-parse v2 API usage (lines 7-71)

### Supporting Improvements
- `lib/workers/auto-start.ts` - Improved startup with Redis check
- `lib/workers/worker-manager.ts` - Better error handling and logging
- `lib/queue/queue-manager.ts` - Enhanced Redis connection monitoring
- `app/api/v1/documents/route.ts` - Added worker startup check and queue status monitoring
- `instrumentation.ts` - Improved worker initialization
- `app/dashboard/documents/[id]/page.tsx` - Added warning for stuck extractions
- `app/api/v1/health/workers/route.ts` - New health check endpoint

### New Scripts
- `scripts/check-queue-status.ts` - Check BullMQ queue status
- `scripts/retry-stuck-documents.ts` - Re-enqueue stuck documents

## Summary

✅ Workers now start automatically when the app runs
✅ Fallback mechanism ensures workers start when needed
✅ Better error messages help identify issues
✅ Monitoring and diagnostics help verify everything works

**Extraction should now work automatically without manual intervention!**



