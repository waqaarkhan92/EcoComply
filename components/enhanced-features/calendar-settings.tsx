'use client';

/**
 * Calendar Settings Component
 * Manage iCal feed tokens and subscriptions
 */

import { useState } from 'react';
import {
  Calendar,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Plus,
  ExternalLink,
  Clock,
  Globe,
} from 'lucide-react';
import {
  useCalendarTokens,
  useCreateCalendarToken,
  useRevokeCalendarToken,
  CalendarToken,
} from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CalendarSettingsProps {
  siteId?: string;
}

export function CalendarSettings({ siteId }: CalendarSettingsProps) {
  const { data: tokens, isLoading } = useCalendarTokens();
  const createMutation = useCreateCalendarToken();
  const revokeMutation = useRevokeCalendarToken();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async (tokenType: 'USER' | 'SITE') => {
    try {
      await createMutation.mutateAsync({
        token_type: tokenType,
        site_id: tokenType === 'SITE' ? siteId : undefined,
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create token:', error);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (confirm('Are you sure you want to revoke this calendar feed? Any subscribed calendars will stop updating.')) {
      try {
        await revokeMutation.mutateAsync(tokenId);
      } catch (error) {
        console.error('Failed to revoke token:', error);
      }
    }
  };

  const handleCopy = (token: CalendarToken) => {
    const feedUrl = getFeedUrl(token);
    navigator.clipboard.writeText(feedUrl);
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <CalendarSettingsSkeleton />;
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Calendar Integration</h3>
            <p className="text-sm text-gray-500 mt-1">
              Subscribe to deadline calendars in your favorite app
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Feed
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">How to use calendar feeds</p>
            <p className="text-sm text-blue-700 mt-1">
              Copy the feed URL and add it to your calendar app (Google Calendar, Outlook, Apple Calendar).
              Deadlines will sync automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Token list */}
      <div className="divide-y divide-gray-100">
        {!tokens || tokens.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No calendar feeds created yet</p>
            <Button variant="outline" className="mt-3" onClick={() => setShowCreateModal(true)}>
              Create your first feed
            </Button>
          </div>
        ) : (
          tokens.map((token) => (
            <TokenItem
              key={token.id}
              token={token}
              onCopy={() => handleCopy(token)}
              onRevoke={() => handleRevoke(token.id)}
              isCopied={copiedId === token.id}
              isRevoking={revokeMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Create modal */}
      <CreateTokenModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isCreating={createMutation.isPending}
        hasSiteContext={!!siteId}
      />
    </div>
  );
}

interface TokenItemProps {
  token: CalendarToken;
  onCopy: () => void;
  onRevoke: () => void;
  isCopied: boolean;
  isRevoking: boolean;
}

function TokenItem({ token, onCopy, onRevoke, isCopied, isRevoking }: TokenItemProps) {
  const feedUrl = getFeedUrl(token);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {token.token_type === 'SITE' ? (
              <Globe className="w-5 h-5 text-primary" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {token.token_type === 'SITE' ? 'Site Calendar' : 'My Deadlines'}
              </span>
              <Badge variant="default">
                {token.token_type}
              </Badge>
            </div>

            <div className="mt-2 flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
              <code className="text-xs text-gray-600 truncate max-w-md">
                {feedUrl}
              </code>
              <button
                onClick={onCopy}
                className="text-gray-400 hover:text-primary transition-colors p-1"
                title="Copy URL"
              >
                {isCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <a
                href={feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-primary transition-colors p-1"
                title="Open feed"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {format(new Date(token.created_at), 'MMM d, yyyy')}
              </span>
              {token.last_accessed_at && (
                <span>
                  Last accessed {format(new Date(token.last_accessed_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (type: 'USER' | 'SITE') => void;
  isCreating: boolean;
  hasSiteContext: boolean;
}

function CreateTokenModal({ isOpen, onClose, onCreate, isCreating, hasSiteContext }: CreateTokenModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Calendar Feed">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose the type of calendar feed you want to create:
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onCreate('USER')}
            disabled={isCreating}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-gray-900">My Deadlines</p>
                <p className="text-sm text-gray-500">All deadlines assigned to you across all sites</p>
              </div>
            </div>
          </button>

          {hasSiteContext && (
            <button
              onClick={() => onCreate('SITE')}
              disabled={isCreating}
              className="w-full p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-gray-900">Site Calendar</p>
                  <p className="text-sm text-gray-500">All deadlines for the current site</p>
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function getFeedUrl(token: CalendarToken): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/api/v1/calendar/ical/${token.token}`;
}

function CalendarSettingsSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-3 w-48 mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CalendarSettings;
