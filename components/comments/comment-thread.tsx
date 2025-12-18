'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Comment } from '@/lib/types/comments';
import { CommentItem } from './comment-item';
import { CommentInput } from './comment-input';
import { Skeleton } from '@/components/ui/enhanced/skeleton';
import { MessageSquare, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentThreadProps {
  entityType: 'obligation' | 'evidence' | 'document' | 'pack';
  entityId: string;
  currentUserId?: string;
  className?: string;
}

export function CommentThread({
  entityType,
  entityId,
  currentUserId,
  className,
}: CommentThreadProps) {
  const queryClient = useQueryClient();
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Comment[]>(
          `/comments?entity_type=${entityType}&entity_id=${entityId}`
        );
        return (response.data || []) as Comment[];
      } catch (error: any) {
        if (error.status === 404) {
          return [];
        }
        throw error;
      }
    },
    retry: false,
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({
      content,
      mentions,
      parentId,
    }: {
      content: string;
      mentions: string[];
      parentId?: string;
    }) => {
      return apiClient.post('/comments', {
        entity_type: entityType,
        entity_id: entityId,
        content,
        mentions,
        parent_id: parentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', entityType, entityId],
      });
      setReplyingToId(null);
      setReplyingToName(null);
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiClient.delete(`/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', entityType, entityId],
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      return apiClient.patch(`/comments/${commentId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['comments', entityType, entityId],
      });
    },
  });

  const handleSubmitComment = (content: string, mentions: string[]) => {
    createCommentMutation.mutate({
      content,
      mentions,
      parentId: replyingToId || undefined,
    });
  };

  const handleReply = (commentId: string) => {
    const comment = findCommentById(comments || [], commentId);
    setReplyingToId(commentId);
    setReplyingToName(comment?.user?.full_name || null);
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyingToName(null);
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const handleEditComment = (commentId: string, content: string) => {
    updateCommentMutation.mutate({ commentId, content });
  };

  const findCommentById = (comments: Comment[], id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findCommentById(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(commentWithReplies);
        } else {
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const organizedComments = comments ? organizeComments(comments) : [];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
          {comments && comments.length > 0 && (
            <span className="text-sm font-normal text-text-secondary">
              ({comments.length})
            </span>
          )}
        </h3>
      </div>

      {/* Comment Input */}
      {!replyingToId && (
        <CommentInput
          entityType={entityType}
          entityId={entityId}
          onSubmit={handleSubmitComment}
          placeholder="Write a comment..."
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!comments || comments.length === 0) && (
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-gray-200">
          <MessageCircle className="w-12 h-12 mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary font-medium mb-1">No comments yet</p>
          <p className="text-text-tertiary text-sm">
            Be the first to share your thoughts
          </p>
        </div>
      )}

      {/* Comments List */}
      {!isLoading && organizedComments.length > 0 && (
        <div className="space-y-4">
          {organizedComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={handleReply}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
              />
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {replyingToId && (
        <div className="border-l-4 border-primary pl-4">
          <CommentInput
            entityType={entityType}
            entityId={entityId}
            parentId={replyingToId}
            replyingTo={replyingToName || undefined}
            onSubmit={handleSubmitComment}
            onCancel={handleCancelReply}
            placeholder="Write a reply..."
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
