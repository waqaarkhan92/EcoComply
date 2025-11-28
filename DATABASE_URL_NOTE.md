# Database URL Note

## Current Setup
You're using the **direct connection** URL (port 5432):
```
postgresql://postgres:Ayla@db.ekyldwgruwntrvoyjzor.supabase.co:5432/postgres
```

## ⚠️ For Production: Use Connection Pooler

The connection pooler (port 6543) is recommended for production because:
- Better connection management
- Handles more concurrent connections
- Prevents connection exhaustion
- Required for serverless deployments (Vercel)

### How to Get Connection Pooler URL:

1. Go to Supabase Dashboard → Settings → Database
2. Scroll to **Connection string**
3. Select **Connection pooling** tab
4. Copy the **URI** (should have port 6543)
5. Format: `postgresql://postgres.ekyldwgruwntrvoyjzor:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`

### For Now (Development):
The direct connection (5432) is fine for local development. We can switch to the pooler URL later before deploying to production.

