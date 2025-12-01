# PDF Extraction Fix - Complete Solution ✅

## 🎯 Root Cause Identified

I found **TWO critical issues** preventing PDF extraction from working:

### **Issue #1: Workers Not Loading Environment Variables** ❌
The `workers/index.ts` file was NOT loading the `.env.local` file before starting, so workers couldn't:
- Connect to Redis
- Connect to Database
- Use OpenAI API
- Access any configuration

### **Issue #2: Environment Variables Not Available** ❌
The `.env.local` file exists on your local computer but is NOT available in the deployment environment.

---

## ✅ What I Fixed

### 1. **Fixed Workers to Load Environment Variables** (Committed & Pushed)
**File**: `workers/index.ts`

Added this critical import at the top:
```typescript
// IMPORTANT: Load environment variables FIRST before any other imports
import './load-env';
```

This ensures workers load `.env.local` before trying to connect to any services.

### 2. **Created Comprehensive Diagnostic Script**
**File**: `scripts/diagnose-full.ts`

Run this anytime to check your system:
```bash
npm run diagnose
```

It will check:
- ✅ Environment variables status
- ✅ Redis connection
- ✅ Database connection
- ✅ Recent documents
- ✅ Job queue status
- ✅ Stuck documents
- ✅ Failed jobs

---

## 🚀 How to Fix Your Setup

You have **TWO options** depending on where you're running your app:

### **Option A: Local Development (Your Computer)**

1. **Pull the latest changes:**
   ```bash
   git pull origin claude/verify-repo-access-01VeqE6twumWtoJjeMqzfLEv
   ```

2. **Make sure `.env.local` exists in your project root:**
   ```bash
   ls -la .env.local  # Should show the file
   ```

3. **Verify all required variables are set:**
   ```bash
   cat .env.local | grep -E "SUPABASE_URL|REDIS_URL|OPENAI_API_KEY"
   ```

   You MUST have:
   - ✅ `SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY`
   - ✅ `SUPABASE_SERVICE_ROLE_KEY`
   - ✅ `DATABASE_URL`
   - ✅ `OPENAI_API_KEY`
   - ✅ `REDIS_URL` (⚠️ CRITICAL - if missing, get one from Upstash)
   - ✅ `JWT_SECRET`
   - ✅ `JWT_REFRESH_SECRET`
   - ✅ `BASE_URL`

4. **Start the worker:**
   ```bash
   npm run worker
   ```

   You should see:
   ```
   ✅ Loaded environment from: /path/to/.env.local
   Starting background job workers...
   All workers started successfully
   ```

5. **In another terminal, start your Next.js app:**
   ```bash
   npm run dev
   ```

6. **Test extraction:**
   - Upload a PDF through your UI
   - Watch the worker terminal for extraction logs
   - Check the UI for obligations

---

### **Option B: Deployed Environment (Production/Staging)**

If you're deploying to Vercel, Railway, AWS, or any cloud platform:

1. **Pull the latest changes to your deployment:**
   ```bash
   git pull origin claude/verify-repo-access-01VeqE6twumWtoJjeMqzfLEv
   ```

2. **Set environment variables in your deployment platform:**

   **For Vercel:**
   - Go to Project Settings → Environment Variables
   - Add ALL required variables from your `.env.local`
   - Redeploy

   **For Railway:**
   - Go to Variables tab
   - Add ALL required variables
   - Redeploy

   **For Docker/VPS:**
   - Add environment variables to your docker-compose.yml or .env file
   - Restart containers

3. **Start the worker as a separate service:**

   The worker MUST run as a separate process from your Next.js app.

   **Using PM2 (recommended for production):**
   ```bash
   pm2 start npm --name "ecocomply-worker" -- run worker
   pm2 save
   ```

   **Using Docker Compose:**
   ```yaml
   services:
     web:
       build: .
       command: npm start
       environment:
         - SUPABASE_URL=${SUPABASE_URL}
         - REDIS_URL=${REDIS_URL}
         # ... all other vars

     worker:
       build: .
       command: npm run worker
       environment:
         - SUPABASE_URL=${SUPABASE_URL}
         - REDIS_URL=${REDIS_URL}
         # ... all other vars
   ```

---

## 🧪 How to Test If It's Working

### 1. **Check Worker Status**
```bash
# Worker should be running
ps aux | grep "workers/index"

# Or if using PM2
pm2 list
```

### 2. **Run Diagnostic**
```bash
npx tsx scripts/diagnose-full.ts
```

This will tell you EXACTLY what's wrong if anything is misconfigured.

### 3. **Test Upload**
1. Go to your UI and upload a PDF
2. Watch for these logs in the worker terminal:
   ```
   📋 Starting extraction for document <id>
   🔍 Processing document (OCR/text extraction)...
   ✅ File downloaded: X bytes
   📋 Extracting obligations...
   ✅ Document <id> extraction completed: X obligations created
   ```

3. Check your UI - obligations should appear within 30-60 seconds

---

## ❓ Common Issues & Solutions

### Issue: "REDIS_URL environment variable is required"
**Solution:**
1. Get a free Redis database from [Upstash](https://upstash.com/)
2. Add `REDIS_URL=redis://...` to your `.env.local`
3. Restart worker

### Issue: "Worker is running but jobs not processing"
**Solution:**
```bash
# Kill all workers
pm2 delete ecocomply-worker  # if using PM2
# or
pkill -f "workers/index"

# Start fresh
npm run worker
```

### Issue: "Documents stuck in PROCESSING"
**Solution:**
```bash
# Check if worker is running
ps aux | grep workers

# If not running, start it
npm run worker

# Check job queue
npx tsx scripts/diagnose-full.ts
```

### Issue: "OpenAI API errors"
**Solution:**
1. Verify your OpenAI API key is valid
2. Check you have credits in your OpenAI account
3. Check the worker logs for specific API errors

---

## 📊 System Architecture

Here's how it works now (with the fix):

```
User uploads PDF
      ↓
Next.js API creates document record
      ↓
Job enqueued to Redis
      ↓
Worker (with .env.local loaded ✅) picks up job
      ↓
Worker extracts text from PDF
      ↓
Worker sends text to OpenAI
      ↓
OpenAI extracts obligations
      ↓
Worker saves obligations to database
      ↓
Document status → COMPLETED
      ↓
UI polls and displays obligations
```

**Before the fix:** Worker couldn't load .env.local, so it failed at step 3 (couldn't connect to Redis).

**After the fix:** Worker loads environment variables and processes jobs successfully!

---

## 🎉 Summary

✅ **Fixed**: Workers now load environment variables properly
✅ **Committed**: Fix pushed to your repository
✅ **Added**: Comprehensive diagnostic script

**Next Steps:**
1. Pull the latest changes
2. Ensure `.env.local` has `REDIS_URL` set
3. Start the worker: `npm run worker`
4. Test by uploading a PDF

**Need help?** Run the diagnostic:
```bash
npx tsx scripts/diagnose-full.ts
```

This will tell you exactly what's wrong and how to fix it!

---

## 📝 Changes Made

**Commit**: `0a83564` - "Fix PDF extraction: Load environment variables in workers"

**Modified Files:**
- `workers/index.ts` - Added environment variable loading
- `scripts/diagnose-full.ts` - New comprehensive diagnostic tool
- `package-lock.json` - Updated dependencies

**Branch**: `claude/verify-repo-access-01VeqE6twumWtoJjeMqzfLEv`
