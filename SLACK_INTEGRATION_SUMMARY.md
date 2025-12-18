# Slack Integration - Implementation Summary

## Overview
A complete Slack integration has been implemented for the EcoComply platform, enabling real-time compliance notifications to be sent to Slack workspaces.

## Files Created

### Core Integration Files

#### 1. Slack Client (`/lib/integrations/slack/slack-client.ts`)
- Wrapper around Slack Web API
- Methods:
  - `sendMessage()` - Send messages to channels with Block Kit support
  - `postToUser()` - Send direct messages to users
  - `getChannels()` - List available channels
  - `verifyToken()` - Validate Slack token
  - `getChannelInfo()` - Get channel details

#### 2. Slack Notifier (`/lib/integrations/slack/slack-notifier.ts`)
- Formatted notification functions:
  - `notifyDeadlineApproaching()` - Deadline reminder notifications
  - `notifyDeadlineOverdue()` - Overdue alert notifications
  - `notifyComplianceAlert()` - Compliance issue notifications
  - `notifyNewEvidence()` - Evidence upload notifications
  - `sendCustomMessage()` - Custom message support
- Rich formatting using Slack Block Kit

#### 3. Slack Service (`/lib/integrations/slack/slack-service.ts`)
- Helper functions:
  - `getSlackConfig()` - Get Slack configuration for a company
  - `hasSlackIntegration()` - Check if integration exists
  - `getNotificationSettings()` - Get notification preferences
  - `isNotificationEnabled()` - Check if specific notification type is enabled

#### 4. Module Index (`/lib/integrations/slack/index.ts`)
- Exports all Slack integration components
- Provides clean import interface

#### 5. TypeScript Types (`/lib/types/slack.ts`)
- Type definitions for Slack integration
- Interfaces for integration status and settings

### Database Migration

#### `/supabase/migrations/20250220000001_create_slack_integrations_table.sql`
- Creates `slack_integrations` table with columns:
  - `id` - Primary key
  - `company_id` - Foreign key to companies
  - `team_id` - Slack workspace ID
  - `team_name` - Slack workspace name
  - `access_token` - OAuth access token
  - `bot_user_id` - Slack bot user ID
  - `default_channel_id` - Default notification channel
  - `default_channel_name` - Channel name
  - `notification_settings` - JSONB preferences
  - `created_at` / `updated_at` - Timestamps
- Row-level security policies
- Automatic timestamp updates
- Indexes for performance

### API Routes

#### 1. Authorization (`/app/api/v1/integrations/slack/authorize/route.ts`)
- GET endpoint to initiate OAuth flow
- Redirects to Slack authorization page
- Required scopes: channels:read, chat:write, chat:write.public, groups:read, users:read, users:read.email

#### 2. OAuth Callback (`/app/api/v1/integrations/slack/callback/route.ts`)
- GET endpoint to handle OAuth callback
- Exchanges authorization code for access token
- Stores integration in database
- Redirects to settings page with status message

#### 3. Status Check (`/app/api/v1/integrations/slack/status/route.ts`)
- GET endpoint to check integration status
- Returns connection details and settings

#### 4. Channels List (`/app/api/v1/integrations/slack/channels/route.ts`)
- GET endpoint to fetch available Slack channels
- Returns public and private channels bot has access to

#### 5. Settings Management (`/app/api/v1/integrations/slack/route.ts`)
- PATCH endpoint to update integration settings
- DELETE endpoint to disconnect integration
- Validates channel access before saving

### UI Components

#### Settings Page (`/app/dashboard/settings/integrations/slack/page.tsx`)
- Full-featured Slack integration management UI
- Features:
  - Connection status display
  - OAuth connection flow
  - Channel selection dropdown
  - Notification preference toggles:
    - Deadline reminders
    - Overdue alerts
    - Compliance alerts
    - Evidence uploads
  - Disconnect functionality
  - Success/error message handling
- Built with React Query for data fetching
- Responsive design with Tailwind CSS

### Documentation

#### 1. Integration README (`/lib/integrations/slack/README.md`)
- Comprehensive setup guide
- Usage examples
- API endpoint documentation
- Database schema
- Security considerations
- Troubleshooting guide

#### 2. User Guide (`/docs/SLACK_INTEGRATION.md`)
- Complete user and developer guide
- Step-by-step setup instructions
- Notification examples
- Troubleshooting section
- Best practices
- Security considerations

### Testing

#### Test Script (`/scripts/test-slack-integration.ts`)
- Automated testing script for Slack integration
- Tests:
  - Token verification
  - Channel listing
  - All notification types
  - Message formatting
- Usage: `npm run test:slack <token> [channel_id]`

### Configuration

#### Environment Variables (`/.env.example`)
- Added Slack configuration variables:
  - `SLACK_CLIENT_ID` - Slack app client ID
  - `SLACK_CLIENT_SECRET` - Slack app client secret
  - `SLACK_SIGNING_SECRET` - Slack app signing secret

#### Package Scripts (`/package.json`)
- Added `test:slack` script for integration testing

## Dependencies Installed

- `@slack/web-api` - Official Slack Web API client

## Environment Variables Required

```bash
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret
SLACK_SIGNING_SECRET=your_signing_secret
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Slack App**
   - Visit https://api.slack.com/apps
   - Create new app "From scratch"
   - Add required OAuth scopes (see documentation)
   - Configure redirect URLs

3. **Configure Environment**
   - Copy credentials from Slack app settings
   - Add to `.env.local` file

4. **Run Database Migration**
   ```bash
   npm run migrations:apply
   ```

5. **Connect in UI**
   - Navigate to Settings > Integrations > Slack
   - Click "Connect to Slack"
   - Authorize and configure preferences

## Usage Example

```typescript
import { getSlackConfig, isNotificationEnabled } from '@/lib/integrations/slack/slack-service';
import { notifyDeadlineApproaching } from '@/lib/integrations/slack/slack-notifier';

// In a background job or API route
const slackConfig = await getSlackConfig(companyId);
const isEnabled = await isNotificationEnabled(companyId, 'deadline_reminders');

if (slackConfig && isEnabled) {
  await notifyDeadlineApproaching(slackConfig, {
    id: 'obligation-id',
    title: 'Submit Environmental Report',
    deadline: '2025-03-15',
    status: 'PENDING',
    assignee_name: 'John Doe',
  });
}
```

## API Endpoints

- `GET /api/v1/integrations/slack/authorize` - Start OAuth
- `GET /api/v1/integrations/slack/callback` - OAuth callback
- `GET /api/v1/integrations/slack/status` - Check status
- `GET /api/v1/integrations/slack/channels` - List channels
- `PATCH /api/v1/integrations/slack` - Update settings
- `DELETE /api/v1/integrations/slack` - Disconnect

## Features

✅ OAuth 2.0 authentication with Slack
✅ Rich message formatting with Slack Block Kit
✅ Configurable notification preferences
✅ Channel selection and management
✅ Four notification types:
  - Deadline approaching reminders
  - Overdue obligation alerts
  - Compliance issue alerts
  - Evidence upload notifications
✅ Row-level security for multi-tenant isolation
✅ Comprehensive error handling
✅ Full TypeScript support
✅ Test utilities
✅ Complete documentation

## Security

- Row-level security policies ensure company isolation
- OAuth state parameter prevents CSRF attacks
- Access tokens stored in database (should be encrypted at rest)
- Only admins can connect/disconnect integrations
- All API endpoints require authentication

## Next Steps

1. Set up a Slack app at https://api.slack.com/apps
2. Configure environment variables
3. Run the database migration
4. Connect Slack through the settings UI
5. Test notifications with the test script

## Notes

- Slack access tokens don't expire by default
- Bot must be invited to channels before posting
- Maximum 50 messages per minute per channel (Tier 3 rate limit)
- Private channels require explicit bot invitation

## Support

For issues or questions, refer to:
- `/lib/integrations/slack/README.md` - Technical documentation
- `/docs/SLACK_INTEGRATION.md` - User guide
- Application logs for debugging
