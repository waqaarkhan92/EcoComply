#!/bin/bash
# Run database migration using Supabase CLI or direct SQL

set -e

MIGRATION_FILE="supabase/migrations/20250128000000_enable_extensions.sql"

echo "🚀 Running migration: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is linked
if [ -f ".supabase/config.toml" ]; then
    echo "✅ Project linked, using Supabase CLI"
    supabase db push
else
    echo "⚠️  Project not linked"
    echo ""
    echo "Option 1: Link project and use CLI:"
    echo "   supabase link --project-ref ekyldwgruwntrvoyjzor"
    echo "   supabase db push"
    echo ""
    echo "Option 2: Run SQL manually in Supabase Dashboard:"
    echo "   - Go to SQL Editor"
    echo "   - Copy contents of: $MIGRATION_FILE"
    echo "   - Paste and run"
    echo ""
    echo "Migration file contents:"
    echo "---"
    cat "$MIGRATION_FILE"
    echo "---"
fi
