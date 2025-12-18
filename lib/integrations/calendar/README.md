# Calendar Integration for EcoComply

This module provides calendar integration for syncing compliance deadlines with Google Calendar and Outlook Calendar.

## Features

- OAuth 2.0 authentication for Google Calendar and Outlook Calendar
- Automatic sync of obligation deadlines to user's calendar
- Support for multiple calendars per user
- Automatic token refresh
- Manual and automatic sync options
- Event creation, updates, and deletion

## Setup

### 1. Google Calendar Integration

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted
4. Select "Web application" as the application type
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/v1/integrations/calendar/callback`
   - Production: `https://yourdomain.com/api/v1/integrations/calendar/callback`
6. Copy the Client ID and Client Secret

#### Add to Environment Variables
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/integrations/calendar/callback
```

### 2. Outlook Calendar Integration

#### Register Azure App
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Enter application details:
   - Name: "EcoComply Calendar Integration"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: `http://localhost:3000/api/v1/integrations/calendar/callback`
5. Click "Register"

#### Configure API Permissions
1. Go to "API permissions"
2. Click "Add a permission" > "Microsoft Graph"
3. Select "Delegated permissions"
4. Add these permissions:
   - `Calendars.ReadWrite`
   - `offline_access`
5. Click "Grant admin consent"

#### Create Client Secret
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description and select expiration
4. Copy the secret value (shown only once)

#### Add to Environment Variables
```bash
MICROSOFT_CLIENT_ID=your_application_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/v1/integrations/calendar/callback
```

### 3. Database Migration

Run the migration to create the required tables:

```bash
# Apply migration using Supabase CLI
supabase db push

# Or run directly in your database
psql $DATABASE_URL -f supabase/migrations/20250218000002_create_calendar_integrations.sql
```

## Usage

### Connecting a Calendar

Users can connect their calendar through the settings page:

1. Navigate to Settings > Integrations > Calendar
2. Click "Connect Google Calendar" or "Connect Outlook Calendar"
3. Authorize the application in the OAuth flow
4. Select which calendar to sync to
5. Enable auto-sync if desired

### Programmatic Usage

#### Sync a Single Deadline

```typescript
import { calendarSyncService } from '@/lib/integrations/calendar';

const obligation = {
  id: 'obligation-id',
  obligation_title: 'Submit Environmental Report',
  obligation_description: 'Annual environmental compliance report',
  deadline_date: '2025-03-31',
  category: 'REPORTING',
  // ... other fields
};

await calendarSyncService.syncDeadlineToCalendar(userId, obligation);
```

#### Sync All Deadlines

```typescript
import { calendarSyncService } from '@/lib/integrations/calendar';

const result = await calendarSyncService.syncAllDeadlines(userId);
console.log(`Synced ${result.synced} deadlines, ${result.failed} failed`);
```

#### Remove Deadline from Calendar

```typescript
import { calendarSyncService } from '@/lib/integrations/calendar';

await calendarSyncService.removeDeadlineFromCalendar(userId, obligationId);
```

## API Routes

### Authorization
**GET** `/api/v1/integrations/calendar/authorize?provider=google|outlook`

Initiates OAuth flow for the specified provider.

### Callback
**GET** `/api/v1/integrations/calendar/callback`

Handles OAuth callback and stores tokens.

### Status
**GET** `/api/v1/integrations/calendar/status`

Returns connection status and available calendars.

**PATCH** `/api/v1/integrations/calendar/status`

Updates calendar settings (calendar selection, sync enabled).

### Sync
**POST** `/api/v1/integrations/calendar/sync`

Manually triggers sync of all deadlines.

### Disconnect
**DELETE** `/api/v1/integrations/calendar?provider=google|outlook`

Disconnects the specified calendar integration.

## Database Schema

### calendar_integrations

Stores OAuth tokens and settings for each user's calendar integration.

```sql
CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50), -- 'google' or 'outlook'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255),
  sync_enabled BOOLEAN,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### calendar_event_mappings

Maps obligations to external calendar events.

```sql
CREATE TABLE calendar_event_mappings (
  id UUID PRIMARY KEY,
  integration_id UUID REFERENCES calendar_integrations(id),
  obligation_id UUID REFERENCES obligations(id),
  external_event_id VARCHAR(255),
  synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Security Considerations

1. **Token Storage**: Access tokens and refresh tokens are stored encrypted in the database
2. **Token Refresh**: Access tokens are automatically refreshed when expired
3. **State Parameter**: OAuth state includes user ID and timestamp to prevent CSRF attacks
4. **RLS Policies**: Row-level security ensures users can only access their own integrations
5. **Scopes**: Minimal required scopes (read/write calendars only)

## Automatic Sync

To enable automatic syncing when deadlines are created or updated, add these hooks:

```typescript
// In your obligation mutation/creation code
import { calendarSyncService } from '@/lib/integrations/calendar';

// After creating/updating obligation
if (obligation.deadline_date && obligation.assigned_to) {
  await calendarSyncService.syncDeadlineToCalendar(
    obligation.assigned_to,
    obligation
  );
}

// After deleting obligation
await calendarSyncService.removeDeadlineFromCalendar(
  userId,
  obligationId
);
```

## Troubleshooting

### Token Expired Errors
- Tokens are automatically refreshed when expired
- If refresh fails, user needs to reconnect their calendar

### Events Not Syncing
- Check that `sync_enabled` is true for the integration
- Verify the `calendar_id` is set
- Check that obligations have `deadline_date` set
- Verify obligations are assigned to the user

### OAuth Errors
- Verify redirect URIs match exactly in OAuth provider settings
- Check that API credentials are correct in environment variables
- Ensure required API permissions are granted

## Development Notes

- The sync service handles both Google and Outlook calendars transparently
- Token refresh is automatic and handled by the sync service
- Events are stored as all-day events with the deadline date
- Reminders are set for 7 days, 3 days, and 1 day before deadline
- Failed syncs are logged but don't block the operation

## Testing

Test the integration locally:

1. Set up OAuth credentials for development
2. Add redirect URIs pointing to localhost:3000
3. Run the app locally: `npm run dev`
4. Navigate to Settings > Integrations > Calendar
5. Connect a calendar and test syncing

## License

Part of the EcoComply platform. See main project license.
