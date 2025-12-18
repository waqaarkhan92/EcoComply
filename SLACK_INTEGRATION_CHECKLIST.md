# Slack Integration Setup Checklist

## Prerequisites
- [x] @slack/web-api package installed
- [x] Database migration created
- [x] TypeScript types defined
- [x] All API routes implemented
- [x] UI components created
- [x] Documentation written

## Setup Steps

### 1. Create Slack App
- [ ] Go to https://api.slack.com/apps
- [ ] Click "Create New App" > "From scratch"
- [ ] Name: "EcoComply"
- [ ] Select your workspace
- [ ] Click "Create App"

### 2. Configure OAuth & Permissions
- [ ] Navigate to "OAuth & Permissions"
- [ ] Add Bot Token Scopes:
  - [ ] `channels:read`
  - [ ] `chat:write`
  - [ ] `chat:write.public`
  - [ ] `groups:read`
  - [ ] `users:read`
  - [ ] `users:read.email`

### 3. Set Redirect URLs
- [ ] In "OAuth & Permissions", add redirect URLs:
  - [ ] Dev: `http://localhost:3000/api/v1/integrations/slack/callback`
  - [ ] Prod: `https://yourdomain.com/api/v1/integrations/slack/callback`
- [ ] Click "Save URLs"

### 4. Get Credentials
- [ ] Go to "Basic Information"
- [ ] Copy "Client ID"
- [ ] Copy "Client Secret"
- [ ] Copy "Signing Secret"

### 5. Configure Environment
- [ ] Create or edit `.env.local`
- [ ] Add the following variables:
```bash
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
```

### 6. Run Database Migration
Choose one option:
- [ ] Option A: `npm run migrations:apply`
- [ ] Option B: Manually run SQL file:
```bash
psql $DATABASE_URL -f supabase/migrations/20250220000001_create_slack_integrations_table.sql
```

### 7. Verify Migration
- [ ] Check that `slack_integrations` table exists
- [ ] Verify RLS policies are active
- [ ] Check indexes are created

### 8. Test Integration (Optional)
- [ ] Get a test token from Slack app
- [ ] Run: `npm run test:slack <token> <channel_id>`
- [ ] Verify all 6 tests pass
- [ ] Check test messages in Slack channel

### 9. Connect via UI
- [ ] Start the application: `npm run dev`
- [ ] Navigate to Settings > Integrations > Slack
- [ ] Click "Connect to Slack"
- [ ] Authorize the app in Slack
- [ ] Verify successful connection

### 10. Configure Settings
- [ ] Select default notification channel
- [ ] Enable desired notification types:
  - [ ] Deadline Reminders
  - [ ] Overdue Alerts
  - [ ] Compliance Alerts
  - [ ] Evidence Uploads
- [ ] Click "Save Settings"

### 11. Invite Bot to Channel
- [ ] Open your selected Slack channel
- [ ] Type: `/invite @EcoComply`
- [ ] Press Enter

### 12. Test Notifications
- [ ] Trigger a test notification (or wait for a scheduled one)
- [ ] Verify notification appears in Slack channel
- [ ] Check formatting and content

## Verification Checklist

### API Endpoints
Test each endpoint manually or with Postman:
- [ ] `GET /api/v1/integrations/slack/authorize` - Redirects to Slack
- [ ] `GET /api/v1/integrations/slack/callback` - Handles OAuth
- [ ] `GET /api/v1/integrations/slack/status` - Returns status
- [ ] `GET /api/v1/integrations/slack/channels` - Lists channels
- [ ] `PATCH /api/v1/integrations/slack` - Updates settings
- [ ] `DELETE /api/v1/integrations/slack` - Disconnects

### Database
- [ ] `slack_integrations` table exists
- [ ] Table has all required columns
- [ ] RLS policies are active
- [ ] Indexes are created
- [ ] Foreign key constraints work

### UI
- [ ] Settings page loads without errors
- [ ] "Connect to Slack" button works
- [ ] OAuth flow completes successfully
- [ ] Connection status displays correctly
- [ ] Channel dropdown populates
- [ ] Notification toggles work
- [ ] Save settings works
- [ ] Disconnect button works

### Notifications
Test each notification type:
- [ ] Deadline approaching notifications
- [ ] Overdue alerts
- [ ] Compliance alerts
- [ ] Evidence upload notifications

### Security
- [ ] OAuth state parameter is validated
- [ ] Access tokens are stored securely
- [ ] RLS policies prevent cross-company access
- [ ] Only admins can connect/disconnect
- [ ] API endpoints require authentication

## Troubleshooting

### Common Issues

**Messages not appearing in Slack**
- [ ] Bot is invited to the channel
- [ ] Default channel is set in settings
- [ ] Notification type is enabled
- [ ] Check application logs for errors

**OAuth authorization fails**
- [ ] Environment variables are set correctly
- [ ] Redirect URL matches in Slack app
- [ ] All required scopes are added
- [ ] Slack app is not deleted

**Channel not listed**
- [ ] Bot is invited to the channel
- [ ] Channel is not archived
- [ ] Check channel permissions

**Database errors**
- [ ] Migration was run successfully
- [ ] Database connection is working
- [ ] RLS policies are not blocking access

## Production Deployment Checklist

### Before Deploying
- [ ] Update redirect URL to production domain
- [ ] Set production environment variables
- [ ] Run database migration on production database
- [ ] Test OAuth flow in staging environment
- [ ] Review security settings

### After Deploying
- [ ] Verify OAuth flow works in production
- [ ] Test notification delivery
- [ ] Monitor error logs
- [ ] Test from multiple companies (multi-tenancy)
- [ ] Verify RLS policies work correctly

### Monitoring
- [ ] Set up alerts for failed Slack API calls
- [ ] Monitor rate limits (50 messages/min)
- [ ] Track notification delivery success rate
- [ ] Log OAuth errors
- [ ] Monitor database performance

## Documentation

### User Documentation
- [ ] `/docs/SLACK_INTEGRATION.md` - User guide
- [ ] Setup instructions clear and accurate
- [ ] Screenshots added (if needed)
- [ ] Troubleshooting section helpful

### Developer Documentation
- [ ] `/lib/integrations/slack/README.md` - Technical docs
- [ ] API endpoints documented
- [ ] Code examples provided
- [ ] Database schema documented

## Support

### Resources
- Slack API Documentation: https://api.slack.com/docs
- Application logs: Check for `Slack` prefix
- Error tracking: Sentry (if configured)
- Support email: support@ecocomply.com

### Next Steps
After setup is complete:
1. [ ] Train team on using Slack notifications
2. [ ] Document company-specific channel setup
3. [ ] Set up monitoring and alerts
4. [ ] Plan for scaling (multiple workspaces if needed)
5. [ ] Gather user feedback

---

## Notes
- Slack access tokens don't expire by default
- Bot must be invited to private channels
- Rate limit: 50 messages per minute (Tier 3)
- Keep environment variables secure
- Regularly review and update scopes as needed
