# EcoComply Deployment Guide

## Quick Start

EcoComply is deployed on:
- **Frontend/API**: Vercel (auto-deploy from main branch)
- **Database**: Supabase (PostgreSQL with RLS)
- **Background Jobs**: Redis + BullMQ
- **AI**: OpenAI GPT-4o

---

## Environment Variables Checklist

### Required for Production

| Variable | Where to Set | How to Get |
|----------|--------------|------------|
| `SUPABASE_URL` | Vercel | Supabase Dashboard > Settings > API |
| `SUPABASE_ANON_KEY` | Vercel | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Supabase Dashboard > Settings > API (keep secret!) |
| `DATABASE_URL` | Vercel | Supabase Dashboard > Settings > Database |
| `OPENAI_API_KEY` | Vercel | OpenAI Platform > API Keys |
| `REDIS_URL` | Vercel | Upstash/Redis Cloud dashboard |
| `JWT_SECRET` | Vercel | Generate: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | Vercel | Generate: `openssl rand -base64 32` |
| `BASE_URL` | Vercel | Your production URL (e.g., https://ecocomply.io) |

### Monitoring & Analytics (Free Tier)

| Variable | Where to Set | How to Get |
|----------|--------------|------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel | Sentry > Project Settings > Client Keys (DSN) |
| `SENTRY_DSN` | Vercel | Same as above |
| `SENTRY_ORG` | Vercel | Sentry > Settings > Organization Slug |
| `SENTRY_PROJECT` | Vercel | Sentry > Project Settings > Project Slug |
| `SENTRY_AUTH_TOKEN` | Vercel + GitHub | Sentry > Settings > Auth Tokens |
| `NEXT_PUBLIC_POSTHOG_KEY` | Vercel | PostHog > Project Settings > Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Vercel | `https://us.i.posthog.com` (or eu.i.posthog.com) |

### Optional (Email/SMS)

| Variable | Where to Set | How to Get |
|----------|--------------|------------|
| `SENDGRID_API_KEY` | Vercel | SendGrid > Settings > API Keys |
| `SENDGRID_FROM_EMAIL` | Vercel | Verified sender email in SendGrid |
| `TWILIO_ACCOUNT_SID` | Vercel | Twilio Console |
| `TWILIO_AUTH_TOKEN` | Vercel | Twilio Console |
| `TWILIO_PHONE_NUMBER` | Vercel | Twilio Console |

---

## Vercel Setup

### 1. Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select the Next.js framework preset

### 2. Environment Variables
1. Go to Project Settings > Environment Variables
2. Add all variables from the checklist above
3. Set scope: Production, Preview, Development

### 3. Build Settings
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm ci`

### 4. Deployment
- Push to `main` branch triggers production deploy
- Pull requests create preview deployments

---

## Supabase Setup

### 1. Enable Connection Pooling
1. Go to Supabase Dashboard > Settings > Database
2. Enable "Connection Pooling"
3. Use the pooled connection string for `DATABASE_URL`

### 2. Verify RLS Policies
All tables should have RLS enabled with proper policies:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 3. Enable Backups
1. Go to Supabase Dashboard > Database > Backups
2. Verify daily backups are enabled (Pro plan)

---

## Sentry Setup (Free: 5k errors/month)

### 1. Create Project
1. Go to [sentry.io](https://sentry.io) and sign up
2. Create new project: Next.js
3. Copy the DSN

### 2. Configure Source Maps
1. Go to Settings > Auth Tokens
2. Create token with `project:releases` and `org:read` scopes
3. Add `SENTRY_AUTH_TOKEN` to Vercel and GitHub Secrets

### 3. Test Integration
After deployment, trigger a test error:
```javascript
// In any component
throw new Error('Sentry test error');
```

---

## PostHog Setup (Free: 1M events/month)

### 1. Create Project
1. Go to [posthog.com](https://posthog.com) and sign up
2. Create new project
3. Copy the Project API Key

### 2. Events Being Tracked
- `user_signed_up` - New user registration
- `document_uploaded` - Document upload
- `extraction_completed` - AI extraction complete
- `pack_generated` - Pack generation
- `evidence_linked` - Evidence linked to obligation
- `feature_used` - Feature usage tracking
- `$pageview` - Page views (automatic)

### 3. Dashboard
Create dashboards for:
- Daily active users
- Document uploads per day
- Extraction success rate
- Feature adoption

---

## UptimeRobot Setup (Free: 50 monitors)

### 1. Create Monitors
1. Go to [uptimerobot.com](https://uptimerobot.com) and sign up
2. Add monitors:
   - **Health API**: `https://your-domain.com/api/v1/health`
   - **Marketing Page**: `https://your-domain.com/`
   - **Dashboard**: `https://your-domain.com/dashboard`

### 2. Alert Configuration
1. Set up email alerts for downtime
2. Optionally add Slack/Discord webhook

---

## GitHub Secrets

Add these to your repository (Settings > Secrets > Actions):

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
```

---

## Background Workers

### Option 1: Vercel Cron (Recommended for low volume)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/deadline-alerts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Option 2: Dedicated Worker (Railway/Render)
1. Deploy worker service with `npm run worker`
2. Set same environment variables
3. Ensure REDIS_URL is accessible

---

## Security Checklist

- [ ] All API keys are in environment variables (not committed)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is only used server-side
- [ ] RLS policies are enabled on all tables
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] CSP headers are set
- [ ] No secrets in console logs

---

## Monitoring Checklist

After deployment, verify:
- [ ] Sentry receives test error
- [ ] PostHog shows pageviews
- [ ] UptimeRobot shows "UP" status
- [ ] Health endpoint returns 200
- [ ] Can sign up new user
- [ ] Can upload document
- [ ] Extraction completes successfully
