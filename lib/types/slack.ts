/**
 * Slack Integration Types
 */

export interface SlackIntegration {
  id: string;
  company_id: string;
  team_id: string;
  team_name: string | null;
  access_token: string;
  bot_user_id: string | null;
  default_channel_id: string | null;
  default_channel_name: string | null;
  notification_settings: SlackNotificationSettings;
  created_at: string;
  updated_at: string;
}

export interface SlackNotificationSettings {
  deadline_reminders: boolean;
  overdue_alerts: boolean;
  compliance_alerts: boolean;
  evidence_uploads: boolean;
}

export interface SlackIntegrationStatus {
  connected: boolean;
  team_id?: string;
  team_name?: string;
  default_channel_id?: string;
  default_channel_name?: string;
  notification_settings?: SlackNotificationSettings;
  connected_at?: string;
}

export type SlackNotificationType =
  | 'deadline_reminders'
  | 'overdue_alerts'
  | 'compliance_alerts'
  | 'evidence_uploads';
