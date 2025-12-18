#!/bin/bash

# Script to replace all alert() and confirm() calls in the codebase
# with toast notifications and ConfirmDialog components

set -e

cd "$(dirname "$0")/.."

echo "=============================================="
echo "Replacing alert() calls with toast notifications"
echo "=============================================="

# Function to add toast import if not present
add_toast_import() {
    local file="$1"

    # Check if toast import already exists
    if grep -q "from 'sonner'" "$file"; then
        return 0
    fi

    # Add toast import after the last import statement
    # Find the line number of the last import
    last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
        # Insert toast import after the last import
        sed -i '' "${last_import_line}a\\
import { toast } from 'sonner';\\
" "$file"
        echo "  ✓ Added toast import to $file"
    fi
}

# Function to replace alert() with toast()
replace_alerts() {
    local file="$1"

    # Replace success alerts
    sed -i '' "s/alert('\\([^']*[Ss]uccess[^']*\\)');/toast.success('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Cc]reated[^']*\\)');/toast.success('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Uu]pdated[^']*\\)');/toast.success('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Ss]aved[^']*\\)');/toast.success('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Gg]enerated[^']*\\)');/toast.success('\\1');/g" "$file"
    sed -i '' 's/alert("\\([^"]*[Ss]uccess[^"]*\\)");/toast.success("\\1");/g' "$file"
    sed -i '' 's/alert("\\([^"]*[Cc]reated[^"]*\\)");/toast.success("\\1");/g' "$file"
    sed -i '' 's/alert("\\([^"]*[Uu]pdated[^"]*\\)");/toast.success("\\1");/g' "$file"

    # Replace error/warning alerts
    sed -i '' "s/alert('\\([^']*[Ff]ailed[^']*\\)');/toast.error('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Ee]rror[^']*\\)');/toast.error('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Ii]nvalid[^']*\\)');/toast.error('\\1');/g" "$file"
    sed -i '' "s/alert('\\([^']*[Pp]lease[^']*\\)');/toast.error('\\1');/g" "$file"
    sed -i '' 's/alert("\\([^"]*[Ff]ailed[^"]*\\)");/toast.error("\\1");/g' "$file"
    sed -i '' 's/alert("\\([^"]*[Ee]rror[^"]*\\)");/toast.error("\\1");/g' "$file"
    sed -i '' 's/alert("\\([^"]*[Ii]nvalid[^"]*\\)");/toast.error("\\1");/g' "$file"
    sed -i '' 's/alert("\\([^"]*[Pp]lease[^"]*\\)");/toast.error("\\1");/g' "$file"

    # Replace template literal alerts
    sed -i '' 's/alert(`\([^`]*\)`);/toast.error(`\1`);/g' "$file"

    # Replace remaining alerts with toast.info
    sed -i '' "s/alert('\\([^']*\\)');/toast.info('\\1');/g" "$file"
    sed -i '' 's/alert("\\([^"]*\\)");/toast.info("\\1");/g' "$file"
}

# Process all TSX files with alert() calls
count=0
while IFS= read -r file; do
    echo "Processing: $file"
    add_toast_import "$file"
    replace_alerts "$file"
    ((count++))
done < <(grep -rl "alert(" app components --include="*.tsx" --include="*.ts" 2>/dev/null || true)

echo ""
echo "=============================================="
echo "Processed $count files"
echo "=============================================="
echo ""
echo "Note: confirm() calls require manual replacement with ConfirmDialog"
echo "Files with confirm() calls:"
grep -rl "confirm(" app components --include="*.tsx" 2>/dev/null | head -20 || true
