/**
 * Notification Service
 * Manages in-app notifications for users
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export interface GetNotificationsOptions {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: string;
  read_at?: string;
  created_at: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<Notification> {
    const { userId, type, title, message, entityType, entityId } = params;

    // Get user details to populate required fields in the existing schema
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id, phone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`Failed to get user details: ${userError?.message || 'User not found'}`);
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        company_id: user.company_id,
        recipient_email: user.email,
        recipient_phone: user.phone || null,
        notification_type: type,
        channel: 'IN_APP',
        priority: 'NORMAL',
        subject: title,
        body_text: message,
        body_html: null,
        status: 'SENT',
        entity_type: entityType || null,
        entity_id: entityId || null,
        variables: {},
        metadata: {},
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id, user_id, notification_type, subject, body_text, entity_type, entity_id, read_at, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    return {
      id: data.id,
      user_id: data.user_id,
      type: data.notification_type,
      title: data.subject,
      message: data.body_text,
      entity_type: data.entity_type || undefined,
      entity_id: data.entity_id || undefined,
      read_at: data.read_at || undefined,
      created_at: data.created_at,
    };
  }

  /**
   * Get notifications for a user with pagination
   */
  async getNotifications(
    userId: string,
    options: GetNotificationsOptions = {}
  ): Promise<{ notifications: Notification[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 20, cursor, unreadOnly = false } = options;

    let query = supabaseAdmin
      .from('notifications')
      .select('id, user_id, notification_type, subject, body_text, entity_type, entity_id, read_at, created_at')
      .eq('user_id', userId)
      .eq('channel', 'IN_APP')
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    if (cursor) {
      // Parse cursor (format: "id:timestamp")
      const [cursorId, cursorTimestamp] = cursor.split(':');
      query = query.lt('created_at', cursorTimestamp);
    }

    // Fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    const hasMore = data && data.length > limit;
    const notifications = (hasMore ? data.slice(0, limit) : data || []).map((n) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.notification_type,
      title: n.subject,
      message: n.body_text,
      entity_type: n.entity_type || undefined,
      entity_id: n.entity_id || undefined,
      read_at: n.read_at || undefined,
      created_at: n.created_at,
    }));

    let nextCursor: string | undefined;
    if (hasMore && notifications.length > 0) {
      const lastItem = notifications[notifications.length - 1];
      nextCursor = `${lastItem.id}:${lastItem.created_at}`;
    }

    return {
      notifications,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .is('read_at', null);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('channel', 'IN_APP')
      .is('read_at', null)
      .select('id');

    if (error) {
      throw new Error(`Failed to mark all notifications as read: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get count of unread notifications for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('channel', 'IN_APP')
      .is('read_at', null);

    if (error) {
      throw new Error(`Failed to get unread count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Failed to delete notification: ${error.message}`);
    }
  }
}

export const notificationService = new NotificationService();
