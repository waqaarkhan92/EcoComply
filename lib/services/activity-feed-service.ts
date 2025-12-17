/**
 * Activity Feed Service
 * Records and retrieves user activities across the platform
 * Reference: docs/specs/90_Enhanced_Features_V2.md Section 6
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type ActivityType =
  | 'document_uploaded'
  | 'document_processed'
  | 'obligation_created'
  | 'obligation_updated'
  | 'obligation_completed'
  | 'obligation_overdue'
  | 'evidence_uploaded'
  | 'evidence_linked'
  | 'evidence_unlinked'
  | 'deadline_completed'
  | 'deadline_missed'
  | 'pack_generated'
  | 'pack_shared'
  | 'review_submitted'
  | 'review_approved'
  | 'review_rejected'
  | 'comment_added'
  | 'user_assigned'
  | 'status_changed'
  | 'schedule_created'
  | 'schedule_updated';

export interface ActivityEntry {
  company_id: string;
  site_id?: string;
  user_id: string;
  activity_type: ActivityType;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  summary: string;
  metadata?: Record<string, any>;
}

export class ActivityFeedService {
  /**
   * Record a new activity
   */
  async recordActivity(activity: ActivityEntry): Promise<void> {
    const { error } = await supabaseAdmin.from('activity_feed').insert({
      company_id: activity.company_id,
      site_id: activity.site_id,
      user_id: activity.user_id,
      activity_type: activity.activity_type,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      entity_title: activity.entity_title,
      summary: activity.summary,
      metadata: activity.metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to record activity:', error);
      // Don't throw - activity recording is non-critical
    }
  }

  /**
   * Get recent activities for a company
   */
  async getCompanyActivities(
    companyId: string,
    options: {
      siteId?: string;
      userId?: string;
      activityTypes?: ActivityType[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ activities: any[]; total: number }> {
    const { siteId, userId, activityTypes, limit = 50, offset = 0 } = options;

    let query = supabaseAdmin
      .from('activity_feed')
      .select(
        `
        id,
        site_id,
        user_id,
        activity_type,
        entity_type,
        entity_id,
        entity_title,
        summary,
        metadata,
        created_at,
        users!inner(full_name, email)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (activityTypes && activityTypes.length > 0) {
      query = query.in('activity_type', activityTypes);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`);
    }

    return {
      activities: data || [],
      total: count || 0,
    };
  }

  /**
   * Get activities for a specific entity (e.g., obligation timeline)
   */
  async getEntityActivities(
    entityType: string,
    entityId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ activities: any[]; total: number }> {
    const { limit = 100, offset = 0 } = options;

    const { data, error, count } = await supabaseAdmin
      .from('activity_feed')
      .select(
        `
        id,
        user_id,
        activity_type,
        summary,
        metadata,
        created_at,
        users!inner(full_name, email)
      `,
        { count: 'exact' }
      )
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch entity activities: ${error.message}`);
    }

    return {
      activities: data || [],
      total: count || 0,
    };
  }

  // Helper methods for common activities

  async recordDocumentUpload(
    companyId: string,
    siteId: string | undefined,
    userId: string,
    documentId: string,
    documentTitle: string
  ): Promise<void> {
    await this.recordActivity({
      company_id: companyId,
      site_id: siteId,
      user_id: userId,
      activity_type: 'document_uploaded',
      entity_type: 'document',
      entity_id: documentId,
      entity_title: documentTitle,
      summary: `Uploaded document "${documentTitle}"`,
    });
  }

  async recordObligationCompleted(
    companyId: string,
    siteId: string,
    userId: string,
    obligationId: string,
    obligationTitle: string
  ): Promise<void> {
    await this.recordActivity({
      company_id: companyId,
      site_id: siteId,
      user_id: userId,
      activity_type: 'obligation_completed',
      entity_type: 'obligation',
      entity_id: obligationId,
      entity_title: obligationTitle,
      summary: `Completed obligation "${obligationTitle}"`,
    });
  }

  async recordEvidenceLinked(
    companyId: string,
    siteId: string,
    userId: string,
    obligationId: string,
    obligationTitle: string,
    evidenceFileName: string
  ): Promise<void> {
    await this.recordActivity({
      company_id: companyId,
      site_id: siteId,
      user_id: userId,
      activity_type: 'evidence_linked',
      entity_type: 'obligation',
      entity_id: obligationId,
      entity_title: obligationTitle,
      summary: `Linked evidence "${evidenceFileName}" to "${obligationTitle}"`,
      metadata: { evidence_file_name: evidenceFileName },
    });
  }

  async recordPackGenerated(
    companyId: string,
    siteId: string | undefined,
    userId: string,
    packId: string,
    packType: string
  ): Promise<void> {
    await this.recordActivity({
      company_id: companyId,
      site_id: siteId,
      user_id: userId,
      activity_type: 'pack_generated',
      entity_type: 'pack',
      entity_id: packId,
      entity_title: `${packType} Pack`,
      summary: `Generated ${packType} pack`,
      metadata: { pack_type: packType },
    });
  }

  async recordStatusChange(
    companyId: string,
    siteId: string,
    userId: string,
    entityType: string,
    entityId: string,
    entityTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.recordActivity({
      company_id: companyId,
      site_id: siteId,
      user_id: userId,
      activity_type: 'status_changed',
      entity_type: entityType,
      entity_id: entityId,
      entity_title: entityTitle,
      summary: `Changed status from "${oldStatus}" to "${newStatus}"`,
      metadata: { old_status: oldStatus, new_status: newStatus },
    });
  }
}

export const activityFeedService = new ActivityFeedService();
