'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  FolderOpen,
  User,
} from 'lucide-react';

const bottomNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Obligations', href: '/dashboard/obligations', icon: ClipboardList },
  { name: 'Evidence', href: '/dashboard/evidence', icon: FolderOpen },
  { name: 'Profile', href: '/profile', icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-charcoal border-t border-border-gray z-50 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-full px-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 transition-colors',
                isActive ? 'text-primary' : 'text-text-tertiary'
              )}
            >
              <Icon className={cn('h-6 w-6 mb-1', isActive && 'text-primary')} />
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

