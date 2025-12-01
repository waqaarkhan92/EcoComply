# Worker Deployment Guide

## Problem

The PDF extraction worker must be running continuously for document processing to work. If the worker stops, uploaded documents will queue but won't be processed.

## Solution: Always-Running Worker

### Option 1: PM2 (Recommended for Production)

PM2 is a process manager that keeps the worker running and auto-restarts it if it crashes.

#### Setup:

```bash
# Install PM2 globally
npm install -g pm2

# Start the worker
npm run start:worker

# Or use the script
chmod +x scripts/start-worker.sh
./scripts/start-worker.sh
```

#### PM2 Commands:

```bash
# View status
pm2 status

# View logs
pm2 logs oblicore-worker

# Restart worker
pm2 restart oblicore-worker

# Stop worker
pm2 stop oblicore-worker

# Auto-start on server reboot
pm2 startup
pm2 save
```

### Option 2: Systemd Service (Linux)

Create a systemd service file at `/etc/systemd/system/oblicore-worker.service`:

```ini
[Unit]
Description=Oblicore Background Worker
After=network.target redis.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Oblicore
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Then:

```bash
# Enable and start
sudo systemctl enable oblicore-worker
sudo systemctl start oblicore-worker

# Check status
sudo systemctl status oblicore-worker

# View logs
sudo journalctl -u oblicore-worker -f
```

### Option 3: Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  worker:
    build: .
    command: npm run worker
    environment:
      - REDIS_URL=${REDIS_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped
    depends_on:
      - redis
```

### Option 4: Vercel/Serverless (Not Recommended)

⚠️ **Warning**: Background workers don't work well on serverless platforms. Consider:
- Using a separate worker service (Railway, Render, Fly.io)
- Using Vercel Cron Jobs for scheduled tasks
- Using a managed queue service (Upstash QStash, Inngest)

## Verification

Check if worker is processing jobs:

```bash
# Check PM2 status
pm2 status

# Check Redis queue
redis-cli LLEN bull:document-processing:wait

# Check worker logs
pm2 logs oblicore-worker --lines 50
```

## Monitoring

Set up alerts for:
- Worker process down
- Queue size growing (indicates worker not processing)
- Failed jobs exceeding threshold

## What Happens If Worker Stops?

1. **Jobs Queue Up**: Documents are uploaded and jobs are enqueued to Redis
2. **Status Shows "PROCESSING"**: Documents appear as processing but nothing happens
3. **No Extraction**: PDFs won't be processed until worker restarts
4. **Jobs Resume**: When worker restarts, queued jobs will be processed automatically

## Production Checklist

- [ ] Worker process manager installed (PM2/systemd/Docker)
- [ ] Worker auto-starts on server reboot
- [ ] Worker auto-restarts on crash
- [ ] Monitoring/alerting set up
- [ ] Logs are being collected
- [ ] Worker health check endpoint (optional)

