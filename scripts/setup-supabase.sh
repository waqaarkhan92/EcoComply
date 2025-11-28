#!/bin/bash
# Phase 1.1: Supabase Setup Script
# This script helps automate Supabase setup

set -e

echo "🚀 Phase 1.1: Supabase Project Setup"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if linked to project
if [ -f ".supabase/config.toml" ]; then
    echo "📋 Project already linked"
    PROJECT_REF=$(grep -A 5 "\[project\]" .supabase/config.toml 2>/dev/null | grep "id" | cut -d '"' -f 2 || echo "")
    if [ ! -z "$PROJECT_REF" ]; then
        echo "   Project ID: $PROJECT_REF"
    fi
else
    echo "⚠️  Project not linked yet"
    echo ""
    echo "To link your project, run:"
    echo "   supabase link --project-ref ekyldwgruwntrvoyjzor"
    echo ""
    read -p "Do you want to link now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        supabase link --project-ref ekyldwgruwntrvoyjzor
    fi
fi

echo ""
echo "📝 Next steps (manual in Supabase Dashboard):"
echo ""
echo "1. Enable Extensions:"
echo "   - Go to SQL Editor"
echo "   - Run: supabase/migrations/20250128000000_enable_extensions.sql"
echo ""
echo "2. Create Storage Buckets (4 buckets):"
echo "   - documents (50MB, private)"
echo "   - evidence (20MB, private)"
echo "   - audit-packs (50MB, private)"
echo "   - aer-documents (50MB, private)"
echo ""
echo "3. Configure CORS:"
echo "   - Settings → API → CORS"
echo "   - Add: http://localhost:3000"
echo ""
echo "4. Enable Backups:"
echo "   - Settings → Database → Backups"
echo "   - Enable PITR (if on paid plan)"
echo "   - Create manual backup"
echo ""
