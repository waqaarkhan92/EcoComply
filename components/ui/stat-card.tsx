'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface StatCardProps {
  /** Metric label */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Optional suffix (e.g., '%', 'days') */
  suffix?: string;
  /** Icon to display */
  icon?: ReactNode;
  /** Optional link */
  href?: string;
  /** Click handler */
  onClick?: () => void;
  /** Change/trend value */
  change?: string | number;
  /** Change type for styling */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** Change label (e.g., 'vs last week') */
  changeLabel?: string;
  /** Visual variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * Stat card component for displaying metrics
 *
 * @example
 * <StatCard
 *   label="Total Obligations"
 *   value={156}
 *   icon={<ClipboardList className="h-5 w-5" />}
 *   change="+12%"
 *   changeType="positive"
 *   changeLabel="vs last month"
 * />
 */
export function StatCard({
  label,
  value,
  suffix,
  icon,
  href,
  onClick,
  change,
  changeType = 'neutral',
  changeLabel,
  variant = 'default',
  size = 'md',
  className,
}: StatCardProps) {
  const variantStyles = {
    default: {
      container: 'bg-white border border-gray-200',
      iconBg: 'bg-gray-100 text-text-secondary',
      value: 'text-text-primary',
    },
    primary: {
      container: 'bg-white border border-gray-200',
      iconBg: 'bg-primary/10 text-primary',
      value: 'text-primary',
    },
    success: {
      container: 'bg-white border border-gray-200',
      iconBg: 'bg-success/10 text-success',
      value: 'text-success',
    },
    warning: {
      container: 'bg-white border border-gray-200',
      iconBg: 'bg-warning/10 text-warning',
      value: 'text-warning',
    },
    danger: {
      container: 'bg-white border border-gray-200',
      iconBg: 'bg-danger/10 text-danger',
      value: 'text-danger',
    },
  };

  const sizeStyles = {
    sm: {
      padding: 'p-4',
      iconContainer: 'p-1.5',
      value: 'text-2xl',
      label: 'text-xs',
    },
    md: {
      padding: 'p-5',
      iconContainer: 'p-2',
      value: 'text-3xl',
      label: 'text-sm',
    },
    lg: {
      padding: 'p-6',
      iconContainer: 'p-2.5',
      value: 'text-4xl',
      label: 'text-sm',
    },
  };

  const changeStyles = {
    positive: 'text-success',
    negative: 'text-danger',
    neutral: 'text-text-tertiary',
  };

  const ChangeIcon = changeType === 'positive'
    ? ArrowUpRight
    : changeType === 'negative'
      ? ArrowDownRight
      : Minus;

  const content = (
    <div
      className={cn(
        'rounded-lg transition-shadow hover:shadow-md',
        variantStyles[variant].container,
        sizeStyles[size].padding,
        (href || onClick) && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header: Icon + Link */}
      <div className="flex items-center justify-between mb-3">
        {icon && (
          <div
            className={cn(
              'rounded-lg',
              sizeStyles[size].iconContainer,
              variantStyles[variant].iconBg
            )}
          >
            {icon}
          </div>
        )}
        {href && (
          <span className="text-xs font-medium text-primary hover:underline">
            View →
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-bold tracking-tight',
            sizeStyles[size].value,
            variantStyles[variant].value
          )}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-lg font-medium text-text-tertiary">{suffix}</span>
        )}
      </div>

      {/* Label */}
      <p
        className={cn(
          'font-medium text-text-secondary uppercase tracking-wide mt-1',
          sizeStyles[size].label
        )}
      >
        {label}
      </p>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <ChangeIcon className={cn('h-4 w-4', changeStyles[changeType])} />
          <span className={cn('text-sm font-medium', changeStyles[changeType])}>
            {change}
          </span>
          {changeLabel && (
            <span className="text-sm text-text-tertiary">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// =============================================================================
// STAT CARD GRID
// =============================================================================

interface StatCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

/**
 * Grid layout for stat cards
 */
export function StatCardGrid({ children, columns = 4, className }: StatCardGridProps) {
  const columnStyles = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', columnStyles[columns], className)}>
      {children}
    </div>
  );
}

// =============================================================================
// COMPACT STAT (inline)
// =============================================================================

interface CompactStatProps {
  label: string;
  value: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

/**
 * Compact inline stat display
 */
export function CompactStat({ label, value, variant = 'default', className }: CompactStatProps) {
  const variantStyles = {
    default: 'text-text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('text-2xl font-bold', variantStyles[variant])}>
        {value}
      </span>
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}

// =============================================================================
// HERO STAT (large featured stat)
// =============================================================================

interface HeroStatProps {
  label: string;
  value: string | number;
  suffix?: string;
  status?: 'success' | 'warning' | 'danger';
  statusLabel?: string;
  description?: string;
  className?: string;
}

/**
 * Large featured stat for hero sections
 */
export function HeroStat({
  label,
  value,
  suffix,
  status,
  statusLabel,
  description,
  className,
}: HeroStatProps) {
  const statusStyles = {
    success: {
      text: 'text-success',
      bg: 'bg-success',
      label: statusLabel || 'Compliant',
    },
    warning: {
      text: 'text-warning',
      bg: 'bg-warning',
      label: statusLabel || 'At Risk',
    },
    danger: {
      text: 'text-danger',
      bg: 'bg-danger',
      label: statusLabel || 'Critical',
    },
  };

  const statusConfig = status ? statusStyles[status] : null;

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={cn('text-5xl font-bold tracking-tight', statusConfig?.text || 'text-text-primary')}>
          {value}
        </span>
        {suffix && (
          <span className="text-2xl text-text-tertiary">{suffix}</span>
        )}
      </div>
      {statusConfig && (
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', statusConfig.bg)} />
          <span className={cn('text-sm font-medium', statusConfig.text)}>
            {statusConfig.label}
          </span>
        </div>
      )}
      {description && (
        <p className="text-sm text-text-secondary mt-1">{description}</p>
      )}
    </div>
  );
}
