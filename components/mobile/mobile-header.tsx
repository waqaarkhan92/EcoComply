'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface MobileHeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function MobileHeader({ onMenuClick, onSearchClick }: MobileHeaderProps) {
  const { user, company } = useAuthStore();

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-charcoal border-b border-border-gray z-50 h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-white hover:text-primary transition-colors touch-manipulation"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Center: Logo/Company Name */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-white font-semibold text-base truncate max-w-[150px]">
              {company?.name || 'EcoComply'}
            </span>
          </div>
        </Link>

        {/* Right: Search & Notifications */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSearchClick}
            className="p-2 text-white hover:text-primary transition-colors touch-manipulation"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <NotificationBell />

          <Link
            href="/dashboard/settings"
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium touch-manipulation"
            aria-label="User menu"
          >
            {userInitials}
          </Link>
        </div>
      </div>
    </header>
  );
}
