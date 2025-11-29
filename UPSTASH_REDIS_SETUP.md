# Upstash Redis Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Upstash Account
1. Go to: https://console.upstash.com/
2. Sign up (free account)
3. Verify your email

### Step 2: Create Redis Database
1. Click **"Create Database"**
2. **Name:** `oblicore-dev`
3. **Type:** Regional
4. **Region:** EU West (or closest to your Supabase region - West London)
5. **Primary Region:** Select EU West
6. Click **"Create"**

### Step 3: Get Connection String
1. Click on your database (`oblicore-dev`)
2. You'll see connection details
3. **Copy the Redis URL** - it will look like:
   ```
   rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
   ```
   OR
   ```
   redis://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
   ```

### Step 4: Add to .env.local
Add this line to your `.env.local` file:
```
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT
```

Replace `YOUR_PASSWORD`, `YOUR_HOST`, and `YOUR_PORT` with the actual values from Upstash.

### Step 5: Test Connection
Run the setup script:
```bash
./scripts/setup-redis.sh
```

Or test manually:
```bash
node -e "
const { Redis } = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.ping().then(() => {
  console.log('✅ Redis connected!');
  redis.quit();
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
"
```

## Alternative: Local Redis (Development)

If you prefer local Redis for development:

### macOS
```bash
brew install redis
brew services start redis
```

### Linux
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### Docker
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

Then add to `.env.local`:
```
REDIS_URL=redis://localhost:6379
```

## Pricing

**Upstash Free Tier:**
- 10,000 commands/day
- 256 MB storage
- Perfect for development and testing

**At Scale (100 customers):**
- ~$0.60/month
- Still very affordable

## Verification

After setup, verify:
1. ✅ Redis URL in `.env.local`
2. ✅ Connection test passes
3. ✅ Worker can connect: `npm run worker`
4. ✅ Tests run: `npm run test:jobs`

## Troubleshooting

### Connection Refused
- Check Redis URL format
- Verify Upstash database is active
- Check firewall/network settings

### Authentication Failed
- Verify password is correct
- Check if using `rediss://` (SSL) or `redis://` (non-SSL)
- Upstash requires SSL: use `rediss://`

### Timeout Errors
- Check network connectivity
- Verify region matches your location
- Try a different region if issues persist

