# Slack Integration Guide

## Overview

The Slack integration enables EcoComply to send real-time compliance notifications directly to your team's Slack workspace. This ensures your team stays informed about critical compliance deadlines, alerts, and updates without constantly checking the dashboard.

## Features

### Notification Types

1. **Deadline Reminders** - Get notified when compliance deadlines are approaching
2. **Overdue Alerts** - Immediate alerts when obligations become overdue
3. **Compliance Alerts** - Critical compliance issues and violations
4. **Evidence Uploads** - Track when team members upload compliance evidence

### Capabilities

- Rich formatting using Slack Block Kit
- Customizable notification preferences
- Channel selection for targeted notifications
- OAuth 2.0 secure authentication
- Support for both public and private channels

## Setup Guide

### Step 1: Create a Slack App

1. Visit [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter app name: `EcoComply`
5. Select your Slack workspace
6. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In your app settings, navigate to **"OAuth & Permissions"**
2. Scroll to **"Scopes"** section
3. Under **"Bot Token Scopes"**, add the following scopes:
   - `channels:read` - View basic information about public channels
   - `chat:write` - Post messages in approved channels
   - `chat:write.public` - Post messages to channels the bot isn't a member of
   - `groups:read` - View basic information about private channels
   - `users:read` - View people in the workspace
   - `users:read.email` - View email addresses of people in the workspace

### Step 3: Set Redirect URLs

1. In **"OAuth & Permissions"**, scroll to **"Redirect URLs"**
2. Click **"Add New Redirect URL"**
3. Enter your callback URL:
   - Development: `http://localhost:3000/api/v1/integrations/slack/callback`
   - Production: `https://yourdomain.com/api/v1/integrations/slack/callback`
4. Click **"Add"** then **"Save URLs"**

### Step 4: Configure Environment Variables

1. Navigate to **"Basic Information"** in your Slack app settings
2. Copy the following credentials:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

3. Add these to your `.env.local` file:

```bash
# Slack Integration
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
```

### Step 5: Run Database Migration

Apply the Slack integrations migration:

```bash
npm run migrations:apply
```

Or manually run:

```bash
psql $DATABASE_URL -f supabase/migrations/20250220000001_create_slack_integrations_table.sql
```

### Step 6: Connect Slack in EcoComply

1. Log into EcoComply
2. Navigate to **Settings** > **Integrations** > **Slack**
3. Click **"Connect to Slack"**
4. Authorize the app in your Slack workspace
5. Select a default notification channel
6. Configure your notification preferences
7. Click **"Save Settings"**

## User Guide

### Connecting Slack

1. Go to **Dashboard** > **Settings** > **Integrations** > **Slack**
2. Click the **"Connect to Slack"** button
3. You'll be redirected to Slack
4. Review the permissions and click **"Allow"**
5. You'll be redirected back to EcoComply

### Configuring Notifications

After connecting, configure which notifications you want to receive:

#### Channel Selection
Choose which Slack channel will receive compliance notifications. The bot must be invited to private channels before they can be selected.

#### Notification Preferences

Toggle each notification type on/off:

- **Deadline Reminders**: Notifications when obligations are approaching their due date
- **Overdue Alerts**: Critical alerts when obligations become overdue
- **Compliance Alerts**: High-priority compliance issues and violations
- **Evidence Uploads**: Updates when team members upload evidence

### Inviting the Bot to Channels

For the bot to send messages to a channel, it must be a member:

1. Open the Slack channel
2. Type: `/invite @EcoComply`
3. Press Enter
4. The bot will join the channel

### Disconnecting Slack

1. Go to **Settings** > **Integrations** > **Slack**
2. Click **"Disconnect"**
3. Confirm the action
4. All Slack notifications will stop

## Notification Examples

### Deadline Approaching

```
⏰ Deadline Approaching

Obligation: Submit Annual Environmental Report
Days Until Due: 7 days
Deadline: March 15, 2025
Status: PENDING

Assigned to: John Doe

Description: Annual compliance report for EPA

🔔 This is a reminder that the deadline is approaching. Please take action soon.
```

### Deadline Overdue

```
🚨 Deadline Overdue

Obligation: Water Quality Testing Report
Days Overdue: 3 days
Original Deadline: March 10, 2025
Status: OVERDUE

Assigned to: Jane Smith

⚠️ This obligation is overdue and requires immediate attention!
```

### Compliance Alert

```
🚨 Compliance Alert - HIGH

Alert: Discharge Limit Exceeded
Severity: HIGH

Description: Wastewater discharge exceeded permitted limits by 15%

Alert ID: alert-123 | Created: March 13, 2025 10:30 AM
```

### Evidence Upload

```
📎 New Evidence Uploaded

File Name: environmental-permit-2025.pdf
Uploaded By: Mike Johnson

Related Obligation: Submit Annual Report

Evidence ID: evidence-456 | Uploaded: March 13, 2025 2:15 PM
```

## Developer Guide

### Programmatic Usage

```typescript
import { getSlackConfig } from '@/lib/integrations/slack/slack-service';
import { notifyDeadlineApproaching } from '@/lib/integrations/slack/slack-notifier';

// Get Slack configuration for a company
const slackConfig = await getSlackConfig(companyId);

if (slackConfig) {
  // Send notification
  const result = await notifyDeadlineApproaching(slackConfig, {
    id: 'obligation-123',
    title: 'Submit Report',
    deadline: '2025-03-15',
    status: 'PENDING',
  });

  if (result.ok) {
    console.log('Notification sent successfully');
  }
}
```

### Testing the Integration

Use the test script to verify your Slack integration:

```bash
npm run test:slack <access_token> [channel_id]
```

Or set environment variables:

```bash
SLACK_ACCESS_TOKEN=xoxb-your-token
SLACK_TEST_CHANNEL_ID=C123456789
npm run test:slack
```

### API Endpoints

All Slack integration endpoints are under `/api/v1/integrations/slack/`:

- `GET /authorize` - Start OAuth flow
- `GET /callback` - OAuth callback handler
- `GET /status` - Check connection status
- `GET /channels` - List available channels
- `PATCH /` - Update settings
- `DELETE /` - Disconnect integration

## Troubleshooting

### Messages Not Appearing

**Issue**: Notifications aren't showing up in Slack

**Solutions**:
1. Verify the bot is invited to the channel: `/invite @EcoComply`
2. Check notification preferences are enabled
3. Verify the default channel is set
4. Check error logs for permission issues

### Authorization Failed

**Issue**: OAuth authorization fails

**Solutions**:
1. Verify environment variables are set correctly
2. Check redirect URL matches in Slack app settings
3. Ensure all required scopes are added
4. Try disconnecting and reconnecting

### Token Invalid

**Issue**: "Invalid token" or authentication errors

**Solutions**:
1. Disconnect and reconnect the integration
2. Verify the Slack app hasn't been deleted
3. Check if workspace admin changed permissions

### Channel Not Found

**Issue**: Selected channel doesn't appear in list

**Solutions**:
1. Ensure the bot has been invited to the channel
2. For private channels, the bot must be explicitly invited
3. Archived channels won't appear in the list

### Missing Notifications

**Issue**: Some notification types aren't being sent

**Solutions**:
1. Check notification settings in EcoComply
2. Verify the notification type toggle is enabled
3. Check if background jobs are running
4. Review application logs for errors

## Security Considerations

### Access Token Storage

- Slack access tokens are stored in the `slack_integrations` table
- Tokens should be encrypted at rest in production
- Consider using Supabase's encryption features

### Permissions

- Row-level security ensures companies only access their own integrations
- Only users with ADMIN or SUPER_ADMIN roles can connect/disconnect Slack
- OAuth state parameter prevents CSRF attacks

### Data Privacy

- Only essential compliance data is sent to Slack
- No sensitive personal information is included in notifications
- Messages respect Slack workspace retention policies

## Rate Limits

Slack API rate limits:
- Tier 1 methods: 1 request per minute
- Tier 2 methods: 20 requests per minute
- Tier 3 methods: 50 requests per minute
- Tier 4 methods: 100 requests per minute

The integration uses `chat.postMessage` (Tier 3), allowing up to 50 notifications per minute.

## Best Practices

1. **Channel Organization**
   - Create a dedicated #compliance channel for notifications
   - Use channel topics to explain what notifications are sent

2. **Notification Management**
   - Disable notification types you don't need
   - Review and adjust settings based on team feedback
   - Test notifications during setup

3. **Team Communication**
   - Inform your team when Slack integration is enabled
   - Document your notification preferences
   - Set expectations for response times

4. **Monitoring**
   - Regularly review logs for failed notifications
   - Monitor channel activity to ensure notifications are received
   - Update channel settings if team structure changes

## Support

For issues or questions:
- Check the [Slack API Documentation](https://api.slack.com/docs)
- Review application logs for error messages
- Contact EcoComply support at support@ecocomply.com

## Changelog

### Version 1.0.0 (2025-02-20)
- Initial release
- OAuth 2.0 authentication
- Four notification types
- Channel selection
- Configurable preferences
- Slack Block Kit formatting
