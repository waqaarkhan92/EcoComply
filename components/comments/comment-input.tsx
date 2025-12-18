'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommentUser } from '@/lib/types/comments';
import { apiClient } from '@/lib/api/client';

interface CommentInputProps {
  entityType: 'obligation' | 'evidence' | 'document' | 'pack';
  entityId: string;
  parentId?: string;
  replyingTo?: string;
  onSubmit: (content: string, mentions: string[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

interface MentionSuggestion extends CommentUser {
  position: number;
}

export function CommentInput({
  entityType,
  entityId,
  parentId,
  replyingTo,
  onSubmit,
  onCancel,
  placeholder = 'Write a comment...',
  autoFocus = false,
  className,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [users, setUsers] = useState<CommentUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CommentUser[]>([]);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiClient.get<CommentUser[]>('/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter((user) =>
        user.full_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedMentionIndex(0);
    } else {
      setFilteredUsers(users);
    }
  }, [mentionQuery, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;

    setContent(value);

    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionPosition(lastAtIndex);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: CommentUser) => {
    const before = content.substring(0, mentionPosition);
    const after = content.substring(textareaRef.current?.selectionStart || content.length);
    const mentionText = `@${user.full_name}`;
    const newContent = `${before}${mentionText} ${after}`;

    setContent(newContent);
    setShowMentions(false);
    setMentionQuery('');

    if (!mentions.includes(user.id)) {
      setMentions([...mentions, user.id]);
    }

    if (textareaRef.current) {
      const newCursorPosition = before.length + mentionText.length + 1;
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;

    onSubmit(content, mentions);
    setContent('');
    setMentions([]);
  };

  const handleCancel = () => {
    setContent('');
    setMentions([]);
    if (onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    if (showMentions && mentionListRef.current && filteredUsers.length > 0) {
      const selectedElement = mentionListRef.current.children[selectedMentionIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedMentionIndex, showMentions, filteredUsers]);

  return (
    <div className={cn('relative', className)}>
      {replyingTo && (
        <div className="mb-2 text-sm text-text-secondary flex items-center gap-2">
          Replying to <span className="font-medium text-text-primary">{replyingTo}</span>
        </div>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 border border-input-border rounded-lg text-sm',
            'placeholder:text-text-tertiary',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all resize-none',
            'min-h-[100px]'
          )}
          rows={3}
        />

        {/* @Mention Dropdown */}
        {showMentions && !isLoadingUsers && filteredUsers.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute z-50 w-64 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto"
            style={{
              bottom: '100%',
              left: 0,
              marginBottom: '0.5rem',
            }}
          >
            {filteredUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className={cn(
                  'w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-background-secondary transition-colors',
                  index === selectedMentionIndex && 'bg-primary/10'
                )}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                    {user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .substring(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {user.full_name}
                  </div>
                  {user.email && (
                    <div className="text-xs text-text-tertiary truncate">
                      {user.email}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {showMentions && isLoadingUsers && (
          <div className="absolute z-50 w-64 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-sm text-text-secondary text-center">
            Loading users...
          </div>
        )}

        {showMentions && !isLoadingUsers && filteredUsers.length === 0 && (
          <div className="absolute z-50 w-64 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-sm text-text-secondary text-center">
            No users found
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-text-tertiary">
          Tip: Use @ to mention someone, Cmd/Ctrl+Enter to submit
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              icon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim()}
            icon={<Send className="w-4 h-4" />}
          >
            {parentId ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
