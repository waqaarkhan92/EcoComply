'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Clock3,
  Package,
  Menu,
} from 'lucide-react';

const bottomNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Building2 },
  { name: 'Deadlines', href: '/dashboard/deadlines', icon: Clock3 },
  { name: 'Packs', href: '/dashboard/packs', icon: Package },
  { name: 'More', href: '/dashboard/settings', icon: Menu },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-charcoal border-t border-border-gray z-50 md:hidden pb-safe-bottom"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal rounded-md',
                isActive ? 'text-primary' : 'text-text-tertiary'
              )}
              aria-label={`Navigate to ${item.name}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('h-6 w-6 mb-1', isActive && 'text-primary')} aria-hidden="true" />
              <span
                className={cn(
                  'text-xs truncate w-full text-center',
                  isActive ? 'text-primary font-medium' : 'text-text-tertiary'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

