'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

interface TabBarProps {
  tabs: TabItem[];
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export function TabBar({ tabs, className, variant = 'default' }: TabBarProps) {
  const pathname = usePathname();

  const getActiveTab = () => {
    // Find the most specific matching tab
    return tabs.reduce((best, tab) => {
      if (pathname === tab.href) return tab;
      if (pathname?.startsWith(tab.href + '/') && (!best || tab.href.length > best.href.length)) {
        return tab;
      }
      return best;
    }, null as TabItem | null);
  };

  const activeTab = getActiveTab();

  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {tabs.map((tab) => {
          const isActive = activeTab?.id === tab.id;
          const Icon = tab.icon;

          if (tab.disabled) {
            return (
              <span
                key={tab.id}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
              </span>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200 hover:text-text-primary'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn(
                  'ml-1 px-2 py-0.5 text-xs rounded-full',
                  isActive ? 'bg-white/20' : 'bg-gray-200'
                )}>
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className={cn('border-b border-gray-200', className)}>
        <nav className="flex gap-6 -mb-px">
          {tabs.map((tab) => {
            const isActive = activeTab?.id === tab.id;
            const Icon = tab.icon;

            if (tab.disabled) {
              return (
                <span
                  key={tab.id}
                  className="inline-flex items-center gap-2 px-1 py-3 text-sm font-medium text-gray-400 border-b-2 border-transparent cursor-not-allowed"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {tab.label}
                </span>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'inline-flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300'
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={cn(
                    'ml-1 px-2 py-0.5 text-xs rounded-full',
                    isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-text-secondary'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // Default variant (card-style tabs)
  return (
    <div className={cn('bg-gray-100 rounded-lg p-1 inline-flex gap-1', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab?.id === tab.id;
        const Icon = tab.icon;

        if (tab.disabled) {
          return (
            <span
              key={tab.id}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-gray-400 cursor-not-allowed"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                isActive ? 'bg-primary/10 text-primary' : 'bg-gray-200 text-text-secondary'
              )}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
