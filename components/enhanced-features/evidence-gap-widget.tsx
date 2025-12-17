'use client';

/**
 * Evidence Gap Widget
 * Displays evidence gaps summary and alerts in dashboard
 */

import { AlertTriangle, AlertCircle, Info, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEvidenceGaps, useEvidenceGapsSummary, useDismissEvidenceGap, EvidenceGap } from '@/lib/hooks/use-enhanced-features';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface EvidenceGapWidgetProps {
  siteId?: string;
  limit?: number;
  showSummary?: boolean;
}

const severityConfig = {
  CRITICAL: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', badge: 'danger' },
  HIGH: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', badge: 'warning' },
  MEDIUM: { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'default' },
  LOW: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'secondary' },
} as const;

const gapTypeLabels = {
  NO_EVIDENCE: 'Missing Evidence',
  EXPIRED_EVIDENCE: 'Expired Evidence',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
};

export function EvidenceGapWidget({ siteId, limit = 5, showSummary = true }: EvidenceGapWidgetProps) {
  const { data: gaps, isLoading: gapsLoading } = useEvidenceGaps({ siteId });
  const { data: summary, isLoading: summaryLoading } = useEvidenceGapsSummary(siteId);
  const dismissMutation = useDismissEvidenceGap();
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const handleDismiss = async (gapId: string) => {
    setDismissingId(gapId);
    try {
      await dismissMutation.mutateAsync({ gapId });
    } finally {
      setDismissingId(null);
    }
  };

  if (gapsLoading || summaryLoading) {
    return <EvidenceGapWidgetSkeleton />;
  }

  const displayGaps = gaps?.slice(0, limit) || [];
  const hasGaps = displayGaps.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Evidence Gaps</h3>
        <Link href="/dashboard/evidence-gaps" className="text-sm text-primary hover:underline flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {showSummary && summary && summary.total > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.entries(summary.by_severity).map(([severity, count]) => {
            const config = severityConfig[severity as keyof typeof severityConfig];
            return (
              <div key={severity} className={`${config.bg} rounded-lg p-2 text-center`}>
                <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
                <div className="text-xs text-gray-600">{severity}</div>
              </div>
            );
          })}
        </div>
      )}

      {!hasGaps ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-600">No evidence gaps detected</p>
          <p className="text-sm text-gray-500 mt-1">All obligations have required evidence</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayGaps.map((gap) => (
            <EvidenceGapItem
              key={gap.id}
              gap={gap}
              onDismiss={() => handleDismiss(gap.id)}
              isDismissing={dismissingId === gap.id}
            />
          ))}
        </div>
      )}

      {hasGaps && gaps && gaps.length > limit && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <Link href="/dashboard/evidence-gaps">
            <Button variant="outline" size="sm">
              View {gaps.length - limit} more gaps
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function EvidenceGapItem({
  gap,
  onDismiss,
  isDismissing,
}: {
  gap: EvidenceGap;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  const config = severityConfig[gap.severity];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} rounded-lg p-3 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900 truncate">
              {gap.obligation?.title || 'Unknown Obligation'}
            </p>
            <p className="text-sm text-gray-600">
              {gapTypeLabels[gap.gap_type]} &bull; {gap.days_until_deadline} days until deadline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.badge as any}>{gap.severity}</Badge>
            <button
              onClick={onDismiss}
              disabled={isDismissing}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {gap.site?.name && (
          <p className="text-xs text-gray-500 mt-1">{gap.site.name}</p>
        )}
      </div>
    </div>
  );
}

function EvidenceGapWidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default EvidenceGapWidget;
