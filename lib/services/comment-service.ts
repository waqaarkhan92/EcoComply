/**
 * Comment Service
 * Manages comments and threaded discussions on obligations, evidence, documents, and packs
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface CreateCommentParams {
  entityType: 'obligation' | 'evidence' | 'document' | 'pack';
  entityId: string;
  userId: string;
  content: string;
  mentions?: string[];
  parentId?: string;
}

export interface UpdateCommentParams {
  content: string;
}

export interface GetCommentsOptions {
  limit?: number;
  cursor?: string;
}

export interface Comment {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  content: string;
  mentions?: string[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(params: CreateCommentParams): Promise<Comment> {
    const { entityType, entityId, userId, content, mentions, parentId } = params;

    // Validate entity_type
    const validEntityTypes = ['obligation', 'evidence', 'document', 'pack'];
    if (!validEntityTypes.includes(entityType)) {
      throw new Error(`Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    // If parent_id is provided, validate it exists
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabaseAdmin
        .from('comments')
        .select('id, entity_type, entity_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentComment) {
        throw new Error('Parent comment not found');
      }

      // Ensure reply is on the same entity
      if (parentComment.entity_type !== entityType || parentComment.entity_id !== entityId) {
        throw new Error('Reply must be on the same entity as parent comment');
      }
    }

    // Create the comment
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        user_id: userId,
        content: content.trim(),
        mentions: mentions || [],
        parent_id: parentId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        id,
        entity_type,
        entity_id,
        user_id,
        content,
        mentions,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    return this.mapCommentFromDb(data);
  }

  /**
   * Get comments for an entity with pagination
   */
  async getComments(
    entityType: string,
    entityId: string,
    options: GetCommentsOptions = {}
  ): Promise<{ comments: Comment[]; hasMore: boolean; nextCursor?: string }> {
    const { limit = 20, cursor } = options;

    // Validate entity_type
    const validEntityTypes = ['obligation', 'evidence', 'document', 'pack'];
    if (!validEntityTypes.includes(entityType)) {
      throw new Error(`Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`);
    }

    let query = supabaseAdmin
      .from('comments')
      .select(`
        id,
        entity_type,
        entity_id,
        user_id,
        content,
        mentions,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (cursor) {
      // Parse cursor (format: "timestamp")
      query = query.lt('created_at', cursor);
    }

    // Fetch one extra to check if there are more
    query = query.limit(limit + 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    const hasMore = data && data.length > limit;
    const comments = (hasMore ? data.slice(0, limit) : data || []).map((c) =>
      this.mapCommentFromDb(c)
    );

    let nextCursor: string | undefined;
    if (hasMore && comments.length > 0) {
      const lastItem = comments[comments.length - 1];
      nextCursor = lastItem.created_at;
    }

    return {
      comments,
      hasMore,
      nextCursor,
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, params: UpdateCommentParams): Promise<Comment> {
    const { content } = params;

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content cannot be empty');
    }

    const { data, error } = await supabaseAdmin
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        id,
        entity_type,
        entity_id,
        user_id,
        content,
        mentions,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`);
    }

    if (!data) {
      throw new Error('Comment not found');
    }

    return this.mapCommentFromDb(data);
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('comments').delete().eq('id', commentId);

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  }

  /**
   * Get comment count for an entity
   */
  async getCommentCount(entityType: string, entityId: string): Promise<number> {
    // Validate entity_type
    const validEntityTypes = ['obligation', 'evidence', 'document', 'pack'];
    if (!validEntityTypes.includes(entityType)) {
      throw new Error(`Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}`);
    }

    const { count, error } = await supabaseAdmin
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) {
      throw new Error(`Failed to get comment count: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get a single comment by ID
   */
  async getComment(commentId: string): Promise<Comment | null> {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .select(`
        id,
        entity_type,
        entity_id,
        user_id,
        content,
        mentions,
        parent_id,
        created_at,
        updated_at,
        user:users!user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', commentId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapCommentFromDb(data);
  }

  /**
   * Map comment data from database to Comment interface
   */
  private mapCommentFromDb(data: any): Comment {
    return {
      id: data.id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      user_id: data.user_id,
      content: data.content,
      mentions: data.mentions || undefined,
      parent_id: data.parent_id || undefined,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user: Array.isArray(data.user)
        ? data.user[0]
          ? {
              id: data.user[0].id,
              full_name: data.user[0].full_name,
              email: data.user[0].email,
              avatar_url: data.user[0].avatar_url || undefined,
            }
          : undefined
        : data.user
          ? {
              id: data.user.id,
              full_name: data.user.full_name,
              email: data.user.email,
              avatar_url: data.user.avatar_url || undefined,
            }
          : undefined,
    };
  }
}

export const commentService = new CommentService();
