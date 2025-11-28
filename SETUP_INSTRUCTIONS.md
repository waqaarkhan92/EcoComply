# Phase 0 Setup Instructions

## ✅ Completed
- ✅ Project structure initialized
- ✅ Supabase credentials added to .env.local
- ✅ JWT secrets generated

## 📋 Still Need

### 1. DATABASE_URL (Supabase Connection Pooler)

**How to get it:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ekyldwgruwntrvoyjzor`
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **Connection pooling** tab
6. Copy the **URI** (starts with `postgresql://`)
7. It will look like: `postgresql://postgres.ekyldwgruwntrvoyjzor:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`

**Add to .env.local:**
```
DATABASE_URL=postgresql://postgres.ekyldwgruwntrvoyjzor:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres
```

### 2. OpenAI API Key

**How to get it:**
1. Go to: https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Name it: "Oblicore Development"
4. Copy the key (starts with `sk-`)
5. **Important:** You won't see it again, so save it securely

**Add to .env.local:**
```
OPENAI_API_KEY=sk-xxxxx
```

### 3. SendGrid Account

**Steps:**
1. Sign up: https://sendgrid.com
2. Verify your email address
3. Go to **Settings** → **API Keys**
4. Click **Create API Key**
5. Name it: "Oblicore Development"
6. Select **Full Access** or **Restricted Access** (with Mail Send permissions)
7. Copy the API key (starts with `SG.`)

**Add to .env.local:**
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=your-email@example.com
```

### 4. Vercel Account

**Steps:**
1. Sign up: https://vercel.com
2. Click **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. That's it! We'll connect the repo in Phase 5

### 5. Upstash Redis

**Steps:**
1. Sign up: https://upstash.com
2. Click **Create Database**
3. Name: "oblicore-dev"
4. Type: **Regional** (select **EU West** region)
5. Click **Create**
6. Copy the **UPSTASH_REDIS_REST_URL** or **UPSTASH_REDIS_REST_PORT** (we need the Redis URL format)
7. The connection string format is: `rediss://default:[YOUR-PASSWORD]@[HOST]:[PORT]`
   - You'll find this in the database details page

**Add to .env.local:**
```
REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]
```

## 🔒 Security Notes

- ✅ `.env.local` is in `.gitignore` - will NOT be committed to Git
- ⚠️ Never share your service role key or API keys publicly
- ⚠️ Keep your `.env.local` file secure

## ✅ Verification

Once all values are filled in, run:
```bash
npm run validate-env
```

This will verify all required environment variables are set correctly.

