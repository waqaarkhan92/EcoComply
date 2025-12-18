/**
 * Notification Types
 * Types for the notification system
 */

export type NotificationType =
  | 'deadline_approaching'
  | 'deadline_overdue'
  | 'obligation_completed'
  | 'escalation_triggered'
  | 'document_uploaded'
  | 'evidence_reminder';

export interface Notification {
  id: string;
  notification_type: NotificationType | string;
  channel: string;
  subject: string;
  message: string;
  read_at: string | null;
  created_at: string;
  action_url?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationsListResponse {
  data: Notification[];
  pagination?: {
    limit: number;
    cursor?: string;
    has_more: boolean;
  };
}
