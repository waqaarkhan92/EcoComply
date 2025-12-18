'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, User, FileEdit, Plus, Trash, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  changes: Record<string, { old: any; new: any }>;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export interface AuditLogPanelProps {
  entityType: string;
  entityId: string;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Audit Log Panel Component
 * Displays a timeline of changes made to an entity
 */
export function AuditLogPanel({
  entityType,
  entityId,
  className,
  defaultExpanded = false,
}: AuditLogPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Fetch audit logs
  const fetchLogs = async (cursor?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        limit: '20',
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`/api/v1/audit-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();

      if (cursor) {
        // Append to existing logs (load more)
        setLogs((prev) => [...prev, ...result.data]);
      } else {
        // Replace logs (initial load)
        setLogs(result.data);
      }

      setHasMore(result.pagination.has_more);
      setNextCursor(result.pagination.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load logs when panel is expanded
  useEffect(() => {
    if (isExpanded && logs.length === 0 && !loading) {
      fetchLogs();
    }
  }, [isExpanded]);

  // Get icon for action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <FileEdit className="h-4 w-4" />;
      case 'delete':
        return <Trash className="h-4 w-4" />;
      case 'status_change':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get badge variant for action type
  const getActionVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'info';
      case 'delete':
        return 'danger';
      case 'status_change':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format action description
  const getActionDescription = (log: AuditLog): string => {
    const action = log.action;
    const userName = log.user?.full_name || 'Unknown user';

    switch (action) {
      case 'create':
        return `${userName} created this ${log.entity_type}`;
      case 'update':
        return `${userName} updated this ${log.entity_type}`;
      case 'delete':
        return `${userName} deleted this ${log.entity_type}`;
      case 'status_change':
        const oldStatus = log.changes.status?.old;
        const newStatus = log.changes.status?.new;
        return `${userName} changed status from "${oldStatus}" to "${newStatus}"`;
      default:
        return `${userName} modified this ${log.entity_type}`;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Render field changes
  const renderChanges = (changes: Record<string, { old: any; new: any }>) => {
    const entries = Object.entries(changes);

    if (entries.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-1.5">
        {entries.map(([field, change]) => {
          // Skip status changes as they're shown in the description
          if (field === 'status') {
            return null;
          }

          // Format field name (convert snake_case to Title Case)
          const fieldName = field
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Format values
          const formatValue = (value: any): string => {
            if (value === null || value === undefined) {
              return 'None';
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          };

          return (
            <div key={field} className="text-sm">
              <span className="font-medium text-text-secondary">{fieldName}:</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-xs line-through">
                  {formatValue(change.old)}
                </span>
                <span className="text-text-tertiary">→</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                  {formatValue(change.new)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('border border-border rounded-lg bg-background-primary', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-text-secondary" />
          <h3 className="text-base font-semibold text-text-primary">Audit History</h3>
          {logs.length > 0 && (
            <Badge variant="default" size="sm">
              {logs.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-text-secondary" />
        ) : (
          <ChevronDown className="h-5 w-5 text-text-secondary" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Loading state */}
          {loading && logs.length === 0 && (
            <div className="py-8 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-sm text-text-tertiary">Loading audit logs...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="py-4">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchLogs()}
                  className="mt-2"
                >
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* Logs timeline */}
          {!loading && !error && logs.length > 0 && (
            <div className="py-4">
              <div className="space-y-4 relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-border" />

                {logs.map((log, index) => (
                  <div key={log.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center border-2 border-background-primary z-10',
                        {
                          'bg-green-100 text-green-600': log.action === 'create',
                          'bg-blue-100 text-blue-600': log.action === 'update',
                          'bg-red-100 text-red-600': log.action === 'delete',
                          'bg-orange-100 text-orange-600': log.action === 'status_change',
                        }
                      )}
                    >
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary font-medium">
                            {getActionDescription(log)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getActionVariant(log.action)} size="sm">
                              {log.action.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-text-tertiary">
                              {formatTimestamp(log.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Changes */}
                      {log.action === 'update' && renderChanges(log.changes)}

                      {/* User info */}
                      {log.user && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-text-tertiary">
                          <User className="h-3 w-3" />
                          <span>{log.user.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchLogs(nextCursor || undefined)}
                    loading={loading}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && logs.length === 0 && (
            <div className="py-8 text-center">
              <Clock className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-tertiary">No audit logs yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
