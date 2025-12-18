#!/usr/bin/env python3
"""
Script to replace all alert() calls with toast notifications
and confirm() calls with ConfirmDialog across the codebase.
"""

import os
import re
from pathlib import Path

# Base directory
BASE_DIR = Path("/Users/waqaar/Documents/EcoComply")

# Files that need alert() -> toast() replacement
ALERT_FILES = [
    # Consultant and Pack pages
    "app/(dashboard)/consultant/clients/[clientId]/packs/generate/page.tsx",
    "app/dashboard/sites/[siteId]/packs/[packId]/distribute/page.tsx",
    "app/dashboard/sites/[siteId]/packs/generate/page.tsx",
    "app/dashboard/packs/page.tsx",
    "app/dashboard/settings/notifications/page.tsx",
    "app/dashboard/documents/[id]/page.tsx",

    # Module 1 pages
    "app/dashboard/module-1/permit-versions/[versionId]/edit/page.tsx",
    "app/dashboard/module-1/permit-versions/new/page.tsx",
    "app/dashboard/module-1/compliance-decisions/new/page.tsx",
    "app/dashboard/module-1/compliance-decisions/[decisionId]/edit/page.tsx",
    "app/dashboard/module-1/condition-permissions/[permissionId]/edit/page.tsx",
    "app/dashboard/module-1/condition-permissions/new/page.tsx",
    "app/dashboard/module-1/enforcement-notices/new/page.tsx",
    "app/dashboard/module-1/enforcement-notices/[noticeId]/edit/page.tsx",
    "app/dashboard/module-1/permit-workflows/new/page.tsx",
    "app/dashboard/module-1/permit-workflows/[workflowId]/surrender/page.tsx",
    "app/dashboard/module-1/permit-workflows/[workflowId]/edit/page.tsx",
    "app/dashboard/module-1/permit-workflows/[workflowId]/variation/page.tsx",
    "app/dashboard/module-1/condition-evidence-rules/new/page.tsx",
    "app/dashboard/module-1/condition-evidence-rules/[ruleId]/edit/page.tsx",

    # Module 2 pages
    "app/dashboard/module-2/corrective-actions/[actionId]/edit/page.tsx",
    "app/dashboard/module-2/sampling-logistics/[recordId]/edit/page.tsx",
    "app/dashboard/module-2/sampling-logistics/new/page.tsx",
    "app/dashboard/module-2/consent-states/new/page.tsx",
    "app/dashboard/module-2/monthly-statements/[statementId]/edit/page.tsx",
    "app/dashboard/module-2/monthly-statements/new/page.tsx",

    # Module 3 pages
    "app/dashboard/module-3/exemptions/[exemptionId]/edit/page.tsx",
    "app/dashboard/module-3/exemptions/new/page.tsx",
    "app/dashboard/module-3/runtime-monitoring/[recordId]/edit/page.tsx",
    "app/dashboard/module-3/runtime-monitoring/new/page.tsx",
    "app/dashboard/module-3/regulation-thresholds/new/page.tsx",
    "app/dashboard/module-3/regulation-thresholds/[thresholdId]/edit/page.tsx",

    # Module 4 pages
    "app/dashboard/module-4/waste-streams/new/page.tsx",
    "app/dashboard/module-4/waste-streams/[streamId]/edit/page.tsx",
    "app/dashboard/module-4/contractor-licences/new/page.tsx",
    "app/dashboard/module-4/contractor-licences/[licenceId]/edit/page.tsx",
    "app/dashboard/module-4/consignment-notes/new/page.tsx",
    "app/dashboard/module-4/consignment-notes/[noteId]/edit/page.tsx",
    "app/dashboard/module-4/validation-rules/new/page.tsx",
    "app/dashboard/module-4/validation-rules/[ruleId]/edit/page.tsx",
    "app/dashboard/module-4/end-point-proofs/new/page.tsx",
    "app/dashboard/module-4/end-point-proofs/[proofId]/edit/page.tsx",

    # Recurrence and trigger pages
    "app/dashboard/recurrence-trigger-rules/new/page.tsx",
    "app/dashboard/recurrence-trigger-rules/[ruleId]/edit/page.tsx",

    # Components
    "components/recurrence-triggers/VisualTriggerBuilder.tsx",
]

# Files that need confirm() -> ConfirmDialog replacement
CONFIRM_FILES = [
    "app/dashboard/obligations/[id]/page.tsx",
    "app/dashboard/module-1/condition-permissions/[permissionId]/page.tsx",
    "app/dashboard/review-queue/page.tsx",
    "app/dashboard/review-queue/[itemId]/page.tsx",
    "app/dashboard/module-4/chain-break-alerts/page.tsx",
    "app/dashboard/module-4/validation-rules/page.tsx",
    "app/dashboard/module-4/end-point-proofs/[proofId]/page.tsx",
    "components/enhanced-features/calendar-settings.tsx",
]


def add_toast_import(content: str) -> str:
    """Add toast import if not already present."""
    if "from 'sonner'" in content:
        return content

    # Find the last import statement
    import_pattern = r"(import\s+.*?from\s+['\"].*?['\"];?\n)"
    imports = list(re.finditer(import_pattern, content))

    if imports:
        last_import = imports[-1]
        insertion_point = last_import.end()
        toast_import = "import { toast } from 'sonner';\n"
        content = content[:insertion_point] + toast_import + content[insertion_point:]

    return content


def replace_alerts(content: str) -> str:
    """Replace alert() calls with appropriate toast notifications."""

    # Success messages
    content = re.sub(
        r"alert\(['\"]([^'\"]*(?:success|Success|created|Created|updated|Updated|saved|Saved|generated|Generated)[^'\"]*)['\"]\\);",
        r"toast.success('\1');",
        content
    )

    # Error messages
    content = re.sub(
        r"alert\(['\"]([^'\"]*(?:failed|Failed|error|Error|invalid|Invalid|please|Please)[^'\"]*)['\"]\\);",
        r"toast.error('\1');",
        content
    )

    # Template literals with expressions
    content = re.sub(
        r"alert\(`([^`]*)`\);",
        r"toast.error(`\1`);",
        content
    )

    # Remaining alerts (default to toast.info or toast.error based on context)
    content = re.sub(
        r"alert\(([^)]+)\);",
        r"toast.error(\1);",
        content
    )

    return content


def process_alert_file(filepath: Path):
    """Process a single file to replace alert() with toast()."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Add toast import
        content = add_toast_import(content)

        # Replace alerts
        content = replace_alerts(content)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Processed: {filepath.relative_to(BASE_DIR)}")
            return True
        else:
            print(f"- No changes: {filepath.relative_to(BASE_DIR)}")
            return False

    except Exception as e:
        print(f"✗ Error processing {filepath.relative_to(BASE_DIR)}: {e}")
        return False


def main():
    """Main function to process all files."""
    print("=" * 70)
    print("Replacing alert() calls with toast notifications")
    print("=" * 70)

    processed = 0
    skipped = 0
    errors = 0

    for file_path in ALERT_FILES:
        full_path = BASE_DIR / file_path
        if full_path.exists():
            if process_alert_file(full_path):
                processed += 1
            else:
                skipped += 1
        else:
            print(f"✗ File not found: {file_path}")
            errors += 1

    print("\n" + "=" * 70)
    print(f"Summary: {processed} processed, {skipped} skipped, {errors} errors")
    print("=" * 70)

    print("\n" + "Note: confirm() replacements require manual intervention")
    print("Files with confirm() calls:")
    for file_path in CONFIRM_FILES:
        print(f"  - {file_path}")


if __name__ == "__main__":
    main()
