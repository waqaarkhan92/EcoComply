/**
 * Type definitions for SMS notification system
 */

export interface PhoneVerification {
  id: string;
  user_id: string;
  phone_number: string;
  verification_code: string;
  expires_at: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SMSNotificationPreferences {
  sms_enabled: boolean;
  critical_alerts: boolean;
  overdue_notifications: boolean;
  breach_alerts: boolean;
}

export interface SMSSettings {
  phone_number: string | null;
  phone_verified: boolean;
  sms_enabled: boolean;
  preferences: SMSNotificationPreferences;
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

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface VerificationResult {
  success: boolean;
  expires_at?: string;
  phone_number?: string;
  error?: string;
}

export type NotificationType = 'critical_alerts' | 'overdue_notifications' | 'breach_alerts';
