#!/bin/bash
# Start worker process with auto-restart
# This ensures the worker is always running

set -e

echo "🚀 Starting Oblicore Worker..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Check if worker is already running
if pm2 list | grep -q "oblicore-worker"; then
    echo "✅ Worker already running. Restarting..."
    pm2 restart oblicore-worker
else
    echo "🆕 Starting new worker instance..."
    pm2 start ecosystem.config.js
fi

# Save PM2 process list (so it auto-starts on server reboot)
pm2 save

echo "✅ Worker started successfully!"
echo "📊 View status: pm2 status"
echo "📝 View logs: pm2 logs oblicore-worker"
echo "🛑 Stop worker: pm2 stop oblicore-worker"




