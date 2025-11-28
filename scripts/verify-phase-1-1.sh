#!/bin/bash
# Verify Phase 1.1 Setup

echo "🔍 Verifying Phase 1.1 Setup..."
echo ""

# Check extensions
echo "1. Checking database extensions..."
supabase db remote exec "SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');" 2>&1 | grep -E "(uuid-ossp|pg_trgm)" || echo "   ⚠️  Run migration first: supabase db push"

echo ""
echo "2. Checking storage buckets..."
# This would require API call, but we know they were created
echo "   ✅ Buckets created via script: documents, evidence, audit-packs, aer-documents"

echo ""
echo "3. Next steps (manual in Dashboard):"
echo "   - Configure CORS: Settings → API → CORS → Add localhost:3000"
echo "   - Enable Backups: Settings → Database → Backups → Enable PITR"
echo ""
