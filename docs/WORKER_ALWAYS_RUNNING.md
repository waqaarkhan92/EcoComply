# Ensuring Workers Always Run

## The Problem

**You're right to be concerned!** If the worker isn't running, PDFs will queue up and never be processed. This is NOT about costs - it's about ensuring the worker is deployed correctly.

## The Solution: Always-On Worker Service

The worker **MUST** always be running in production. Here are your options:

### Option 1: Separate Worker Service (Recommended for Production)

Deploy the worker as a **separate always-on service** alongside your Next.js app:

**Platforms that support always-on services:**
- **Railway** - Deploy worker as separate service
- **Render** - Background worker service
- **Fly.io** - Separate app for worker
- **DigitalOcean App Platform** - Worker component
- **AWS ECS/Fargate** - Separate task
- **Google Cloud Run** - Separate service (always-on option)

**Cost:** Minimal - worker is lightweight (just polls Redis). Usually $5-20/month.

### Option 2: Same Server, Separate Process

If you have a VPS/server:

```bash
# Install PM2
npm install -g pm2

# Start worker (auto-restarts, survives reboots)
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start on server reboot
```

**Cost:** No additional cost - uses same server.

### Option 3: Auto-Start with Next.js App (Simple Deployments)

For simple deployments, you can start workers with your Next.js app:

```bash
# Set environment variable
export ENABLE_WORKERS=true

# Workers will start automatically when app starts
npm start
```

⚠️ **Warning:** This ties worker lifecycle to your web app. If the web app restarts, workers restart too. Not ideal for production.

## Recommended Production Setup

### Architecture:

```
┌─────────────────┐         ┌─────────────────┐
│   Next.js App   │─────────▶│  Redis Queue    │
│   (Vercel/etc)  │  Enqueue │  (Upstash/etc)  │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  Worker Service │
                             │  (Always On)    │
                             │  (Railway/etc)  │
                             └─────────────────┘
```

### Deployment Example (Railway):

1. **Next.js App** (deployed on Vercel/Railway)
2. **Worker Service** (separate Railway service):
   ```bash
   # railway.toml or Dockerfile
   CMD ["npm", "run", "worker"]
   ```

### Cost Breakdown:

- **Worker Service:** $5-20/month (minimal CPU/memory)
- **Redis:** $0-10/month (Upstash free tier available)
- **Total:** ~$5-30/month for reliable background processing

## Why Not Serverless?

Serverless functions (Vercel, AWS Lambda) **cannot** run persistent workers because:
- Functions timeout after a few minutes
- No persistent connections
- BullMQ workers need to stay connected to Redis

**Solution:** Use a platform that supports always-on services.

## Verification

Check if worker is running:

```bash
# Check PM2 status
pm2 status

# Check Redis queue (should be empty or processing)
redis-cli LLEN bull:document-processing:wait

# Check worker logs
pm2 logs oblicore-worker
```

## What Happens If Worker Stops?

1. ✅ **Jobs queue safely** in Redis (won't be lost)
2. ❌ **No processing** happens (PDFs stay queued)
3. ✅ **Auto-resume** when worker restarts (queued jobs process automatically)

## Quick Fix for Your Deployment

**Right now, ensure worker is running:**

```bash
# Check if running
pm2 list

# If not running, start it
npm run start:worker

# Make it auto-start on reboot
pm2 save
pm2 startup
```

## Summary

- **Worker MUST always run** in production
- **Cost is minimal** ($5-20/month)
- **Deploy as separate service** (recommended)
- **Or use PM2/systemd** on your server
- **Jobs queue safely** if worker stops (they'll process when it restarts)

The key is: **Deploy the worker as a persistent service, not a serverless function.**

