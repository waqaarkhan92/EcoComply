#!/bin/bash
# Ensure workers are running - start if not

echo "🔍 Checking if workers are running..."

if ps aux | grep -E "tsx.*workers/index|node.*workers/index" | grep -v grep > /dev/null; then
    echo "✅ Workers are already running"
    ps aux | grep -E "tsx.*workers/index|node.*workers/index" | grep -v grep
else
    echo "❌ Workers are NOT running"
    echo "🚀 Starting workers..."
    cd "$(dirname "$0")/.."
    npm run worker > /tmp/oblicore-worker.log 2>&1 &
    WORKER_PID=$!
    sleep 3
    
    if ps -p $WORKER_PID > /dev/null; then
        echo "✅ Workers started successfully (PID: $WORKER_PID)"
        echo "📋 Logs: tail -f /tmp/oblicore-worker.log"
    else
        echo "❌ Failed to start workers"
        echo "📋 Check logs: cat /tmp/oblicore-worker.log"
        exit 1
    fi
fi

