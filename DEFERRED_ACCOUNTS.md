# Deferred Accounts Setup

**Status:** These accounts will be set up when needed in later phases

## 📋 Accounts to Set Up Later

### 1. SendGrid (Email Notifications)
**Needed in:** Phase 4 - Background Jobs  
**Why:** Email notifications for deadline alerts, evidence reminders, pack ready notifications  
**When to set up:** Before Phase 4.2 (Notification Delivery Job)  
**Setup:** See SETUP_INSTRUCTIONS.md

### 2. Upstash Redis (Background Jobs)
**Needed in:** Phase 4 - Background Jobs  
**Why:** BullMQ job queue for background processing (document extraction, monitoring, etc.)  
**When to set up:** Before Phase 4.1 (Background Jobs Infrastructure)  
**Setup:** See SETUP_INSTRUCTIONS.md  
**Cost:** Free tier to start, ~$0.60/month at 100 customers

### 3. Vercel (Frontend Deployment)
**Needed in:** Phase 5 - Frontend Deployment  
**Why:** Deploy Next.js frontend and API routes  
**When to set up:** Before Phase 5.7 (Deployment)  
**Setup:** See SETUP_INSTRUCTIONS.md  
**Note:** Can set up earlier if you want to deploy during development

## ✅ Already Set Up

- ✅ Supabase (West London, Transaction Pooler)
- ✅ OpenAI ($10/month limit)

## 🎯 Current Phase

**Phase 1: Foundation (Database, Auth, RLS)** - Only needs Supabase ✅

You can proceed with Phase 1 without the deferred accounts. They'll be needed when you reach:
- Phase 4: Background Jobs (SendGrid + Redis)
- Phase 5: Frontend Deployment (Vercel)

