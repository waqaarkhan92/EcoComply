'use client';

import { ReactNode } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  FileText,
  FolderOpen,
  Package,
  ClipboardList,
  Search,
  Users,
  Building2,
  AlertCircle,
} from 'lucide-react';

// Pre-built illustration variants
export type EmptyStateVariant =
  | 'documents'
  | 'evidence'
  | 'packs'
  | 'obligations'
  | 'search'
  | 'users'
  | 'sites'
  | 'error'
  | 'deadlines'
  | 'success'
  | 'custom';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: EmptyStateVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

import { Clock, CheckCircle2 } from 'lucide-react';

const variantIcons: Record<Exclude<EmptyStateVariant, 'custom'>, typeof FileText> = {
  documents: FileText,
  evidence: FolderOpen,
  packs: Package,
  obligations: ClipboardList,
  search: Search,
  users: Users,
  sites: Building2,
  error: AlertCircle,
  deadlines: Clock,
  success: CheckCircle2,
};

const variantColors: Record<Exclude<EmptyStateVariant, 'custom'>, string> = {
  documents: 'bg-blue-50 text-blue-500',
  evidence: 'bg-amber-50 text-amber-500',
  packs: 'bg-purple-50 text-purple-500',
  obligations: 'bg-green-50 text-green-500',
  search: 'bg-slate-50 text-slate-500',
  users: 'bg-cyan-50 text-cyan-500',
  sites: 'bg-emerald-50 text-emerald-500',
  error: 'bg-red-50 text-red-500',
  deadlines: 'bg-orange-50 text-orange-500',
  success: 'bg-green-50 text-green-500',
};

const sizeStyles = {
  sm: {
    container: 'py-8',
    icon: 'h-10 w-10',
    iconWrapper: 'h-16 w-16',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    iconWrapper: 'h-20 w-20',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    iconWrapper: 'h-28 w-28',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'custom',
  size = 'md',
  className,
}: EmptyStateProps) {
  const styles = sizeStyles[size];
  const VariantIcon = variant !== 'custom' ? variantIcons[variant] : null;
  const variantColor = variant !== 'custom' ? variantColors[variant] : 'bg-gray-50 text-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      {(icon || VariantIcon) && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
          className={cn(
            'rounded-full flex items-center justify-center mb-6',
            styles.iconWrapper,
            variant !== 'custom' && variantColor
          )}
        >
          {icon ? (
            <div className={cn(styles.icon, 'text-inherit')}>{icon}</div>
          ) : (
            VariantIcon && <VariantIcon className={styles.icon} />
          )}
        </motion.div>
      )}

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className={cn('font-semibold text-text-primary mb-2', styles.title)}
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={cn('text-text-secondary mb-6 max-w-md', styles.description)}
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          {action && (
            <Button variant="primary" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Specialized empty states for common use cases
export function NoDocumentsState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      variant="documents"
      title="No documents yet"
      description="Upload your first permit document to get started with compliance tracking."
      action={onUpload ? { label: 'Upload Document', onClick: onUpload } : undefined}
    />
  );
}

export function NoObligationsState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      variant="obligations"
      title="No obligations found"
      description="Obligations are automatically extracted from uploaded permits. Upload a permit to get started."
      action={onCreate ? { label: 'Create Obligation', onClick: onCreate } : undefined}
    />
  );
}

export function NoEvidenceState({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      variant="evidence"
      title="No evidence uploaded"
      description="Upload evidence files to demonstrate compliance with your obligations."
      action={onUpload ? { label: 'Upload Evidence', onClick: onUpload } : undefined}
    />
  );
}

export function NoSearchResultsState({ query }: { query?: string }) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description={query ? `No results found for "${query}". Try adjusting your search terms.` : 'Try adjusting your search or filters.'}
    />
  );
}

export function NoSitesState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      variant="sites"
      title="No sites yet"
      description="Add your first site to start tracking compliance across your organization."
      action={onCreate ? { label: 'Add Site', onClick: onCreate } : undefined}
    />
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description={message || "We couldn't load this content. Please try again."}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  );
}

export function NoDeadlinesState({ filterActive }: { filterActive?: boolean }) {
  return (
    <EmptyState
      variant="success"
      title={filterActive ? 'No deadlines match your filters' : 'All caught up!'}
      description={
        filterActive
          ? 'Try adjusting your filters to see more deadlines.'
          : "Great job! You have no pending or overdue deadlines."
      }
    />
  );
}

export function NoPacksState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      variant="packs"
      title="No audit packs yet"
      description="Generate audit packs to compile evidence for regulatory submissions."
      action={onCreate ? { label: 'Generate Pack', onClick: onCreate } : undefined}
    />
  );
}

