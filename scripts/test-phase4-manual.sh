#!/bin/bash
# Manual Phase 4 Testing Script
# Tests background jobs manually (requires Redis and running worker)

set -e

echo "Phase 4 Manual Testing Script"
echo "=============================="
echo ""

# Check if Redis is available
if [ -z "$REDIS_URL" ]; then
    echo "⚠️  REDIS_URL not set. Some tests will be skipped."
    echo "   Set REDIS_URL in .env.local to enable full testing."
    echo ""
fi

# Check if worker is running
echo "1. Checking worker status..."
if pgrep -f "workers/index.ts" > /dev/null; then
    echo "   ✅ Worker is running"
else
    echo "   ⚠️  Worker is not running. Start with: npm run worker"
fi
echo ""

# Check database connection
echo "2. Checking database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "   ✅ Database connection OK"
else
    echo "   ❌ Database connection failed. Check DATABASE_URL."
    exit 1
fi
echo ""

# Check background_jobs table
echo "3. Checking background_jobs table..."
JOB_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs;" 2>/dev/null | xargs)
echo "   Total jobs: $JOB_COUNT"

PENDING_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs WHERE status = 'PENDING';" 2>/dev/null | xargs)
echo "   Pending jobs: $PENDING_COUNT"

RUNNING_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs WHERE status = 'RUNNING';" 2>/dev/null | xargs)
echo "   Running jobs: $RUNNING_COUNT"

COMPLETED_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs WHERE status = 'COMPLETED';" 2>/dev/null | xargs)
echo "   Completed jobs: $COMPLETED_COUNT"

FAILED_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs WHERE status = 'FAILED';" 2>/dev/null | xargs)
echo "   Failed jobs: $FAILED_COUNT"
echo ""

# Check for stale jobs
echo "4. Checking for stale jobs..."
STALE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM background_jobs WHERE health_status = 'STALE' OR (last_heartbeat < NOW() - INTERVAL '5 minutes' AND status = 'RUNNING');" 2>/dev/null | xargs)
if [ "$STALE_COUNT" -gt 0 ]; then
    echo "   ⚠️  Found $STALE_COUNT stale jobs"
else
    echo "   ✅ No stale jobs"
fi
echo ""

# Check job types
echo "5. Job types summary:"
psql "$DATABASE_URL" -c "SELECT job_type, status, COUNT(*) FROM background_jobs GROUP BY job_type, status ORDER BY job_type, status;" 2>/dev/null || echo "   (Query failed)"
echo ""

echo "✅ Manual checks complete!"
echo ""
echo "Next steps:"
echo "1. Start worker: npm run worker"
echo "2. Trigger jobs via API endpoints"
echo "3. Monitor background_jobs table"
echo "4. Check worker logs for errors"

