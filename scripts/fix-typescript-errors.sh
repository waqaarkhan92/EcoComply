#!/bin/bash

# Fix TypeScript Errors - Quick Script
# This script adds Promise<any> type annotations to all useQuery hooks

echo "🔧 Fixing TypeScript errors in React Query hooks..."

# Find all .tsx files and add Promise<any> to queryFn without return types
find app -name "*.tsx" -type f | while read file; do
  # Check if file contains useQuery
  if grep -q "useQuery" "$file"; then
    # Add Promise<any> to queryFn: async () =>
    sed -i.bak 's/queryFn: async () => {/queryFn: async (): Promise<any> => {/g' "$file"

    # Add Promise<any> to queryFn: async()=>
    sed -i.bak 's/queryFn: async()=>{/queryFn: async(): Promise<any> => {/g' "$file"

    echo "  ✓ Fixed: $file"
  fi
done

# Clean up backup files
find app -name "*.bak" -type f -delete

echo ""
echo "✅ Type annotations fixed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run build"
echo "2. If still errors, check: SYSTEM_STATUS_AND_ACTION_PLAN.md"
echo ""
