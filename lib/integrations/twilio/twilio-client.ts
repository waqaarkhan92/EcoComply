/**
 * Twilio Client
 * Handles SMS messaging and phone verification via Twilio
 */

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.warn('Twilio credentials not configured. SMS functionality will be disabled.');
}

export class TwilioClient {
  private client: twilio.Twilio | null;
  private fromNumber: string;

  constructor() {
    if (accountSid && authToken && phoneNumber) {
      this.client = twilio(accountSid, authToken);
      this.fromNumber = phoneNumber;
    } else {
      this.client = null;
      this.fromNumber = '';
    }
  }

  /**
   * Check if Twilio is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Send an SMS message
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.',
      };
    }

    try {
      // Validate phone number format (basic validation)
      if (!to.match(/^\+?[1-9]\d{1,14}$/)) {
        return {
          success: false,
          error: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890)',
        };
      }

      // Ensure phone number has + prefix for E.164 format
      const formattedTo = to.startsWith('+') ? to : `+${to}`;

      const twilioMessage = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo,
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Start phone verification process
   * Sends a 6-digit verification code via SMS
   */
  async verifyPhoneNumber(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio is not configured',
      };
    }

    try {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Send the verification code via SMS
      const message = `Your EcoComply verification code is: ${verificationCode}. This code will expire in 10 minutes.`;

      const result = await this.sendSMS(phoneNumber, message);

      if (result.success) {
        // Return the verification code so it can be stored in the database
        return {
          ...result,
          success: true,
          verificationCode, // This will be used by the calling function
        } as any;
      }

      return result;
    } catch (error) {
      console.error('Failed to verify phone number:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check verification code
   * Note: The actual verification logic is handled in the database/API layer
   * This method is here for completeness but verification is done by comparing
   * the code stored in the database with the code provided by the user
   */
  async checkVerificationCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    // This is a placeholder method since verification is done in the database
    // The actual verification happens in the API route by comparing the stored code
    return {
      success: true,
    };
  }
}

// Export singleton instance
export const twilioClient = new TwilioClient();
