/**
 * Audit Service
 * Tracks and retrieves audit logs for all entity changes
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type EntityType = 'obligation' | 'evidence' | 'document' | 'pack' | 'corrective_action' | 'deadline' | 'schedule';
export type AuditAction = 'create' | 'update' | 'delete' | 'status_change';

export interface AuditLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  user_id: string | null;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export interface GetAuditLogsOptions {
  limit?: number;
  cursor?: string;
}

export class AuditService {
  /**
   * Log entity creation
   */
  async logCreate(
    entityType: EntityType,
    entityId: string,
    userId: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'create',
        user_id: userId,
        changes: {},
        metadata: {
          created_data: data,
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log create action:', error);
      // Don't throw - audit logging is non-critical
    }
  }

  /**
   * Log entity update with old/new values
   */
  async logUpdate(
    entityType: EntityType,
    entityId: string,
    userId: string,
    changes: Record<string, { old: any; new: any }>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'update',
        user_id: userId,
        changes,
        metadata: {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log update action:', error);
      // Don't throw - audit logging is non-critical
    }
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: EntityType,
    entityId: string,
    userId: string,
    deletedData?: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'delete',
        user_id: userId,
        changes: {},
        metadata: {
          deleted_data: deletedData || {},
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log delete action:', error);
      // Don't throw - audit logging is non-critical
    }
  }

  /**
   * Log status change
   */
  async logStatusChange(
    entityType: EntityType,
    entityId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'status_change',
        user_id: userId,
        changes: {
          status: { old: oldStatus, new: newStatus },
        },
        metadata: additionalMetadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log status change:', error);
      // Don't throw - audit logging is non-critical
    }
  }

  /**
   * Get audit history for a specific entity with pagination
   */
  async getAuditLogs(
    entityType: EntityType,
    entityId: string,
    options: GetAuditLogsOptions = {}
  ): Promise<{ logs: AuditLog[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 20, cursor } = options;

    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select(
          `
          id,
          entity_type,
          entity_id,
          action,
          user_id,
          changes,
          metadata,
          created_at,
          users:user_id (
            full_name,
            email
          )
        `
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (cursor) {
        // Parse cursor (format: "timestamp:id")
        const [cursorTimestamp, cursorId] = cursor.split(':');
        query = query.lt('created_at', cursorTimestamp);
      }

      // Fetch one extra to check if there are more
      query = query.limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      const hasMore = data && data.length > limit;
      const logs = (hasMore ? data.slice(0, limit) : data || []).map((log: any) => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        user_id: log.user_id,
        changes: log.changes || {},
        metadata: log.metadata || {},
        created_at: log.created_at,
        user: log.users
          ? {
              full_name: log.users.full_name,
              email: log.users.email,
            }
          : undefined,
      }));

      let nextCursor: string | undefined;
      if (hasMore && logs.length > 0) {
        const lastItem = logs[logs.length - 1];
        nextCursor = `${lastItem.created_at}:${lastItem.id}`;
      }

      return {
        logs,
        hasMore,
        nextCursor,
      };
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get user activity across all entities with pagination
   */
  async getUserActivity(
    userId: string,
    options: GetAuditLogsOptions = {}
  ): Promise<{ logs: AuditLog[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 20, cursor } = options;

    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select(
          `
          id,
          entity_type,
          entity_id,
          action,
          user_id,
          changes,
          metadata,
          created_at,
          users:user_id (
            full_name,
            email
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cursor) {
        // Parse cursor (format: "timestamp:id")
        const [cursorTimestamp, cursorId] = cursor.split(':');
        query = query.lt('created_at', cursorTimestamp);
      }

      // Fetch one extra to check if there are more
      query = query.limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch user activity: ${error.message}`);
      }

      const hasMore = data && data.length > limit;
      const logs = (hasMore ? data.slice(0, limit) : data || []).map((log: any) => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        user_id: log.user_id,
        changes: log.changes || {},
        metadata: log.metadata || {},
        created_at: log.created_at,
        user: log.users
          ? {
              full_name: log.users.full_name,
              email: log.users.email,
            }
          : undefined,
      }));

      let nextCursor: string | undefined;
      if (hasMore && logs.length > 0) {
        const lastItem = logs[logs.length - 1];
        nextCursor = `${lastItem.created_at}:${lastItem.id}`;
      }

      return {
        logs,
        hasMore,
        nextCursor,
      };
    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for multiple entities (useful for bulk operations)
   */
  async getBulkAuditLogs(
    entityType: EntityType,
    entityIds: string[],
    options: GetAuditLogsOptions = {}
  ): Promise<{ logs: AuditLog[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 50, cursor } = options;

    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select(
          `
          id,
          entity_type,
          entity_id,
          action,
          user_id,
          changes,
          metadata,
          created_at,
          users:user_id (
            full_name,
            email
          )
        `
        )
        .eq('entity_type', entityType)
        .in('entity_id', entityIds)
        .order('created_at', { ascending: false });

      if (cursor) {
        const [cursorTimestamp, cursorId] = cursor.split(':');
        query = query.lt('created_at', cursorTimestamp);
      }

      query = query.limit(limit + 1);

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch bulk audit logs: ${error.message}`);
      }

      const hasMore = data && data.length > limit;
      const logs = (hasMore ? data.slice(0, limit) : data || []).map((log: any) => ({
        id: log.id,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        user_id: log.user_id,
        changes: log.changes || {},
        metadata: log.metadata || {},
        created_at: log.created_at,
        user: log.users
          ? {
              full_name: log.users.full_name,
              email: log.users.email,
            }
          : undefined,
      }));

      let nextCursor: string | undefined;
      if (hasMore && logs.length > 0) {
        const lastItem = logs[logs.length - 1];
        nextCursor = `${lastItem.created_at}:${lastItem.id}`;
      }

      return {
        logs,
        hasMore,
        nextCursor,
      };
    } catch (error: any) {
      console.error('Error fetching bulk audit logs:', error);
      throw error;
    }
  }
}

export const auditService = new AuditService();
