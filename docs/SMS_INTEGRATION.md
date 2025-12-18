# SMS Notification Integration

This document describes the SMS notification feature for EcoComply, which uses Twilio to send critical alerts, overdue notifications, and compliance breach alerts to users via SMS.

## Overview

The SMS notification system allows users to receive time-sensitive compliance alerts on their mobile phones. This feature is particularly useful for critical events that require immediate attention.

## Features

- **Phone Verification**: Users must verify their phone number before enabling SMS notifications
- **Critical Alerts**: Receive SMS for critical compliance breaches and severe issues
- **Overdue Notifications**: Get notified when compliance deadlines are overdue
- **Breach Alerts**: Immediate notification of any compliance violations
- **Granular Control**: Users can toggle individual notification types on/off
- **Security**: Phone numbers are verified before use and can be removed at any time

## Setup Instructions

### 1. Twilio Account Setup

1. Create a Twilio account at [https://www.twilio.com](https://www.twilio.com)
2. Get a Twilio phone number (this will be used to send SMS)
3. Find your Account SID and Auth Token in the Twilio Console

### 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important**: The phone number must be in E.164 format (e.g., +1234567890)

### 3. Database Migration

Run the phone verification migration:

```bash
# The migration file is located at:
# supabase/migrations/20250218000002_add_phone_verification.sql

# This adds:
# - phone_verified column to users table
# - sms_notifications_enabled column to users table
# - phone_verifications table for storing verification codes
```

### 4. Testing SMS Functionality

You can test SMS notifications using the following steps:

1. Navigate to Settings > Notifications > SMS Settings in the dashboard
2. Enter your phone number in international format (e.g., +1234567890)
3. Click "Verify" to receive a verification code
4. Enter the 6-digit code to verify your phone number
5. Enable SMS notifications and select which alert types you want to receive

## Architecture

### Components

1. **Twilio Client** (`/lib/integrations/twilio/twilio-client.ts`)
   - Handles direct communication with Twilio API
   - Sends SMS messages
   - Manages verification codes

2. **SMS Notification Service** (`/lib/services/sms-notification-service.ts`)
   - Business logic for sending different types of SMS notifications
   - Checks user preferences before sending
   - Logs all SMS notifications to database
   - Manages message templates

3. **API Routes**
   - `/api/v1/users/phone/verify` - Send verification code
   - `/api/v1/users/phone/verify/confirm` - Confirm verification code
   - `/api/v1/settings/sms` - Get/update SMS settings, remove phone number

4. **UI Components**
   - `/app/dashboard/settings/sms/page.tsx` - SMS settings page with verification flow

### Database Schema

#### Users Table (updated)
```sql
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT false;
```

#### Phone Verifications Table
```sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  verification_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Usage

### Sending SMS Notifications Programmatically

```typescript
import { smsNotificationService } from '@/lib/services/sms-notification-service';

// Send a critical alert
await smsNotificationService.sendCriticalAlert(userId, {
  title: 'High Severity Breach',
  severity: 'CRITICAL',
  entityType: 'Permit',
  entityName: 'Air Quality Permit #12345',
});

// Send an overdue notification
await smsNotificationService.sendOverdueNotification(userId, {
  obligationName: 'Monthly Air Quality Report',
  dueDate: '2024-01-15',
  daysOverdue: 5,
});

// Send a breach alert
await smsNotificationService.sendBreachAlert(userId, {
  breachType: 'Emission Limit Exceeded',
  severity: 'HIGH',
  description: 'PM2.5 levels exceeded permitted threshold',
});
```

### Message Templates

All SMS messages are designed to be concise and under 160 characters when possible:

**Critical Alert Template:**
```
CRITICAL: [title] - [severity]. [entityType]: [entityName]
```

**Overdue Notification Template:**
```
OVERDUE: [obligationName] was due [dueDate]. Now [daysOverdue] days overdue.
```

**Breach Alert Template:**
```
BREACH ALERT: [breachType] - [severity]. [description]
```

## User Preferences

Users can control their SMS notifications through the following preferences:

1. **Global SMS Toggle**: Enable/disable all SMS notifications
2. **Critical Alerts**: Toggle for critical compliance issues
3. **Overdue Notifications**: Toggle for deadline overdue alerts
4. **Breach Alerts**: Toggle for compliance breach notifications

Preferences are stored in the `notification_preferences` JSONB field in the users table.

## Security Considerations

1. **Phone Verification**: All phone numbers must be verified before SMS can be sent
2. **Verification Code Expiry**: Codes expire after 10 minutes
3. **Rate Limiting**: Verification codes can only be requested once every 2 minutes
4. **User Control**: Users can remove their phone number at any time
5. **Audit Trail**: All SMS notifications are logged in the notifications table

## Cost Considerations

- Twilio charges per SMS message sent
- Messages are kept under 160 characters to avoid multi-part SMS charges
- Only critical notifications are sent via SMS to minimize costs
- Users must explicitly opt-in to SMS notifications

## Testing

### Manual Testing

1. Set up Twilio test credentials in development
2. Use Twilio test phone numbers to avoid charges
3. Verify phone verification flow works correctly
4. Test each notification type (critical, overdue, breach)
5. Test preference toggles work as expected

### Unit Testing

Test files should be created at:
- `/tests/unit/lib/integrations/twilio/twilio-client.test.ts`
- `/tests/unit/lib/services/sms-notification-service.test.ts`

## Troubleshooting

### SMS Not Sending

1. **Check Twilio Configuration**
   - Verify TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set
   - Ensure phone number is in E.164 format

2. **Check Phone Verification**
   - User's phone must be verified (`phone_verified = true`)
   - SMS must be enabled (`sms_notifications_enabled = true`)
   - Specific notification type must be enabled in preferences

3. **Check Twilio Console**
   - View SMS logs in Twilio Console
   - Check for error messages or delivery failures

### Verification Code Not Received

1. Check if phone number is in correct format (E.164)
2. Verify Twilio account has sufficient balance
3. Check Twilio phone number is SMS-capable
4. Ensure phone number is not blocked or on a do-not-disturb list

## Future Enhancements

Potential improvements for the SMS notification system:

1. **Two-Factor Authentication**: Use SMS for 2FA login
2. **Delivery Reports**: Track SMS delivery status
3. **Opt-out Keywords**: Support STOP/START keywords
4. **Multiple Phone Numbers**: Allow users to add multiple phone numbers
5. **Scheduled Messages**: Support for scheduled SMS delivery
6. **Message History**: View history of sent SMS messages
7. **International Support**: Better support for international phone numbers
8. **WhatsApp Integration**: Add WhatsApp as an alternative channel

## API Reference

### POST /api/v1/users/phone/verify

Start phone verification process.

**Request Body:**
```json
{
  "phone_number": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expires_at": "2024-02-18T12:10:00Z"
}
```

### POST /api/v1/users/phone/verify/confirm

Confirm phone verification.

**Request Body:**
```json
{
  "code": "123456",
  "phone_number": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "phone_number": "+1234567890"
}
```

### GET /api/v1/settings/sms

Get SMS notification settings.

**Response:**
```json
{
  "phone_number": "+1234567890",
  "phone_verified": true,
  "sms_enabled": true,
  "preferences": {
    "critical_alerts": true,
    "overdue_notifications": true,
    "breach_alerts": false
  }
}
```

### PUT /api/v1/settings/sms

Update SMS notification settings.

**Request Body:**
```json
{
  "sms_enabled": true,
  "critical_alerts": true,
  "overdue_notifications": true,
  "breach_alerts": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "SMS settings updated successfully",
  "preferences": {
    "critical_alerts": true,
    "overdue_notifications": true,
    "breach_alerts": false
  }
}
```

### DELETE /api/v1/settings/sms

Remove phone number and disable SMS notifications.

**Response:**
```json
{
  "success": true,
  "message": "Phone number removed successfully"
}
```

## Support

For issues or questions about SMS integration:
1. Check Twilio Console for delivery logs
2. Review application logs for error messages
3. Verify environment variables are correctly set
4. Contact Twilio support for carrier-related issues
