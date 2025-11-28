# Database URL Note

## Current Setup
You're using the **direct connection** URL (port 5432 - Session Mode):
```
postgresql://postgres:Ayla@db.ekyldwgruwntrvoyjzor.supabase.co:5432/postgres
```

## ⚠️ For Production: Use Transaction Pooler

Supabase offers two connection modes:

### 1. Session Mode (Port 5432) - What you're using now
- **Direct connection** to PostgreSQL
- Full PostgreSQL features (prepared statements, session variables)
- Good for: Long-running connections, development
- **Limitation:** Max ~200 connections (can exhaust quickly)

### 2. Transaction Mode (Port 6543) - **Recommended for Production**
- **Transaction pooler** - connections are pooled and reused
- Each connection held only during a transaction
- Better for: Serverless (Vercel), high concurrency, production
- **Benefit:** Can handle thousands of concurrent requests
- **Required for:** Vercel deployments (serverless functions)

### How to Get Transaction Pooler URL:

1. Go to Supabase Dashboard → Settings → Database
2. Scroll to **Connection string**
3. Select **Connection pooling** tab (or **Transaction mode**)
4. Copy the **URI** (should have port 6543)
5. Format: `postgresql://postgres.ekyldwgruwntrvoyjzor:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
   - Note: Host changes from `db.ekyldwgruwntrvoyjzor.supabase.co` to `aws-0-eu-west-2.pooler.supabase.com`
   - Port changes from `5432` to `6543`

### For Now (Development):
The direct connection (5432 - Session Mode) is fine for local development. 

### Before Production:
Switch to Transaction Pooler (6543) before deploying to Vercel. This is **required** for serverless functions.

