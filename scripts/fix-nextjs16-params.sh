#!/bin/bash

# Fix Next.js 16 params async issue across all API routes
# In Next.js 16, params is now a Promise and must be awaited

echo "Fixing Next.js 16 params async issue in API routes..."

# Find all route.ts files in app/api
find app/api -name "route.ts" -type f | while read -r file; do
  echo "Processing: $file"

  # Create backup
  cp "$file" "$file.bak"

  # Fix the params destructuring pattern
  # Change: { params }: { params: { ... } }
  # To: props: { params: Promise<{ ... }> }
  # And add: const params = await props.params;

  # This is a complex regex replacement, so we'll use a Python script instead
  python3 - "$file" <<'EOF'
import sys
import re

file_path = sys.argv[1]
with open(file_path, 'r') as f:
    content = f.read()

# Pattern 1: Find function signatures with params
# Match: export async function METHOD(request: NextRequest, { params }: { params: { ...params } })
pattern1 = r'(export async function \w+\(\s*request: NextRequest,\s*)\{ params \}(\s*:\s*\{ params: \{[^}]+\} \})'

# Replace with: export async function METHOD(request: NextRequest, props: { params: Promise<{ ...params }> })
def replace1(match):
    return match.group(1) + 'props' + match.group(2).replace('params:', 'params: Promise<')

content = re.sub(pattern1, replace1, content)

# Pattern 2: After the auth check, add params await
# Find: const { user } = authResult;\n\n    const { ...vars } = params;
# Replace with: const { user } = authResult;\n\n    const params = await props.params;\n    const { ...vars } = params;

pattern2 = r'(const \{ user \} = authResult;\s*\n\s*\n\s*)(const \{[^}]+\} = params;)'

def replace2(match):
    return match.group(1) + 'const params = await props.params;\n    ' + match.group(2)

content = re.sub(pattern2, replace2, content)

# Write back
with open(file_path, 'w') as f:
    f.write(content)

print(f"✓ Fixed {file_path}")
EOF

done

echo "Done! All API routes have been fixed."
echo "Backup files created with .bak extension"
