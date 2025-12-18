# Slack Integration

This module provides Slack integration for EcoComply, enabling real-time compliance notifications to be sent to Slack channels.

## Features

- OAuth 2.0 authentication with Slack
- Send formatted notifications with Slack Block Kit
- Channel selection and management
- Configurable notification preferences
- Support for multiple notification types:
  - Deadline approaching reminders
  - Overdue deadline alerts
  - Compliance alerts
  - Evidence upload notifications

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Name your app (e.g., "EcoComply") and select your workspace
4. Navigate to "OAuth & Permissions"
5. Add the following **Bot Token Scopes**:
   - `channels:read` - View basic information about public channels
   - `chat:write` - Post messages in approved channels
   - `chat:write.public` - Post messages to channels the bot isn't a member of
   - `groups:read` - View basic information about private channels
   - `users:read` - View people in the workspace
   - `users:read.email` - View email addresses of people in the workspace

6. Add Redirect URL: `https://yourdomain.com/api/v1/integrations/slack/callback`

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
```

You can find these values in your Slack app's "Basic Information" page.

### 3. Run Database Migration

Apply the migration to create the `slack_integrations` table:

```bash
npm run migrations:apply
```

Or manually run the SQL file:
```bash
psql $DATABASE_URL -f supabase/migrations/20250220000001_create_slack_integrations_table.sql
```

## Usage

### Connecting Slack

Users can connect their Slack workspace through the settings page:

1. Navigate to Settings > Integrations > Slack
2. Click "Connect to Slack"
3. Authorize the app in your Slack workspace
4. Select a default notification channel
5. Configure notification preferences

### Sending Notifications Programmatically

```typescript
import { getSlackConfig, isNotificationEnabled } from '@/lib/integrations/slack/slack-service';
import { notifyDeadlineApproaching } from '@/lib/integrations/slack/slack-notifier';

// In your background job or API route
const companyId = 'company-uuid';

// Check if Slack is configured and notifications are enabled
const slackConfig = await getSlackConfig(companyId);
const isEnabled = await isNotificationEnabled(companyId, 'deadline_reminders');

if (slackConfig && isEnabled) {
  const obligation = {
    id: 'obligation-uuid',
    title: 'Submit Annual Environmental Report',
    description: 'Annual compliance report for EPA',
    deadline: '2025-03-15',
    status: 'PENDING',
    assignee_name: 'John Doe',
  };

  await notifyDeadlineApproaching(slackConfig, obligation);
}
```

### Available Notification Functions

#### Deadline Approaching
```typescript
await notifyDeadlineApproaching(slackConfig, obligation);
```

#### Deadline Overdue
```typescript
await notifyDeadlineOverdue(slackConfig, obligation);
```

#### Compliance Alert
```typescript
const alert = {
  id: 'alert-uuid',
  title: 'Permit Violation Detected',
  description: 'Discharge limit exceeded',
  severity: 'high',
  created_at: new Date().toISOString(),
};
await notifyComplianceAlert(slackConfig, alert);
```

#### New Evidence Uploaded
```typescript
const evidence = {
  id: 'evidence-uuid',
  title: 'Permit Document',
  file_name: 'environmental-permit-2025.pdf',
  uploaded_by_name: 'Jane Smith',
  obligation_title: 'Submit Annual Report',
  created_at: new Date().toISOString(),
};
await notifyNewEvidence(slackConfig, evidence);
```

#### Custom Messages
```typescript
await sendCustomMessage(slackConfig, 'Custom notification message');
```

## API Endpoints

### Authorization
- **GET** `/api/v1/integrations/slack/authorize` - Redirect to Slack OAuth

### Callback
- **GET** `/api/v1/integrations/slack/callback` - Handle OAuth callback

### Status
- **GET** `/api/v1/integrations/slack/status` - Check integration status

### Channels
- **GET** `/api/v1/integrations/slack/channels` - List available channels

### Settings
- **PATCH** `/api/v1/integrations/slack` - Update settings
- **DELETE** `/api/v1/integrations/slack` - Disconnect integration

## Database Schema

```sql
CREATE TABLE slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id VARCHAR(50) NOT NULL,
  team_name VARCHAR(255),
  access_token TEXT NOT NULL,
  bot_user_id VARCHAR(50),
  default_channel_id VARCHAR(50),
  default_channel_name VARCHAR(255),
  notification_settings JSONB DEFAULT '{
    "deadline_reminders": true,
    "overdue_alerts": true,
    "compliance_alerts": true,
    "evidence_uploads": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);
```

## Security

- Access tokens are stored in the database and should be encrypted at rest
- OAuth state parameter validates the integration request
- Row-level security policies ensure companies can only access their own integrations
- Only admins can connect/disconnect Slack integrations

## Troubleshooting

### Bot Not in Channel
If notifications aren't being sent, ensure the bot is added to the channel:
1. Open the Slack channel
2. Type `/invite @EcoComply` (or your bot name)
3. The bot will join the channel

### Token Expiration
Slack OAuth tokens don't expire by default, but if authentication fails:
1. Disconnect the integration
2. Reconnect through the settings page

### Missing Permissions
If you get permission errors, verify all required scopes are added in your Slack app settings.

## Testing

Use the test endpoint to verify integration:

```bash
curl -X GET https://yourdomain.com/api/v1/integrations/slack/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For issues or questions:
- Check Slack API documentation: https://api.slack.com/docs
- Review error logs in your application
- Contact support@ecocomply.com
