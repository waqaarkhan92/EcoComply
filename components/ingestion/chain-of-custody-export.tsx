'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  Clock,
  User,
  Link2,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface ChainOfCustodyEvent {
  id: string;
  timestamp: string;
  eventType:
    | 'UPLOADED'
    | 'HASH_CALCULATED'
    | 'LINKED'
    | 'UNLINKED'
    | 'VERIFIED'
    | 'UNVERIFIED'
    | 'IMMUTABILITY_LOCKED'
    | 'ACCESSED'
    | 'DOWNLOADED'
    | 'METADATA_UPDATED';
  userId?: string;
  userName?: string;
  userEmail?: string;
  ipAddress?: string;
  location?: string;
  details?: string;
  obligationId?: string;
  obligationTitle?: string;
}

export interface ChainOfCustodyData {
  evidenceId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  originalHash: string;
  currentHash: string;
  hashVerified: boolean;
  isImmutable: boolean;
  uploadedAt: string;
  uploadedBy: string;
  events: ChainOfCustodyEvent[];
  linkedObligations: Array<{
    id: string;
    title: string;
    period: string;
    linkedBy: string;
    linkedAt: string;
  }>;
}

interface ChainOfCustodyExportProps {
  data: ChainOfCustodyData;
  onExportPdf: () => Promise<void>;
  className?: string;
}

// =============================================================================
// EVENT TYPE CONFIG
// =============================================================================

const EVENT_TYPE_CONFIG: Record<
  ChainOfCustodyEvent['eventType'],
  { label: string; icon: typeof Upload; color: string }
> = {
  UPLOADED: { label: 'File Uploaded', icon: FileText, color: 'text-primary' },
  HASH_CALCULATED: { label: 'Hash Calculated', icon: Shield, color: 'text-primary' },
  LINKED: { label: 'Linked to Obligation', icon: Link2, color: 'text-success' },
  UNLINKED: { label: 'Unlinked from Obligation', icon: Link2, color: 'text-warning' },
  VERIFIED: { label: 'Verified', icon: CheckCircle, color: 'text-success' },
  UNVERIFIED: { label: 'Verification Removed', icon: AlertCircle, color: 'text-danger' },
  IMMUTABILITY_LOCKED: { label: 'Immutability Locked', icon: Shield, color: 'text-primary' },
  ACCESSED: { label: 'Accessed', icon: User, color: 'text-text-secondary' },
  DOWNLOADED: { label: 'Downloaded', icon: Download, color: 'text-text-secondary' },
  METADATA_UPDATED: { label: 'Metadata Updated', icon: FileText, color: 'text-text-secondary' },
};

// =============================================================================
// CHAIN OF CUSTODY TAB CONTENT
// =============================================================================

export function ChainOfCustodyTab({
  data,
  onExportPdf,
  className,
}: ChainOfCustodyExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportPdf();
    } finally {
      setIsExporting(false);
    }
  };

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export PDF
        </Button>
      </div>

      {/* File Integrity */}
      <div className="rounded-lg border p-4">
        <h4 className="font-medium text-text-primary mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          File Integrity
        </h4>

        <div className="space-y-4">
          {/* Original Hash */}
          <div>
            <p className="text-xs text-text-secondary mb-1">Original Hash (SHA-256):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-xs font-mono text-text-primary break-all">
                {data.originalHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyHash(data.originalHash)}
              >
                {showCopySuccess ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Current Hash */}
          <div>
            <p className="text-xs text-text-secondary mb-1">Current Hash:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 rounded text-xs font-mono text-text-primary break-all">
                {data.currentHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyHash(data.currentHash)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Verification Status */}
          <div className={cn(
            'p-3 rounded-lg flex items-center gap-3',
            data.hashVerified
              ? 'bg-success/10 border border-success/20'
              : 'bg-danger/10 border border-danger/20'
          )}>
            {data.hashVerified ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-success">VERIFIED</p>
                  <p className="text-xs text-text-secondary">
                    File has not been modified since upload
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-danger" />
                <div>
                  <p className="text-sm font-medium text-danger">HASH MISMATCH</p>
                  <p className="text-xs text-text-secondary">
                    File may have been modified - investigate immediately
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Immutability Status */}
          {data.isImmutable && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">IMMUTABILITY LOCKED</p>
                <p className="text-xs text-text-secondary">
                  File cannot be modified or deleted
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custody Timeline */}
      <div className="rounded-lg border p-4">
        <h4 className="font-medium text-text-primary mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Custody Timeline
        </h4>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />

          {/* Events */}
          <div className="space-y-4">
            {data.events.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.eventType];
              const Icon = config.icon;

              return (
                <div key={event.id} className="relative pl-6">
                  {/* Dot */}
                  <div
                    className={cn(
                      'absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 bg-white',
                      config.color.replace('text-', 'border-')
                    )}
                  />

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-tertiary">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className={cn('text-sm font-medium', config.color)}>
                      {config.label}
                    </p>
                    {event.userName && (
                      <p className="text-xs text-text-secondary">
                        By: {event.userName}
                        {event.ipAddress && ` from ${event.ipAddress}`}
                        {event.location && ` (${event.location})`}
                      </p>
                    )}
                    {event.details && (
                      <p className="text-xs text-text-tertiary">{event.details}</p>
                    )}
                    {event.obligationTitle && (
                      <p className="text-xs text-text-secondary">
                        Obligation: {event.obligationTitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Linked Obligations */}
      {data.linkedObligations.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="font-medium text-text-primary mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Linked Obligations ({data.linkedObligations.length})
          </h4>

          <div className="space-y-2">
            {data.linkedObligations.map((obligation) => (
              <div
                key={obligation.id}
                className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {obligation.title}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Period: {obligation.period} • Linked by {obligation.linkedBy}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORT PREVIEW MODAL
// =============================================================================

interface ChainOfCustodyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ChainOfCustodyData;
  onExport: () => Promise<void>;
}

export function ChainOfCustodyExportModal({
  isOpen,
  onClose,
  data,
  onExport,
}: ChainOfCustodyExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Chain of Custody" size="md">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Export a PDF document containing the complete chain of custody record for this evidence file.
        </p>

        {/* Export Contents */}
        <div className="rounded-lg bg-gray-50 p-4 space-y-3">
          <h4 className="text-sm font-medium text-text-primary">Export will include:</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Company logo, site name, export date
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              File summary (name, type, size, upload date)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Hash verification (original and current)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Complete custody timeline ({data.events.length} events)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Linked obligations ({data.linkedObligations.length})
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Digital signature with export timestamp
            </li>
          </ul>
        </div>

        {/* File Info */}
        <div className="p-3 border rounded-lg">
          <p className="text-sm font-medium text-text-primary">{data.fileName}</p>
          <p className="text-xs text-text-secondary">
            {data.fileType} • {formatFileSize(data.fileSize)} • Uploaded{' '}
            {new Date(data.uploadedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =============================================================================
// QUICK EXPORT BUTTON
// =============================================================================

interface ChainOfCustodyExportButtonProps {
  evidenceId: string;
  onExport: (evidenceId: string) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  showLabel?: boolean;
  className?: string;
}

export function ChainOfCustodyExportButton({
  evidenceId,
  onExport,
  size = 'sm',
  variant = 'outline',
  showLabel = true,
  className,
}: ChainOfCustodyExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);
    try {
      await onExport(evidenceId);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isExporting}
      className={className}
    >
      {isExporting ? (
        <Loader2 className={cn('animate-spin', showLabel ? 'h-4 w-4 mr-2' : 'h-4 w-4')} />
      ) : (
        <Shield className={cn(showLabel ? 'h-4 w-4 mr-2' : 'h-4 w-4')} />
      )}
      {showLabel && (isExporting ? 'Exporting...' : 'Chain of Custody')}
    </Button>
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Need to import Upload icon
import { Upload } from 'lucide-react';
