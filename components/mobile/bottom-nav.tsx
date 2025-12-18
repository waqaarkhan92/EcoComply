'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Bell,
  Settings,
} from 'lucide-react';

const navItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    name: 'Obligations',
    href: '/dashboard/obligations',
    icon: FileText,
    label: 'View obligations',
  },
  {
    name: 'Evidence',
    href: '/dashboard/evidence',
    icon: Upload,
    label: 'Upload evidence',
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    label: 'View notifications',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    label: 'Settings',
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-charcoal border-t border-border-gray z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal rounded-md',
                isActive ? 'text-primary' : 'text-text-tertiary'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn('h-5 w-5 mb-1', isActive && 'text-primary')}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-[10px] truncate w-full text-center leading-tight',
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
