/**
 * SMS Notification Service
 * Sends critical alerts, overdue notifications, and breach alerts via SMS
 */

import { twilioClient } from '@/lib/integrations/twilio/twilio-client';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface SMSNotificationPreferences {
  sms_enabled: boolean;
  critical_alerts: boolean;
  overdue_notifications: boolean;
  breach_alerts: boolean;
}

export interface CriticalAlert {
  title: string;
  severity: string;
  entityType?: string;
  entityName?: string;
}

export interface ObligationOverdue {
  obligationName: string;
  dueDate: string;
  daysOverdue: number;
}

export interface ComplianceBreach {
  breachType: string;
  severity: string;
  description: string;
}

export class SMSNotificationService {
  /**
   * Check if user has SMS notifications enabled and phone verified
   */
  private async canSendSMS(
    userId: string,
    notificationType: 'critical_alerts' | 'overdue_notifications' | 'breach_alerts'
  ): Promise<{ canSend: boolean; phoneNumber?: string; reason?: string }> {
    // Check if Twilio is configured
    if (!twilioClient.isConfigured()) {
      return {
        canSend: false,
        reason: 'SMS service is not configured',
      };
    }

    // Get user's phone and preferences
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('phone, phone_verified, sms_notifications_enabled, notification_preferences')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        canSend: false,
        reason: 'User not found',
      };
    }

    // Check if phone is verified
    if (!user.phone_verified) {
      return {
        canSend: false,
        reason: 'Phone number not verified',
      };
    }

    // Check if SMS notifications are globally enabled
    if (!user.sms_notifications_enabled) {
      return {
        canSend: false,
        reason: 'SMS notifications are disabled',
      };
    }

    // Check if the specific notification type is enabled
    const preferences = user.notification_preferences as any || {};
    if (!preferences[notificationType]) {
      return {
        canSend: false,
        reason: `${notificationType} SMS notifications are disabled`,
      };
    }

    // Check if phone number exists
    if (!user.phone) {
      return {
        canSend: false,
        reason: 'No phone number on file',
      };
    }

    return {
      canSend: true,
      phoneNumber: user.phone,
    };
  }

  /**
   * Send critical alert via SMS
   * Template: "CRITICAL: [title] - [severity]. [entityType]: [entityName]"
   * Max 160 characters when possible
   */
  async sendCriticalAlert(
    userId: string,
    alert: CriticalAlert
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const check = await this.canSendSMS(userId, 'critical_alerts');
    if (!check.canSend) {
      return {
        success: false,
        error: check.reason,
      };
    }

    // Build message (keep under 160 chars)
    let message = `CRITICAL: ${alert.title}`;

    if (alert.severity) {
      message += ` - ${alert.severity}`;
    }

    if (alert.entityType && alert.entityName) {
      const remaining = 160 - message.length - 3; // 3 for ". " and space
      const entityInfo = `${alert.entityType}: ${alert.entityName}`;
      if (entityInfo.length <= remaining) {
        message += `. ${entityInfo}`;
      }
    }

    // Ensure we don't exceed 160 characters
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    const result = await twilioClient.sendSMS(check.phoneNumber!, message);

    // Log the notification
    if (result.success) {
      await this.logSMSNotification(userId, 'critical_alert', message, result.messageId);
    }

    return result;
  }

  /**
   * Send overdue deadline notification via SMS
   * Template: "OVERDUE: [obligationName] was due [dueDate]. Now [daysOverdue] days overdue."
   */
  async sendOverdueNotification(
    userId: string,
    obligation: ObligationOverdue
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const check = await this.canSendSMS(userId, 'overdue_notifications');
    if (!check.canSend) {
      return {
        success: false,
        error: check.reason,
      };
    }

    // Build message
    const obligationName = obligation.obligationName.length > 50
      ? obligation.obligationName.substring(0, 47) + '...'
      : obligation.obligationName;

    let message = `OVERDUE: ${obligationName} was due ${obligation.dueDate}. Now ${obligation.daysOverdue} day${obligation.daysOverdue > 1 ? 's' : ''} overdue.`;

    // Ensure we don't exceed 160 characters
    if (message.length > 160) {
      message = `OVERDUE: ${obligationName}. ${obligation.daysOverdue} day${obligation.daysOverdue > 1 ? 's' : ''} past due date.`;
    }

    const result = await twilioClient.sendSMS(check.phoneNumber!, message);

    // Log the notification
    if (result.success) {
      await this.logSMSNotification(userId, 'overdue_notification', message, result.messageId);
    }

    return result;
  }

  /**
   * Send compliance breach alert via SMS
   * Template: "BREACH ALERT: [breachType] - [severity]. [description]"
   */
  async sendBreachAlert(
    userId: string,
    breach: ComplianceBreach
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const check = await this.canSendSMS(userId, 'breach_alerts');
    if (!check.canSend) {
      return {
        success: false,
        error: check.reason,
      };
    }

    // Build message
    let message = `BREACH ALERT: ${breach.breachType} - ${breach.severity}`;

    // Add description if it fits
    const remaining = 160 - message.length - 2; // 2 for ". "
    if (breach.description && breach.description.length <= remaining) {
      message += `. ${breach.description}`;
    } else if (breach.description) {
      const truncatedDesc = breach.description.substring(0, remaining - 3) + '...';
      message += `. ${truncatedDesc}`;
    }

    // Ensure we don't exceed 160 characters
    if (message.length > 160) {
      message = message.substring(0, 157) + '...';
    }

    const result = await twilioClient.sendSMS(check.phoneNumber!, message);

    // Log the notification
    if (result.success) {
      await this.logSMSNotification(userId, 'breach_alert', message, result.messageId);
    }

    return result;
  }

  /**
   * Send verification code SMS
   * This is called during phone verification process
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!twilioClient.isConfigured()) {
      return {
        success: false,
        error: 'SMS service is not configured',
      };
    }

    const message = `Your EcoComply verification code is: ${code}. This code will expire in 10 minutes.`;
    return await twilioClient.sendSMS(phoneNumber, message);
  }

  /**
   * Log SMS notification to database
   */
  private async logSMSNotification(
    userId: string,
    type: string,
    message: string,
    messageId?: string
  ): Promise<void> {
    try {
      // Get user details
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('company_id, email, phone')
        .eq('id', userId)
        .single();

      if (!user) return;

      // Log to notifications table
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        company_id: user.company_id,
        recipient_email: user.email,
        recipient_phone: user.phone,
        notification_type: type,
        channel: 'SMS',
        priority: 'HIGH',
        subject: type.replace(/_/g, ' ').toUpperCase(),
        body_text: message,
        body_html: null,
        status: 'SENT',
        variables: {},
        metadata: {
          twilio_message_id: messageId,
        },
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log SMS notification:', error);
      // Don't throw error - logging failure shouldn't prevent SMS from being sent
    }
  }

  /**
   * Get SMS notification preferences for a user
   */
  async getSMSPreferences(userId: string): Promise<SMSNotificationPreferences | null> {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('sms_notifications_enabled, notification_preferences')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    const preferences = user.notification_preferences as any || {};

    return {
      sms_enabled: user.sms_notifications_enabled || false,
      critical_alerts: preferences.critical_alerts || false,
      overdue_notifications: preferences.overdue_notifications || false,
      breach_alerts: preferences.breach_alerts || false,
    };
  }

  /**
   * Update SMS notification preferences for a user
   */
  async updateSMSPreferences(
    userId: string,
    preferences: Partial<SMSNotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current preferences
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('notification_preferences, sms_notifications_enabled')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const currentPrefs = user.notification_preferences as any || {};

      // Update preferences
      const updatedPrefs = {
        ...currentPrefs,
        critical_alerts: preferences.critical_alerts ?? currentPrefs.critical_alerts ?? false,
        overdue_notifications: preferences.overdue_notifications ?? currentPrefs.overdue_notifications ?? false,
        breach_alerts: preferences.breach_alerts ?? currentPrefs.breach_alerts ?? false,
      };

      // Update in database
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          notification_preferences: updatedPrefs,
          sms_notifications_enabled: preferences.sms_enabled ?? user.sms_notifications_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

export const smsNotificationService = new SMSNotificationService();
