# Environment Variables Setup - TODO

## Required Before Running Email Service

### Resend Email Service Configuration

**Status:** ⚠️ TODO - Must configure before email notifications work

**Steps:**
1. Sign up for Resend account: https://resend.com
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxx_xxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

**Note:** Make sure your `RESEND_FROM_EMAIL` domain is verified in Resend dashboard.

**Why Resend?**
- Recommended by spec (Technical Architecture document)
- Better developer experience
- Unlimited free tier for development
- Modern, simple API

---

## Other Environment Variables

See `lib/env.ts` for full list of required and optional environment variables.

**Quick Reference:**
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenAI: `OPENAI_API_KEY`
- Redis: `REDIS_URL` (optional for Phase 2)
- JWT: `JWT_SECRET`, `JWT_REFRESH_SECRET`

---

**Last Updated:** 2025-01-28

