'use client';

import { useState } from 'react';
import { Comment } from '@/lib/types/comments';
import { Button } from '@/components/ui/button';
import { MessageCircle, Trash2, Edit3, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onReply: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  depth?: number;
  className?: string;
}

export function CommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  depth = 0,
  className,
}: CommentItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const highlightMentions = (text: string) => {
    if (!comment.mentions || comment.mentions.length === 0) {
      return text;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span key={match.index} className="text-primary font-medium bg-primary/10 px-1 rounded">
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className={cn('group', className)}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user?.full_name || 'User'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {getInitials(comment.user?.full_name || 'Unknown')}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-background-secondary rounded-lg p-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <span className="font-semibold text-text-primary text-sm">
                  {comment.user?.full_name || 'Unknown User'}
                </span>
                <span className="text-text-tertiary text-xs ml-2">
                  {formatTimestamp(comment.created_at)}
                </span>
              </div>

              {/* Actions Menu */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="p-1 hover:bg-background-tertiary rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Comment actions"
                  >
                    <MoreVertical className="w-4 h-4 text-text-secondary" />
                  </button>

                  {showActions && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActions(false)}
                      />
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-background-secondary flex items-center gap-2"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowActions(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-input-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-text-primary text-sm whitespace-pre-wrap break-words">
                {highlightMentions(comment.content)}
              </p>
            )}
          </div>

          {/* Reply Button */}
          {!isEditing && depth < 3 && (
            <button
              onClick={() => onReply(comment.id)}
              className="mt-1 text-xs text-text-secondary hover:text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-background-secondary transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              Reply
            </button>
          )}

          {/* Nested Replies */}
          {hasReplies && (
            <div className="mt-3 space-y-3">
              {depth < 3 ? (
                <>
                  {comment.replies!.slice(0, showReplies ? undefined : 2).map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      onReply={onReply}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      depth={depth + 1}
                    />
                  ))}
                  {comment.replies!.length > 2 && !showReplies && (
                    <button
                      onClick={() => setShowReplies(true)}
                      className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 pl-13"
                    >
                      View {comment.replies!.length - 2} more {comment.replies!.length - 2 === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-text-tertiary pl-2 border-l-2 border-gray-200">
                  {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'} (nested too deep)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
