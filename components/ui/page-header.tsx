'use client';

import { ReactNode } from 'react';
import { Breadcrumbs, BreadcrumbItem } from './breadcrumbs';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Optional subtitle/description */
  description?: string;
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons to display on the right */
  actions?: ReactNode;
  /** Alias for actions (for compatibility) */
  action?: ReactNode;
  /** Optional badge next to title (e.g., status indicator) */
  badge?: ReactNode;
  /** Optional icon before title */
  icon?: ReactNode;
  /** Additional className */
  className?: string;
  /** Whether to show a border at bottom */
  bordered?: boolean;
  /** Custom content below title row */
  children?: ReactNode;
}

/**
 * Consistent page header component for all dashboard pages
 *
 * @example
 * <PageHeader
 *   title="Obligations"
 *   description="Track compliance obligations across all sites"
 *   breadcrumbs={[
 *     { label: 'Sites', href: '/dashboard/sites' },
 *     { label: 'Acme Corp' }
 *   ]}
 *   actions={
 *     <Button variant="primary">Add Obligation</Button>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  action,
  badge,
  icon,
  className,
  bordered = false,
  children,
}: PageHeaderProps) {
  // Support both 'actions' and 'action' props
  const actionContent = actions || action;
  return (
    <div
      className={cn(
        'space-y-4',
        bordered && 'pb-6 border-b border-gray-200',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-2" />
      )}

      {/* Title Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          {/* Title with optional icon and badge */}
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0 text-primary">
                {icon}
              </div>
            )}
            <h1 className="text-heading-lg text-text-primary truncate">
              {title}
            </h1>
            {badge && (
              <div className="flex-shrink-0">
                {badge}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="mt-1.5 text-body-md text-text-secondary max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actionContent && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actionContent}
          </div>
        )}
      </div>

      {/* Custom content */}
      {children}
    </div>
  );
}

/**
 * Page header with stats row - useful for dashboard-style pages
 */
interface PageHeaderWithStatsProps extends PageHeaderProps {
  stats?: Array<{
    label: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: ReactNode;
  }>;
}

export function PageHeaderWithStats({
  stats,
  ...headerProps
}: PageHeaderWithStatsProps) {
  return (
    <PageHeader {...headerProps}>
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-3">
              {stat.icon && (
                <div className="p-2 rounded-lg bg-background-tertiary text-text-secondary">
                  {stat.icon}
                </div>
              )}
              <div>
                <p className="text-label-sm text-text-tertiary uppercase tracking-wide">
                  {stat.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-heading-sm text-text-primary">
                    {stat.value}
                  </p>
                  {stat.change && (
                    <span
                      className={cn(
                        'text-label-xs',
                        stat.changeType === 'positive' && 'text-success',
                        stat.changeType === 'negative' && 'text-danger',
                        stat.changeType === 'neutral' && 'text-text-tertiary'
                      )}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageHeader>
  );
}
