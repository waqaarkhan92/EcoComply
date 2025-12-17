'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

/**
 * Breadcrumbs component for navigation hierarchy
 *
 * @example
 * <Breadcrumbs
 *   items={[
 *     { label: 'Sites', href: '/dashboard/sites' },
 *     { label: 'Acme Corp', href: '/dashboard/sites/123' },
 *     { label: 'Obligations' }
 *   ]}
 * />
 */
export function Breadcrumbs({
  items,
  className,
  showHome = true,
  separator,
}: BreadcrumbsProps) {
  const defaultSeparator = (
    <ChevronRight className="h-4 w-4 text-text-tertiary flex-shrink-0" />
  );

  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: 'Dashboard', href: '/dashboard', icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (separator || defaultSeparator)}

              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors',
                    'text-text-secondary hover:text-text-primary',
                    isFirst && 'text-text-tertiary'
                  )}
                >
                  {item.icon}
                  <span className={cn(isFirst && showHome && 'sr-only md:not-sr-only')}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium',
                    isLast ? 'text-text-primary' : 'text-text-secondary'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Hook to generate breadcrumbs from pathname
 */
export function useBreadcrumbsFromPath(pathname: string, labels?: Record<string, string>) {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip 'dashboard' as it's the home
    if (segment === 'dashboard' && i === 0) continue;

    // Check if this is a dynamic segment (UUID or ID)
    const isDynamic = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    // Get label from provided labels map or format the segment
    let label = labels?.[segment] || labels?.[currentPath];

    if (!label && !isDynamic) {
      // Format segment: 'recurring-tasks' -> 'Recurring Tasks'
      label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // For dynamic segments, use the label from the map or skip
    if (isDynamic && !label) continue;

    const isLast = i === segments.length - 1;

    items.push({
      label: label || segment,
      href: isLast ? undefined : currentPath,
    });
  }

  return items;
}
