# Alert() and Confirm() Replacement - Completion Instructions

## Progress Summary

### ✅ Completed Files
The following files have been successfully updated with toast notifications:

1. `app/dashboard/reports/generate/page.tsx` - ✓
2. `app/dashboard/profile/page.tsx` - ✓
3. `app/dashboard/companies/[companyId]/packs/board/page.tsx` - ✓
4. `app/dashboard/recurrence-events/[eventId]/edit/page.tsx` - ✓
5. `app/dashboard/recurrence-events/new/page.tsx` - ✓
6. `app/dashboard/sites/[siteId]/obligations/[obligationId]/evidence/upload/page.tsx` - ✓
7. `app/(dashboard)/evidence/upload/page.tsx` - ✓
8. `app/dashboard/evidence/upload/page.tsx` - ✓
9. `app/dashboard/documents/upload/page.tsx` - ✓
10. `components/enhanced-features/webhook-management.tsx` - ✓ (with ConfirmDialog)
11. `app/dashboard/module-1/permit-versions/new/page.tsx` - ✓

### 🔄 Remaining Files with alert() Calls

#### Module-1 Pages
- `app/dashboard/module-1/permit-versions/[versionId]/edit/page.tsx`
- `app/dashboard/module-1/compliance-decisions/new/page.tsx`
- `app/dashboard/module-1/compliance-decisions/[decisionId]/edit/page.tsx`
- `app/dashboard/module-1/condition-permissions/[permissionId]/edit/page.tsx`
- `app/dashboard/module-1/condition-permissions/new/page.tsx`
- `app/dashboard/module-1/enforcement-notices/new/page.tsx`
- `app/dashboard/module-1/enforcement-notices/[noticeId]/edit/page.tsx`
- `app/dashboard/module-1/permit-workflows/new/page.tsx`
- `app/dashboard/module-1/permit-workflows/[workflowId]/surrender/page.tsx`
- `app/dashboard/module-1/permit-workflows/[workflowId]/edit/page.tsx`
- `app/dashboard/module-1/permit-workflows/[workflowId]/variation/page.tsx`
- `app/dashboard/module-1/condition-evidence-rules/new/page.tsx`
- `app/dashboard/module-1/condition-evidence-rules/[ruleId]/edit/page.tsx`

#### Module-2 Pages
- `app/dashboard/module-2/corrective-actions/[actionId]/edit/page.tsx`
- `app/dashboard/module-2/sampling-logistics/[recordId]/edit/page.tsx`
- `app/dashboard/module-2/sampling-logistics/new/page.tsx`
- `app/dashboard/module-2/consent-states/new/page.tsx`
- `app/dashboard/module-2/monthly-statements/[statementId]/edit/page.tsx`
- `app/dashboard/module-2/monthly-statements/new/page.tsx`

#### Module-3 Pages
- `app/dashboard/module-3/exemptions/[exemptionId]/edit/page.tsx`
- `app/dashboard/module-3/exemptions/new/page.tsx`
- `app/dashboard/module-3/runtime-monitoring/[recordId]/edit/page.tsx`
- `app/dashboard/module-3/runtime-monitoring/new/page.tsx`
- `app/dashboard/module-3/regulation-thresholds/new/page.tsx`
- `app/dashboard/module-3/regulation-thresholds/[thresholdId]/edit/page.tsx`

#### Module-4 Pages
- `app/dashboard/module-4/waste-streams/new/page.tsx`
- `app/dashboard/module-4/waste-streams/[streamId]/edit/page.tsx`
- `app/dashboard/module-4/contractor-licences/new/page.tsx`
- `app/dashboard/module-4/contractor-licences/[licenceId]/edit/page.tsx`
- `app/dashboard/module-4/consignment-notes/new/page.tsx`
- `app/dashboard/module-4/consignment-notes/[noteId]/edit/page.tsx`
- `app/dashboard/module-4/validation-rules/new/page.tsx`
- `app/dashboard/module-4/validation-rules/[ruleId]/edit/page.tsx`
- `app/dashboard/module-4/end-point-proofs/new/page.tsx`
- `app/dashboard/module-4/end-point-proofs/[proofId]/edit/page.tsx`

#### Other Pages
- `app/(dashboard)/consultant/clients/[clientId]/packs/generate/page.tsx`
- `app/dashboard/sites/[siteId]/packs/[packId]/distribute/page.tsx`
- `app/dashboard/sites/[siteId]/packs/generate/page.tsx`
- `app/dashboard/packs/page.tsx`
- `app/dashboard/settings/notifications/page.tsx`
- `app/dashboard/documents/[id]/page.tsx`
- `app/dashboard/recurrence-trigger-rules/new/page.tsx`
- `app/dashboard/recurrence-trigger-rules/[ruleId]/edit/page.tsx`
- `components/recurrence-triggers/VisualTriggerBuilder.tsx`

### 🔄 Files with confirm() Calls (Need ConfirmDialog)

- `app/dashboard/obligations/[id]/page.tsx`
- `app/dashboard/module-1/condition-permissions/[permissionId]/page.tsx`
- `app/dashboard/review-queue/page.tsx`
- `app/dashboard/review-queue/[itemId]/page.tsx`
- `app/dashboard/module-4/chain-break-alerts/page.tsx`
- `app/dashboard/module-4/validation-rules/page.tsx`
- `app/dashboard/module-4/end-point-proofs/[proofId]/page.tsx`
- `components/enhanced-features/calendar-settings.tsx`

## Completion Script

Run the provided bash script to complete all remaining replacements:

```bash
chmod +x scripts/replace-all-alerts.sh
./scripts/replace-all-alerts.sh
```

## Manual Steps for Each File

For each remaining file, follow these steps:

### Step 1: Add toast import
After the existing imports, add:
```typescript
import { toast } from 'sonner';
```

### Step 2: Replace alert() calls

#### Success messages:
```typescript
// Before:
alert('Created successfully');
// After:
toast.success('Created successfully');
```

#### Error messages:
```typescript
// Before:
alert('Failed to create. Please try again.');
// After:
toast.error('Failed to create', {
  description: 'Please try again.',
});
```

#### Validation messages:
```typescript
// Before:
alert('Please fill in all fields');
// After:
toast.error('Please fill in all fields');
```

#### JSON validation:
```typescript
// Before:
alert('Invalid JSON in metadata');
// After:
toast.error('Invalid JSON in metadata');
```

### Step 3: Replace confirm() calls with ConfirmDialog

For files with confirm() calls:

1. Add imports:
```typescript
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
```

2. Initialize the hook:
```typescript
const { dialogState, confirmAction, closeDialog, ConfirmDialogComponent } = useConfirmDialog();
```

3. Replace confirm() calls:
```typescript
// Before:
if (confirm('Are you sure?')) {
  await deleteItem();
}

// After:
confirmAction(
  'Delete Item?',
  'Are you sure you want to delete this item? This action cannot be undone.',
  async () => {
    await deleteItem();
  },
  'danger'
);
```

4. Add ConfirmDialogComponent to render:
```typescript
return (
  <div>
    {/* existing JSX */}
    {ConfirmDialogComponent}
  </div>
);
```

## Pattern Examples

### onError Handler Pattern:
```typescript
// Before:
onError: (error: any) => {
  console.error('Failed to create:', error);
  alert('Failed to create. Please try again.');
},

// After:
onError: (error: any) => {
  console.error('Failed to create:', error);
  toast.error('Failed to create', {
    description: 'Please try again.',
  });
},
```

### Validation Pattern:
```typescript
// Before:
if (!field) {
  alert('Please select a value');
  return;
}

// After:
if (!field) {
  toast.error('Please select a value');
  return;
}
```

### JSON Parsing Pattern:
```typescript
// Before:
try {
  metadata = JSON.parse(data);
} catch (e) {
  alert('Invalid JSON');
  return;
}

// After:
try {
  metadata = JSON.parse(data);
} catch (e) {
  toast.error('Invalid JSON');
  return;
}
```

## Testing Checklist

After completing all replacements, test:

1. ✅ Success toasts appear with green checkmark
2. ✅ Error toasts appear with red X
3. ✅ Toast messages are readable and informative
4. ✅ ConfirmDialog appears for destructive actions
5. ✅ No more native alert() or confirm() popups
6. ✅ Toast notifications stack properly
7. ✅ ConfirmDialog can be cancelled or confirmed

## Verification Command

To verify all alerts have been replaced:
```bash
grep -r "alert(" app components --include="*.tsx" --include="*.ts"
```

Should return no matches (or only matches in comments).

To verify all confirms have been replaced:
```bash
grep -r "confirm(" app components --include="*.tsx" --include="*.ts"
```

Should return no matches (or only matches in comments).
