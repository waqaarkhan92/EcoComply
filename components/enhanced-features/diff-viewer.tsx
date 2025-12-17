'use client';

/**
 * Diff Viewer Component
 * Visual comparison of obligation versions
 */

import { useObligationDiff } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitCompare,
  Plus,
  Minus,
  Edit3,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from 'lucide-react';
import { useState, useMemo } from 'react';

interface DiffViewerProps {
  obligationId: string;
  v1?: number;
  v2?: number;
  onVersionChange?: (v1: number, v2: number) => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  field: string;
  oldValue?: string;
  newValue?: string;
}

const diffTypeConfig = {
  added: { icon: Plus, color: 'text-green-600', bg: 'bg-green-50', label: 'Added' },
  removed: { icon: Minus, color: 'text-red-600', bg: 'bg-red-50', label: 'Removed' },
  modified: { icon: Edit3, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Modified' },
  unchanged: { icon: null, color: 'text-gray-600', bg: 'bg-white', label: 'Unchanged' },
};

export function DiffViewer({ obligationId, v1, v2, onVersionChange }: DiffViewerProps) {
  const { data, isLoading, error } = useObligationDiff(obligationId, v1, v2);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const diffLines = useMemo(() => {
    if (!data?.diff) return [];

    const lines: DiffLine[] = [];
    const fields = Object.keys(data.diff);

    for (const field of fields) {
      const change = data.diff[field];

      if (typeof change === 'object' && change !== null) {
        if ('old' in change && 'new' in change) {
          if (change.old === change.new) {
            lines.push({
              type: 'unchanged',
              field,
              oldValue: formatValue(change.old),
              newValue: formatValue(change.new),
            });
          } else if (change.old === null || change.old === undefined) {
            lines.push({
              type: 'added',
              field,
              newValue: formatValue(change.new),
            });
          } else if (change.new === null || change.new === undefined) {
            lines.push({
              type: 'removed',
              field,
              oldValue: formatValue(change.old),
            });
          } else {
            lines.push({
              type: 'modified',
              field,
              oldValue: formatValue(change.old),
              newValue: formatValue(change.new),
            });
          }
        }
      }
    }

    return lines;
  }, [data?.diff]);

  const filteredLines = useMemo(() => {
    if (showUnchanged) return diffLines;
    return diffLines.filter((line) => line.type !== 'unchanged');
  }, [diffLines, showUnchanged]);

  const stats = useMemo(() => {
    return {
      added: diffLines.filter((l) => l.type === 'added').length,
      removed: diffLines.filter((l) => l.type === 'removed').length,
      modified: diffLines.filter((l) => l.type === 'modified').length,
      unchanged: diffLines.filter((l) => l.type === 'unchanged').length,
    };
  }, [diffLines]);

  const toggleField = (field: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  if (isLoading) {
    return <DiffViewerSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
        </div>
        <p className="text-gray-500">Unable to load version comparison</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUnchanged(!showUnchanged)}
          >
            {showUnchanged ? 'Hide Unchanged' : 'Show All'}
          </Button>
        </div>

        {/* Version Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <VersionCard
            label="Previous Version"
            version={data.v1?.version || v1 || 1}
            timestamp={data.v1?.created_at}
            user={data.v1?.changed_by_user?.full_name}
          />
          <VersionCard
            label="Current Version"
            version={data.v2?.version || v2 || 2}
            timestamp={data.v2?.created_at}
            user={data.v2?.changed_by_user?.full_name}
            isCurrent
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <Plus className="w-4 h-4" />
            {stats.added} added
          </span>
          <span className="flex items-center gap-1 text-red-600">
            <Minus className="w-4 h-4" />
            {stats.removed} removed
          </span>
          <span className="flex items-center gap-1 text-yellow-600">
            <Edit3 className="w-4 h-4" />
            {stats.modified} modified
          </span>
          {showUnchanged && (
            <span className="text-gray-500">{stats.unchanged} unchanged</span>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="divide-y divide-gray-100">
        {filteredLines.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No changes between these versions
          </div>
        ) : (
          filteredLines.map((line) => {
            const config = diffTypeConfig[line.type];
            const Icon = config.icon;
            const isExpanded = expandedFields.has(line.field);
            const isLongValue =
              (line.oldValue && line.oldValue.length > 100) ||
              (line.newValue && line.newValue.length > 100);

            return (
              <div
                key={line.field}
                className={`${config.bg} transition-colors`}
              >
                <div
                  className={`px-6 py-3 flex items-start gap-3 ${isLongValue ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => isLongValue && toggleField(line.field)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {Icon && <Icon className={`w-4 h-4 ${config.color}`} />}
                    {!Icon && <div className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {formatFieldName(line.field)}
                      </span>
                      <Badge variant="default" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>

                    {line.type === 'modified' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-2 bg-red-50 rounded text-sm">
                          <span className="text-red-600 text-xs font-medium block mb-1">
                            Old Value
                          </span>
                          <span className={`text-gray-700 ${isLongValue && !isExpanded ? 'line-clamp-2' : ''}`}>
                            {line.oldValue || <em className="text-gray-400">empty</em>}
                          </span>
                        </div>
                        <div className="p-2 bg-green-50 rounded text-sm">
                          <span className="text-green-600 text-xs font-medium block mb-1">
                            New Value
                          </span>
                          <span className={`text-gray-700 ${isLongValue && !isExpanded ? 'line-clamp-2' : ''}`}>
                            {line.newValue || <em className="text-gray-400">empty</em>}
                          </span>
                        </div>
                      </div>
                    )}

                    {line.type === 'added' && (
                      <div className="p-2 bg-green-50 rounded text-sm">
                        <span className={`text-gray-700 ${isLongValue && !isExpanded ? 'line-clamp-2' : ''}`}>
                          {line.newValue}
                        </span>
                      </div>
                    )}

                    {line.type === 'removed' && (
                      <div className="p-2 bg-red-50 rounded text-sm">
                        <span className={`text-gray-700 ${isLongValue && !isExpanded ? 'line-clamp-2' : ''}`}>
                          {line.oldValue}
                        </span>
                      </div>
                    )}

                    {line.type === 'unchanged' && (
                      <div className="text-sm text-gray-600">
                        <span className={isLongValue && !isExpanded ? 'line-clamp-1' : ''}>
                          {line.newValue || line.oldValue || <em className="text-gray-400">empty</em>}
                        </span>
                      </div>
                    )}
                  </div>

                  {isLongValue && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface VersionCardProps {
  label: string;
  version: number;
  timestamp?: string;
  user?: string;
  isCurrent?: boolean;
}

function VersionCard({ label, version, timestamp, user, isCurrent }: VersionCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
        <Badge variant={isCurrent ? 'default' : 'info'}>v{version}</Badge>
      </div>
      {timestamp && (
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
          <Clock className="w-3 h-3" />
          {new Date(timestamp).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
      {user && (
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <User className="w-3 h-3" />
          {user}
        </div>
      )}
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function DiffViewerSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded" />
        ))}
      </div>
    </div>
  );
}

export default DiffViewer;
