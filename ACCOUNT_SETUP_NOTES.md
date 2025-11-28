# Account Setup Notes

## ✅ Confirmed Decisions

1. **Supabase Region:** West London (EU)
   - Project already created
   - Need: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

2. **OpenAI:** $10/month limit
   - ⚠️ Note: This is lower than recommended ($50), but fine to start
   - Monitor usage closely during development
   - Can increase limit later if needed

3. **SendGrid:** Free tier (100 emails/day)
   - ✅ Free tier is sufficient for development
   - Sign up: https://sendgrid.com
   - Need: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL

4. **Twilio:** Skip for now (SMS optional)
   - Can add later in Phase 4 if needed
   - Not required for v1.0

5. **Deployment:**
   - Frontend: Vercel (recommended)
   - Workers: Railway/Render (set up in Phase 4)

## 📋 Next Steps

1. Get Supabase project details
2. Create SendGrid account
3. Create Vercel account
4. Set up Redis (for background jobs - can use Upstash free tier)
5. Fill in .env.local with actual values

6. **Redis (Upstash):** Pay-as-you-go
   - ✅ Cost-effective: ~$0.60/month at 100 customers, ~$6/month at 1,000 customers
   - Sign up: https://upstash.com
   - Create Redis database (free tier to start)
   - Need: REDIS_URL (connection string)
   - Set budget alerts if desired
