#!/bin/bash
# Check if worker is running and start it if not

echo "🔍 Checking if worker is running..."

if ps aux | grep -E "tsx.*workers/index|node.*workers" | grep -v grep > /dev/null; then
    echo "✅ Worker is running"
    ps aux | grep -E "tsx.*workers/index|node.*workers" | grep -v grep
else
    echo "❌ Worker is NOT running"
    echo "🚀 Starting worker..."
    cd "$(dirname "$0")/.."
    npm run worker &
    sleep 2
    if ps aux | grep -E "tsx.*workers/index|node.*workers" | grep -v grep > /dev/null; then
        echo "✅ Worker started successfully"
    else
        echo "❌ Failed to start worker"
        exit 1
    fi
fi




