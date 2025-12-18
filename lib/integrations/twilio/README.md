# Twilio SMS Integration

This directory contains the Twilio client integration for sending SMS notifications.

## Setup

1. Install the Twilio package (already included in package.json):
```bash
npm install twilio
```

2. Set environment variables in `.env.local`:
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Usage

### Basic SMS Sending

```typescript
import { twilioClient } from '@/lib/integrations/twilio/twilio-client';

// Check if Twilio is configured
if (twilioClient.isConfigured()) {
  // Send an SMS
  const result = await twilioClient.sendSMS(
    '+1234567890',
    'Your compliance deadline is approaching!'
  );

  if (result.success) {
    console.log('SMS sent successfully:', result.messageId);
  } else {
    console.error('Failed to send SMS:', result.error);
  }
}
```

### Phone Verification

```typescript
import { twilioClient } from '@/lib/integrations/twilio/twilio-client';

// Start verification process
const verifyResult = await twilioClient.verifyPhoneNumber('+1234567890');

if (verifyResult.success) {
  console.log('Verification code sent');
  // The code is returned in the result and should be stored in the database
  const code = (verifyResult as any).verificationCode;
}
```

## Important Notes

- Phone numbers must be in E.164 format (e.g., +1234567890)
- If Twilio is not configured, methods will return error responses instead of throwing exceptions
- Always check the `success` field in the result before proceeding
- SMS messages over 160 characters may be split into multiple messages and incur additional charges

## Error Handling

The Twilio client returns structured responses instead of throwing errors:

```typescript
interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

Always check the `success` field:

```typescript
const result = await twilioClient.sendSMS(phoneNumber, message);

if (!result.success) {
  // Handle error
  console.error('SMS failed:', result.error);
  return;
}

// SMS sent successfully
console.log('Message ID:', result.messageId);
```

## Phone Number Format

All phone numbers should be in E.164 format:
- Include country code
- No spaces, dashes, or parentheses
- Start with + sign

Examples:
- US: +14155551234
- UK: +442071234567
- Australia: +61412345678

## Testing

For testing without incurring charges, you can use Twilio test credentials:
- Test Account SID and Auth Token from Twilio Console
- Twilio Test Phone Numbers (magic numbers that don't send real SMS)

See Twilio documentation for more details on testing.
