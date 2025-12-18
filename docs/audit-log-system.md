# Audit Log System Documentation

## Overview

The audit log system tracks all changes made to entities across the EcoComply platform. It provides a complete history of who made what changes and when, essential for compliance tracking and regulatory requirements.

## Components

### 1. Database Schema

**Table: `audit_logs`**

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'obligation', 'evidence', 'document', 'pack', 'corrective_action'
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'status_change'
  user_id UUID REFERENCES users(id),
  changes JSONB DEFAULT '{}', -- { field: { old: value, new: value } }
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_audit_logs_entity` - Composite index on (entity_type, entity_id) for fast entity lookup
- `idx_audit_logs_user` - Index on user_id for user activity queries
- `idx_audit_logs_created` - Descending index on created_at for timeline queries
- `idx_audit_logs_action` - Index on action for filtering by action type

**Security:**
- Row Level Security (RLS) enabled
- Users can only view logs for entities in their company
- Only service role can insert audit logs (prevents tampering)
- Audit logs are immutable (no update/delete policies)

### 2. Audit Service

**Location:** `/lib/services/audit-service.ts`

The audit service provides a clean API for logging entity changes:

```typescript
import { auditService } from '@/lib/services/audit-service';

// Log entity creation
await auditService.logCreate('obligation', obligationId, userId, {
  obligation_title: 'New Obligation',
  category: 'MONITORING',
});

// Log entity update with old/new values
await auditService.logUpdate('obligation', obligationId, userId, {
  obligation_title: {
    old: 'Old Title',
    new: 'New Title',
  },
  status: {
    old: 'PENDING',
    new: 'COMPLETED',
  },
});

// Log status change
await auditService.logStatusChange(
  'obligation',
  obligationId,
  userId,
  'PENDING',
  'COMPLETED'
);

// Log entity deletion
await auditService.logDelete('obligation', obligationId, userId, {
  obligation_title: 'Deleted Obligation',
});
```

**Methods:**

- `logCreate(entityType, entityId, userId, data)` - Log entity creation
- `logUpdate(entityType, entityId, userId, changes)` - Log update with old/new values
- `logDelete(entityType, entityId, userId, deletedData?)` - Log deletion
- `logStatusChange(entityType, entityId, userId, oldStatus, newStatus, metadata?)` - Log status changes
- `getAuditLogs(entityType, entityId, options)` - Get audit history for entity
- `getUserActivity(userId, options)` - Get user's activity across all entities
- `getBulkAuditLogs(entityType, entityIds, options)` - Get logs for multiple entities

### 3. API Routes

**Endpoint:** `GET /api/v1/audit-logs`

**Query Parameters:**
- `entity_type` (required with entity_id) - Type of entity (obligation, evidence, document, pack, corrective_action)
- `entity_id` (required with entity_type) - UUID of the entity
- `user_id` (optional) - Filter by user who made changes
- `action` (optional) - Filter by action type (create, update, delete, status_change)
- `limit` (optional, default: 20, max: 100) - Number of results per page
- `cursor` (optional) - Pagination cursor for next page

**Example Requests:**

```bash
# Get audit logs for a specific obligation
GET /api/v1/audit-logs?entity_type=obligation&entity_id=123e4567-e89b-12d3-a456-426614174000

# Get all activity by a specific user
GET /api/v1/audit-logs?user_id=123e4567-e89b-12d3-a456-426614174000

# Get only status changes for an obligation
GET /api/v1/audit-logs?entity_type=obligation&entity_id=123e4567-e89b-12d3-a456-426614174000&action=status_change

# Paginated results
GET /api/v1/audit-logs?entity_type=obligation&entity_id=123e4567-e89b-12d3-a456-426614174000&limit=50&cursor=2025-02-18T10:30:00Z:abc123
```

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "entity_type": "obligation",
      "entity_id": "123e4567-e89b-12d3-a456-426614174000",
      "action": "update",
      "user_id": "user123",
      "changes": {
        "obligation_title": {
          "old": "Old Title",
          "new": "New Title"
        },
        "status": {
          "old": "PENDING",
          "new": "COMPLETED"
        }
      },
      "metadata": {},
      "created_at": "2025-02-18T10:30:00Z",
      "user": {
        "full_name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "limit": 20,
    "cursor": null,
    "has_more": false,
    "next_cursor": null
  }
}
```

### 4. UI Component

**Component:** `<AuditLogPanel />`

**Location:** `/components/audit/audit-log-panel.tsx`

**Usage:**

```tsx
import { AuditLogPanel } from '@/components/audit/audit-log-panel';

// In your page component
<AuditLogPanel
  entityType="obligation"
  entityId={obligationId}
  defaultExpanded={false}
/>
```

**Props:**
- `entityType` (required) - Type of entity to show logs for
- `entityId` (required) - UUID of the entity
- `className` (optional) - Additional CSS classes
- `defaultExpanded` (optional, default: false) - Whether panel starts expanded

**Features:**
- Collapsible accordion panel
- Timeline view of all changes
- User avatars and names
- Action icons (create, update, delete, status change)
- Color-coded by action type
- Shows field changes with old → new values
- Relative timestamps (e.g., "2 hours ago")
- Pagination with "Load more" button
- Empty state when no logs exist
- Error handling and retry

## Integration Guide

### Adding Audit Logging to API Routes

**Example: Logging obligation creation**

```typescript
// In your POST handler
import { auditService } from '@/lib/services/audit-service';

// After creating the obligation
const { data: obligation, error } = await supabaseAdmin
  .from('obligations')
  .insert(newObligation)
  .select()
  .single();

// Log the creation
try {
  await auditService.logCreate('obligation', obligation.id, user.id, {
    obligation_title: obligation.obligation_title,
    category: obligation.category,
    status: obligation.status,
  });
} catch (auditError) {
  // Don't fail the request if audit logging fails
  console.error('Failed to log audit entry:', auditError);
}
```

**Example: Logging obligation update**

```typescript
// In your PUT handler
import { auditService } from '@/lib/services/audit-service';

// Build changes object
const changes: Record<string, { old: any; new: any }> = {};
Object.keys(updates).forEach((key) => {
  if (existingObligation[key] !== updates[key]) {
    changes[key] = {
      old: existingObligation[key],
      new: updates[key],
    };
  }
});

// After updating the obligation
try {
  await auditService.logUpdate('obligation', obligationId, user.id, changes);
} catch (auditError) {
  console.error('Failed to log audit entry:', auditError);
}
```

**Example: Logging status change**

```typescript
// Special handler for status changes
if (updates.status && updates.status !== existingObligation.status) {
  try {
    await auditService.logStatusChange(
      'obligation',
      obligationId,
      user.id,
      existingObligation.status,
      updates.status
    );
  } catch (auditError) {
    console.error('Failed to log status change:', auditError);
  }
}
```

### Adding Audit Panel to Detail Pages

1. Import the component:

```tsx
import { AuditLogPanel } from '@/components/audit/audit-log-panel';
```

2. Add a "History" or "Audit Log" tab/section:

```tsx
<div className="space-y-6">
  {/* Other content */}

  {/* Audit Log Panel */}
  <AuditLogPanel
    entityType="obligation"
    entityId={obligationId}
    defaultExpanded={true}
  />
</div>
```

3. Or add as a collapsible section:

```tsx
<AuditLogPanel
  entityType="obligation"
  entityId={obligationId}
  defaultExpanded={false}
  className="mt-6"
/>
```

## Supported Entity Types

Currently supported entity types:
- `obligation` - Compliance obligations
- `evidence` - Evidence files and records
- `document` - Regulatory documents
- `pack` - Regulatory packs
- `corrective_action` - Corrective actions
- `deadline` - Compliance deadlines
- `schedule` - Monitoring schedules

## Supported Actions

- `create` - Entity was created
- `update` - Entity was modified
- `delete` - Entity was deleted (soft delete)
- `status_change` - Entity status changed (special case of update)

## Migration

To apply the audit log system to your database:

```bash
# Run the migration
npm run migration:run

# Or apply manually
psql -d your_database -f supabase/migrations/20250218000001_create_audit_logs_table.sql
```

## Best Practices

1. **Always use the audit service** - Don't insert directly into audit_logs table
2. **Log meaningful changes** - Filter out internal fields like updated_at, version_number
3. **Don't fail requests** - Wrap audit logging in try-catch and log errors
4. **Track old/new values** - Always include both old and new values for updates
5. **Use metadata** - Add context like version numbers, IP addresses, etc.
6. **Test audit logging** - Verify logs are created for all CRUD operations
7. **Regular cleanup** - Consider archiving old audit logs (e.g., older than 2 years)

## Testing

Example test for audit logging:

```typescript
import { auditService } from '@/lib/services/audit-service';

describe('Audit Logging', () => {
  it('should log obligation update', async () => {
    // Update obligation
    await updateObligation(obligationId, { status: 'COMPLETED' });

    // Verify audit log was created
    const { logs } = await auditService.getAuditLogs('obligation', obligationId);

    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('update');
    expect(logs[0].changes.status).toEqual({
      old: 'PENDING',
      new: 'COMPLETED',
    });
  });
});
```

## Troubleshooting

### Audit logs not appearing

1. Check that the migration has been applied:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs';
   ```

2. Verify RLS policies are correct:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'audit_logs';
   ```

3. Check service role permissions:
   ```sql
   SELECT * FROM information_schema.role_table_grants
   WHERE table_name = 'audit_logs' AND grantee = 'service_role';
   ```

### Cannot view audit logs in UI

1. Verify API route is accessible:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3000/api/v1/audit-logs?entity_type=obligation&entity_id=YOUR_ID"
   ```

2. Check browser console for errors

3. Verify user has access to the entity (RLS policies)

## Future Enhancements

Potential improvements for the audit system:

- **Export audit logs** - CSV/PDF export for compliance reports
- **Audit log retention policies** - Automatic archival of old logs
- **Advanced filtering** - Filter by date range, multiple users, action types
- **Audit log search** - Full-text search across all audit logs
- **Audit alerts** - Notify admins of suspicious activity
- **Audit dashboard** - Visual analytics of audit activity
- **Diff viewer** - Side-by-side comparison of old/new values
- **Rollback functionality** - Ability to revert changes from audit log
