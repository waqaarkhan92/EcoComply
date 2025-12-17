'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Download,
  Eye,
  Link2,
  CheckCircle2,
  FileText,
  User,
  Clock,
  MapPin,
  Hash,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// =============================================================================
// TYPES
// =============================================================================

type CustodyEventType =
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'VIEW'
  | 'LINK'
  | 'UNLINK'
  | 'VERIFY'
  | 'TRANSFER'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'METADATA_UPDATE';

interface CustodyEvent {
  id: string;
  eventType: CustodyEventType;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
  details?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    reason?: string;
    linkedObligationId?: string;
    linkedObligationTitle?: string;
    previousHash?: string;
    newHash?: string;
  };
  metadata?: Record<string, unknown>;
}

interface ChainOfCustodyTimelineProps {
  /** Evidence ID */
  evidenceId: string;
  /** Evidence title */
  evidenceTitle: string;
  /** Chain of custody events */
  events: CustodyEvent[];
  /** Current integrity hash */
  integrityHash?: string;
  /** Hash verification status */
  isVerified?: boolean;
  /** Show full event details */
  showDetails?: boolean;
  /** Export chain of custody */
  onExport?: () => void;
  /** Additional className */
  className?: string;
}

// =============================================================================
// EVENT CONFIGS
// =============================================================================

const eventConfig: Record<CustodyEventType, {
  label: string;
  icon: typeof Upload;
  color: string;
  bgColor: string;
}> = {
  UPLOAD: {
    label: 'Uploaded',
    icon: Upload,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  DOWNLOAD: {
    label: 'Downloaded',
    icon: Download,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  VIEW: {
    label: 'Viewed',
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  LINK: {
    label: 'Linked',
    icon: Link2,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  UNLINK: {
    label: 'Unlinked',
    icon: Link2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  VERIFY: {
    label: 'Verified',
    icon: Shield,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  TRANSFER: {
    label: 'Transferred',
    icon: ExternalLink,
    color: 'text-info',
    bgColor: 'bg-blue-50',
  },
  ARCHIVE: {
    label: 'Archived',
    icon: FileText,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  RESTORE: {
    label: 'Restored',
    icon: FileText,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  METADATA_UPDATE: {
    label: 'Metadata Updated',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Displays chain of custody timeline for evidence
 *
 * @example
 * <ChainOfCustodyTimeline
 *   evidenceId="123"
 *   evidenceTitle="Stack Test Report"
 *   events={custodyEvents}
 *   integrityHash="abc123..."
 *   isVerified={true}
 *   onExport={() => exportChain()}
 * />
 */
export function ChainOfCustodyTimeline({
  evidenceId,
  evidenceTitle,
  events,
  integrityHash,
  isVerified,
  showDetails = false,
  onExport,
  className,
}: ChainOfCustodyTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const displayedEvents = showAll ? events : events.slice(0, 5);
  const hasMore = events.length > 5;

  return (
    <div className={cn('rounded-lg border bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Chain of Custody
            </h3>
            <p className="text-sm text-text-secondary mt-0.5">{evidenceTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {isVerified !== undefined && (
              <Badge variant={isVerified ? 'success' : 'danger'}>
                {isVerified ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Unverified
                  </>
                )}
              </Badge>
            )}
            {onExport && (
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Integrity Hash */}
        {integrityHash && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono flex items-center gap-2">
            <Hash className="h-4 w-4 text-text-tertiary" />
            <span className="text-text-secondary">SHA-256:</span>
            <span className="truncate">{integrityHash}</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="space-y-4">
          {displayedEvents.map((event, index) => {
            const config = eventConfig[event.eventType];
            const Icon = config.icon;
            const isExpanded = expandedEvents.has(event.id);
            const isFirst = index === 0;
            const isLast = index === displayedEvents.length - 1;

            return (
              <div key={event.id} className="relative flex gap-3">
                {/* Timeline Line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    config.bgColor
                  )}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                  )}
                </div>

                {/* Event Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {config.label}
                        {event.details?.linkedObligationTitle && (
                          <span className="text-text-secondary font-normal">
                            {' '}to "{event.details.linkedObligationTitle}"
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                        <User className="h-3 w-3" />
                        <span>{event.user.name}</span>
                        {event.user.role && (
                          <Badge variant="default" className="text-xs px-1 py-0">
                            {event.user.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                      {(showDetails || event.details) && (
                        <button
                          onClick={() => toggleEvent(event.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-text-tertiary" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-text-tertiary" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && event.details && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.timestamp), 'PPpp')}
                        </span>
                      </div>
                      {event.details.ipAddress && (
                        <div className="flex items-center gap-1 text-text-secondary">
                          <MapPin className="h-3 w-3" />
                          IP: {event.details.ipAddress}
                          {event.details.location && ` (${event.details.location})`}
                        </div>
                      )}
                      {event.details.reason && (
                        <div className="text-text-secondary">
                          Reason: {event.details.reason}
                        </div>
                      )}
                      {event.details.newHash && (
                        <div className="font-mono text-text-tertiary">
                          Hash: {event.details.newHash.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center py-2 text-sm text-primary hover:underline"
          >
            {showAll ? 'Show Less' : `Show ${events.length - 5} More Events`}
          </button>
        )}
      </div>

      {/* Summary Footer */}
      <div className="px-4 py-3 border-t bg-gray-50 text-xs text-text-secondary">
        <div className="flex items-center justify-between">
          <span>{events.length} custody events recorded</span>
          <span>
            First recorded: {format(new Date(events[events.length - 1]?.timestamp || new Date()), 'PP')}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

interface CustodyEventBadgeProps {
  eventType: CustodyEventType;
  timestamp: string;
  userName: string;
  className?: string;
}

/**
 * Compact badge showing a single custody event
 */
export function CustodyEventBadge({
  eventType,
  timestamp,
  userName,
  className,
}: CustodyEventBadgeProps) {
  const config = eventConfig[eventType];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      <span className="text-text-tertiary">by {userName}</span>
    </span>
  );
}

// =============================================================================
// INTEGRITY INDICATOR
// =============================================================================

interface IntegrityIndicatorProps {
  isVerified: boolean;
  lastVerified?: string;
  hash?: string;
  onVerify?: () => void;
  className?: string;
}

/**
 * Shows evidence integrity verification status
 */
export function IntegrityIndicator({
  isVerified,
  lastVerified,
  hash,
  onVerify,
  className,
}: IntegrityIndicatorProps) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      isVerified ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isVerified ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-danger" />
          )}
          <div>
            <p className={cn('text-sm font-medium', isVerified ? 'text-success' : 'text-danger')}>
              {isVerified ? 'Integrity Verified' : 'Verification Failed'}
            </p>
            {lastVerified && (
              <p className="text-xs text-text-secondary">
                Last checked: {formatDistanceToNow(new Date(lastVerified), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        {onVerify && (
          <Button size="sm" variant="outline" onClick={onVerify}>
            <Shield className="h-4 w-4 mr-1.5" />
            Verify
          </Button>
        )}
      </div>
      {hash && (
        <div className="mt-2 p-2 bg-white/50 rounded text-xs font-mono truncate">
          {hash}
        </div>
      )}
    </div>
  );
}
