# Calendar Integration Guide

This guide shows how to integrate calendar syncing into your existing obligation operations.

## Automatic Calendar Sync Integration

### 1. After Creating an Obligation

Add calendar sync after successfully creating an obligation:

```typescript
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

// In your obligation creation endpoint or service
export async function createObligation(data: ObligationInput) {
  // Create obligation in database
  const { data: obligation, error } = await supabase
    .from('obligations')
    .insert(data)
    .select()
    .single();

  if (error) throw error;

  // Sync to calendar (non-blocking)
  if (obligation.deadline_date && obligation.assigned_to) {
    syncObligationToCalendar(obligation).catch(err => {
      console.error('Failed to sync to calendar:', err);
      // Don't throw - calendar sync should not block obligation creation
    });
  }

  return obligation;
}
```

### 2. After Updating an Obligation

Add calendar sync after updating an obligation:

```typescript
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

// In your obligation update endpoint or service
export async function updateObligation(id: string, data: Partial<ObligationInput>) {
  // Update obligation in database
  const { data: obligation, error } = await supabase
    .from('obligations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Sync to calendar (updates existing event or creates new one)
  if (obligation.deadline_date && obligation.assigned_to) {
    syncObligationToCalendar(obligation).catch(err => {
      console.error('Failed to sync to calendar:', err);
    });
  }

  return obligation;
}
```

### 3. After Deleting an Obligation

Remove calendar event when deleting an obligation:

```typescript
import { removeObligationFromCalendar } from '@/lib/integrations/calendar';

// In your obligation deletion endpoint or service
export async function deleteObligation(id: string, userId: string) {
  // Delete obligation from database
  const { error } = await supabase
    .from('obligations')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Remove from calendar
  removeObligationFromCalendar(id, userId).catch(err => {
    console.error('Failed to remove from calendar:', err);
  });
}
```

### 4. After Assigning an Obligation

Sync to the newly assigned user's calendar:

```typescript
import { syncObligationToCalendar, removeObligationFromCalendar } from '@/lib/integrations/calendar';

// In your obligation assignment endpoint or service
export async function assignObligation(id: string, newUserId: string, oldUserId?: string) {
  // Update obligation assignment
  const { data: obligation, error } = await supabase
    .from('obligations')
    .update({ assigned_to: newUserId })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Remove from old user's calendar if there was one
  if (oldUserId) {
    removeObligationFromCalendar(id, oldUserId).catch(err => {
      console.error('Failed to remove from old user calendar:', err);
    });
  }

  // Add to new user's calendar
  if (obligation.deadline_date) {
    syncObligationToCalendar(obligation).catch(err => {
      console.error('Failed to sync to new user calendar:', err);
    });
  }

  return obligation;
}
```

## Bulk Operations

### Sync Multiple Obligations

When performing bulk operations (e.g., importing obligations):

```typescript
import { syncMultipleObligations } from '@/lib/integrations/calendar';

export async function importObligations(obligations: ObligationInput[]) {
  // Insert obligations in database
  const { data: created, error } = await supabase
    .from('obligations')
    .insert(obligations)
    .select();

  if (error) throw error;

  // Sync all to calendar
  const result = await syncMultipleObligations(created);
  console.log(`Synced ${result.synced} obligations, ${result.failed} failed`);

  return created;
}
```

### Sync All User Obligations

After a user connects their calendar:

```typescript
import { syncAllUserObligations } from '@/lib/integrations/calendar';

// Call this after OAuth callback completes
export async function onCalendarConnected(userId: string) {
  // Sync all existing obligations
  const result = await syncAllUserObligations(userId);

  return {
    message: `Synced ${result.synced} deadlines to your calendar`,
    synced: result.synced,
    failed: result.failed,
  };
}
```

## API Route Examples

### POST /api/v1/obligations (Create)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Create obligation
  const { data: obligation, error } = await supabase
    .from('obligations')
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Async calendar sync (don't await)
  if (obligation.deadline_date && obligation.assigned_to) {
    syncObligationToCalendar(obligation).catch(console.error);
  }

  return NextResponse.json(obligation);
}
```

### PATCH /api/v1/obligations/:id (Update)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const body = await request.json();

  // Update obligation
  const { data: obligation, error } = await supabase
    .from('obligations')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Sync updated obligation to calendar
  if (obligation.deadline_date && obligation.assigned_to) {
    syncObligationToCalendar(obligation).catch(console.error);
  }

  return NextResponse.json(obligation);
}
```

### DELETE /api/v1/obligations/:id (Delete)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeObligationFromCalendar } from '@/lib/integrations/calendar';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Get obligation to find assigned user
  const { data: obligation } = await supabase
    .from('obligations')
    .select('assigned_to')
    .eq('id', params.id)
    .single();

  // Delete obligation
  const { error } = await supabase
    .from('obligations')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Remove from calendar
  if (obligation?.assigned_to) {
    removeObligationFromCalendar(params.id, obligation.assigned_to)
      .catch(console.error);
  }

  return NextResponse.json({ success: true });
}
```

## Error Handling

Calendar sync should never block primary operations. Always handle errors gracefully:

```typescript
// Good: Non-blocking with error logging
syncObligationToCalendar(obligation).catch(err => {
  console.error('Calendar sync failed:', err);
  // Optional: Send to error tracking service
  // sentry.captureException(err);
});

// Bad: Blocking operation
try {
  await syncObligationToCalendar(obligation);
} catch (error) {
  // This would block obligation creation if calendar sync fails
  return NextResponse.json({ error: 'Calendar sync failed' }, { status: 500 });
}
```

## Database Triggers (Alternative Approach)

For fully automatic syncing, you can use database triggers:

```sql
-- Function to sync obligation to calendar
CREATE OR REPLACE FUNCTION sync_obligation_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if deadline and assignment exist
  IF NEW.deadline_date IS NOT NULL AND NEW.assigned_to IS NOT NULL THEN
    -- Call your sync service via a background job
    -- This could be a pg_notify or insert into a job queue
    PERFORM pg_notify('calendar_sync', json_build_object(
      'obligation_id', NEW.id,
      'user_id', NEW.assigned_to,
      'action', TG_OP
    )::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT
CREATE TRIGGER trigger_sync_obligation_insert
  AFTER INSERT ON obligations
  FOR EACH ROW
  EXECUTE FUNCTION sync_obligation_to_calendar();

-- Trigger on UPDATE
CREATE TRIGGER trigger_sync_obligation_update
  AFTER UPDATE OF deadline_date, assigned_to ON obligations
  FOR EACH ROW
  WHEN (
    NEW.deadline_date IS DISTINCT FROM OLD.deadline_date
    OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
  )
  EXECUTE FUNCTION sync_obligation_to_calendar();

-- Trigger on DELETE
CREATE TRIGGER trigger_sync_obligation_delete
  BEFORE DELETE ON obligations
  FOR EACH ROW
  EXECUTE FUNCTION sync_obligation_to_calendar();
```

Then listen for notifications in your worker:

```typescript
import { createClient } from '@supabase/supabase-js';
import { syncObligationToCalendar, removeObligationFromCalendar } from '@/lib/integrations/calendar';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Listen for calendar sync notifications
supabase
  .channel('calendar_sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'obligations' }, async (payload) => {
    const { obligation_id, user_id, action } = JSON.parse(payload.new);

    if (action === 'DELETE') {
      await removeObligationFromCalendar(obligation_id, user_id);
    } else {
      // Fetch full obligation data
      const { data } = await supabase
        .from('obligations')
        .select('*')
        .eq('id', obligation_id)
        .single();

      if (data) {
        await syncObligationToCalendar(data);
      }
    }
  })
  .subscribe();
```

## Testing Calendar Integration

Test your integration:

```typescript
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

// Test syncing an obligation
const testObligation = {
  id: 'test-id',
  obligation_title: 'Test Deadline',
  obligation_description: 'Testing calendar sync',
  deadline_date: '2025-12-31',
  category: 'REPORTING',
  site_id: 'site-id',
  company_id: 'company-id',
  assigned_to: 'user-id',
};

await syncObligationToCalendar(testObligation);
console.log('✓ Obligation synced to calendar');
```

## Best Practices

1. **Never block primary operations** - Always use async/await with .catch()
2. **Log errors** - Track failed syncs for debugging
3. **Graceful degradation** - App should work even if calendar sync fails
4. **User feedback** - Show calendar sync status in UI
5. **Retry logic** - Consider retrying failed syncs
6. **Rate limiting** - Be mindful of API rate limits
7. **Batch operations** - Use bulk sync for multiple obligations

## Monitoring

Track calendar sync metrics:

```typescript
import { syncObligationToCalendar } from '@/lib/integrations/calendar';

async function trackCalendarSync(obligation: Obligation) {
  const startTime = Date.now();

  try {
    await syncObligationToCalendar(obligation);

    // Track success
    analytics.track('calendar_sync_success', {
      duration: Date.now() - startTime,
      obligation_id: obligation.id,
    });
  } catch (error) {
    // Track failure
    analytics.track('calendar_sync_failed', {
      duration: Date.now() - startTime,
      obligation_id: obligation.id,
      error: error.message,
    });

    throw error;
  }
}
```

## Support

For issues with calendar integration:
- Check `/lib/integrations/calendar/README.md` for setup instructions
- Verify OAuth credentials are configured correctly
- Check user has connected their calendar
- Verify tokens haven't expired
- Check API logs for detailed error messages
