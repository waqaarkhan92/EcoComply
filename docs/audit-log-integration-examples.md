# Audit Log Integration Examples

Quick reference guide for integrating audit logging into your API routes.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Logging Entity Creation](#logging-entity-creation)
3. [Logging Entity Updates](#logging-entity-updates)
4. [Logging Status Changes](#logging-status-changes)
5. [Logging Deletions](#logging-deletions)
6. [Advanced Patterns](#advanced-patterns)

## Basic Setup

Import the audit service at the top of your route file:

```typescript
import { auditService } from '@/lib/services/audit-service';
```

## Logging Entity Creation

### Example: Creating an Obligation

```typescript
// POST /api/v1/obligations
export async function POST(request: NextRequest) {
  // ... authentication and validation ...

  // Create the entity
  const { data: obligation, error } = await supabaseAdmin
    .from('obligations')
    .insert({
      obligation_title: body.obligation_title,
      category: body.category,
      status: 'PENDING',
      // ... other fields
    })
    .select()
    .single();

  if (error) {
    return errorResponse(/* ... */);
  }

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

  return successResponse(obligation);
}
```

### Example: Creating Evidence

```typescript
// POST /api/v1/evidence
export async function POST(request: NextRequest) {
  // ... upload and create evidence ...

  const { data: evidence, error } = await supabaseAdmin
    .from('evidence')
    .insert({
      file_name: uploadedFile.name,
      file_url: fileUrl,
      uploaded_by: user.id,
      // ... other fields
    })
    .select()
    .single();

  // Log creation
  try {
    await auditService.logCreate('evidence', evidence.id, user.id, {
      file_name: evidence.file_name,
      file_type: evidence.file_type,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse(evidence);
}
```

## Logging Entity Updates

### Example: Updating an Obligation

```typescript
// PUT /api/v1/obligations/[obligationId]
export async function PUT(request: NextRequest, { params }: { params: { obligationId: string } }) {
  // ... authentication and validation ...

  const { obligationId } = params;
  const body = await request.json();

  // Get existing data
  const { data: existingObligation } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .single();

  // Build updates object
  const updates: any = {};
  if (body.obligation_title !== undefined) {
    updates.obligation_title = body.obligation_title;
  }
  if (body.status !== undefined) {
    updates.status = body.status;
  }
  // ... other fields

  // Update the entity
  const { data: updatedObligation, error } = await supabaseAdmin
    .from('obligations')
    .update(updates)
    .eq('id', obligationId)
    .select()
    .single();

  if (error) {
    return errorResponse(/* ... */);
  }

  // Build changes object for audit log
  const changes: Record<string, { old: any; new: any }> = {};
  Object.keys(updates).forEach((key) => {
    // Only track actual changes
    if (existingObligation[key] !== updates[key]) {
      changes[key] = {
        old: existingObligation[key],
        new: updates[key],
      };
    }
  });

  // Log the update
  try {
    await auditService.logUpdate('obligation', obligationId, user.id, changes);
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse(updatedObligation);
}
```

### Example: Partial Update (PATCH)

```typescript
// PATCH /api/v1/obligations/[obligationId]
export async function PATCH(request: NextRequest, { params }: { params: { obligationId: string } }) {
  const { obligationId } = params;
  const body = await request.json();

  // Get existing data
  const { data: existing } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .single();

  // Only update fields that are provided
  const updates: any = {};
  const changes: Record<string, { old: any; new: any }> = {};

  // Check each field
  if (body.obligation_title !== undefined && body.obligation_title !== existing.obligation_title) {
    updates.obligation_title = body.obligation_title;
    changes.obligation_title = { old: existing.obligation_title, new: body.obligation_title };
  }

  if (body.category !== undefined && body.category !== existing.category) {
    updates.category = body.category;
    changes.category = { old: existing.category, new: body.category };
  }

  // Update if there are changes
  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from('obligations')
      .update(updates)
      .eq('id', obligationId);

    // Log the changes
    try {
      await auditService.logUpdate('obligation', obligationId, user.id, changes);
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  return successResponse({ updated: Object.keys(changes).length });
}
```

## Logging Status Changes

Status changes are important enough to warrant special tracking:

```typescript
// POST /api/v1/obligations/[obligationId]/complete
export async function POST(request: NextRequest, { params }: { params: { obligationId: string } }) {
  const { obligationId } = params;

  // Get current status
  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('status')
    .eq('id', obligationId)
    .single();

  const oldStatus = obligation.status;
  const newStatus = 'COMPLETED';

  // Update status
  await supabaseAdmin
    .from('obligations')
    .update({
      status: newStatus,
      completed_at: new Date().toISOString(),
    })
    .eq('id', obligationId);

  // Log the status change
  try {
    await auditService.logStatusChange(
      'obligation',
      obligationId,
      user.id,
      oldStatus,
      newStatus,
      {
        completed_at: new Date().toISOString(),
        completion_method: 'manual',
      }
    );
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse({ status: newStatus });
}
```

### Example: Workflow Status Transition

```typescript
// POST /api/v1/obligations/[obligationId]/status
export async function POST(request: NextRequest, { params }: { params: { obligationId: string } }) {
  const { obligationId } = params;
  const body = await request.json();

  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('status')
    .eq('id', obligationId)
    .single();

  const oldStatus = obligation.status;
  const newStatus = body.status;

  // Validate status transition
  const validTransitions = {
    PENDING: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'PENDING'],
    COMPLETED: ['IN_PROGRESS'], // Allow reopening
  };

  if (!validTransitions[oldStatus]?.includes(newStatus)) {
    return errorResponse(
      ErrorCodes.VALIDATION_ERROR,
      `Cannot transition from ${oldStatus} to ${newStatus}`,
      422
    );
  }

  // Update status
  await supabaseAdmin
    .from('obligations')
    .update({ status: newStatus })
    .eq('id', obligationId);

  // Log with transition metadata
  try {
    await auditService.logStatusChange('obligation', obligationId, user.id, oldStatus, newStatus, {
      transition_reason: body.reason,
      previous_state: oldStatus,
      new_state: newStatus,
      is_valid_transition: true,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse({ status: newStatus });
}
```

## Logging Deletions

### Example: Soft Delete

```typescript
// DELETE /api/v1/obligations/[obligationId]
export async function DELETE(request: NextRequest, { params }: { params: { obligationId: string } }) {
  const { obligationId } = params;

  // Get entity data before deletion
  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .single();

  // Soft delete
  await supabaseAdmin
    .from('obligations')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', obligationId);

  // Log the deletion
  try {
    await auditService.logDelete('obligation', obligationId, user.id, {
      obligation_title: obligation.obligation_title,
      status: obligation.status,
      deletion_type: 'soft',
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse({ deleted: true });
}
```

### Example: Hard Delete (Rare)

```typescript
// DELETE /api/v1/admin/obligations/[obligationId]/permanent
export async function DELETE(request: NextRequest, { params }: { params: { obligationId: string } }) {
  // Require admin role
  const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
  if (authResult instanceof NextResponse) return authResult;

  const { obligationId } = params;

  // Get full entity data
  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .single();

  // Log BEFORE deletion (important!)
  try {
    await auditService.logDelete('obligation', obligationId, user.id, {
      ...obligation,
      deletion_type: 'permanent',
      deleted_by_admin: user.email,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  // Perform hard delete
  await supabaseAdmin.from('obligations').delete().eq('id', obligationId);

  return successResponse({ deleted: true, permanent: true });
}
```

## Advanced Patterns

### Pattern 1: Batch Operations

```typescript
// POST /api/v1/obligations/bulk-update
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { obligation_ids, updates } = body;

  // Get existing obligations
  const { data: obligations } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .in('id', obligation_ids);

  // Update all
  await supabaseAdmin
    .from('obligations')
    .update(updates)
    .in('id', obligation_ids);

  // Log each update
  const auditPromises = obligations.map((obligation) => {
    const changes: Record<string, { old: any; new: any }> = {};
    Object.keys(updates).forEach((key) => {
      if (obligation[key] !== updates[key]) {
        changes[key] = { old: obligation[key], new: updates[key] };
      }
    });

    return auditService.logUpdate('obligation', obligation.id, user.id, changes).catch((error) => {
      console.error(`Audit logging failed for ${obligation.id}:`, error);
    });
  });

  // Wait for all audit logs (but don't fail if some fail)
  await Promise.allSettled(auditPromises);

  return successResponse({ updated: obligations.length });
}
```

### Pattern 2: Linking/Unlinking Entities

```typescript
// POST /api/v1/obligations/[obligationId]/evidence/[evidenceId]/link
export async function POST(request: NextRequest, { params }: any) {
  const { obligationId, evidenceId } = params;

  // Create link
  await supabaseAdmin.from('obligation_evidence_links').insert({
    obligation_id: obligationId,
    evidence_id: evidenceId,
    linked_by: user.id,
  });

  // Log as an update to the obligation
  try {
    await auditService.logUpdate('obligation', obligationId, user.id, {
      linked_evidence: {
        old: null,
        new: evidenceId,
      },
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse({ linked: true });
}
```

### Pattern 3: Complex Changes with Metadata

```typescript
// POST /api/v1/obligations/[obligationId]/approve
export async function POST(request: NextRequest, { params }: { params: { obligationId: string } }) {
  const { obligationId } = params;
  const body = await request.json();

  // Get current obligation
  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('id', obligationId)
    .single();

  // Update with approval
  await supabaseAdmin
    .from('obligations')
    .update({
      review_status: 'APPROVED',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      reviewer_notes: body.notes,
    })
    .eq('id', obligationId);

  // Log with rich metadata
  try {
    await auditService.logUpdate('obligation', obligationId, user.id, {
      review_status: {
        old: obligation.review_status,
        new: 'APPROVED',
      },
    });

    // Also log as status change for better tracking
    await auditService.logStatusChange(
      'obligation',
      obligationId,
      user.id,
      obligation.review_status,
      'APPROVED',
      {
        approved_by: user.id,
        approved_by_name: user.full_name,
        approved_by_email: user.email,
        approved_at: new Date().toISOString(),
        reviewer_notes: body.notes,
        previous_version: obligation.version_number,
      }
    );
  } catch (error) {
    console.error('Audit logging failed:', error);
  }

  return successResponse({ approved: true });
}
```

### Pattern 4: Automatic Status Updates

```typescript
// Background job or trigger
async function checkAndUpdateOverdueObligations() {
  const { data: obligations } = await supabaseAdmin
    .from('obligations')
    .select('*')
    .eq('status', 'PENDING')
    .lt('deadline_date', new Date().toISOString());

  for (const obligation of obligations) {
    await supabaseAdmin
      .from('obligations')
      .update({ status: 'OVERDUE' })
      .eq('id', obligation.id);

    // Log automated status change
    try {
      await auditService.logStatusChange(
        'obligation',
        obligation.id,
        'system', // Special user ID for system actions
        'PENDING',
        'OVERDUE',
        {
          automated: true,
          trigger: 'deadline_check',
          deadline_date: obligation.deadline_date,
          checked_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }
}
```

## Best Practices Checklist

- [ ] Always wrap audit logging in try-catch
- [ ] Never fail the request if audit logging fails
- [ ] Log meaningful changes only (exclude internal fields)
- [ ] Include both old and new values for updates
- [ ] Use metadata for additional context
- [ ] Log status changes separately for better tracking
- [ ] Log deletions BEFORE actually deleting
- [ ] Use consistent entity type names
- [ ] Test audit logging in integration tests
- [ ] Handle batch operations properly

## Common Pitfalls

1. **Forgetting to log before delete**: Always log before deleting, especially for hard deletes
2. **Not tracking old values**: Always fetch existing data before updating
3. **Logging internal fields**: Don't log updated_at, version_number, etc.
4. **Failing requests on audit errors**: Audit logging should never fail the main operation
5. **Not using the service**: Always use the audit service, not raw inserts

## Testing Your Integration

```typescript
// Example test
describe('Obligation API with Audit Logging', () => {
  it('should log obligation update', async () => {
    // Update obligation
    const response = await fetch('/api/v1/obligations/123', {
      method: 'PUT',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });

    expect(response.ok).toBe(true);

    // Verify audit log
    const auditResponse = await fetch(
      '/api/v1/audit-logs?entity_type=obligation&entity_id=123'
    );
    const auditData = await auditResponse.json();

    expect(auditData.data).toHaveLength(1);
    expect(auditData.data[0].action).toBe('update');
    expect(auditData.data[0].changes.status).toEqual({
      old: 'PENDING',
      new: 'COMPLETED',
    });
  });
});
```
