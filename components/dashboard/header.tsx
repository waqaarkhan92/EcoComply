'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, ChevronDown, LogOut, Settings, HelpCircle, Menu } from 'lucide-react';
import Link from 'next/link';
import { NotificationDropdown } from './notification-dropdown';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, company, logout } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  const userInitials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="bg-charcoal border-b border-border-gray px-4 md:px-6 h-16 flex items-center relative z-50">
      <div className="flex items-center justify-between w-full">
        {/* Left: Hamburger Menu (Mobile) + Company Name */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-white hover:text-primary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h2 className="text-base md:text-lg font-semibold text-white truncate">
            {company?.name || 'Dashboard'}
          </h2>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="bg-white border-input-border"
            />
          </form>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Search Icon (Mobile) */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 text-white hover:text-primary transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications Bell */}
          <NotificationDropdown />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
              }}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-border-gray transition-colors"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                {userInitials}
              </div>
              <ChevronDown className="h-4 w-4 text-white hidden md:block" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-text-primary">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/help"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </Link>
                </div>
                <div className="border-t border-gray-200 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-background-tertiary transition-colors w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="bg-white"
              autoFocus
            />
          </form>
        </div>
      )}

      {/* Click outside to close menus */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUserMenu(false);
          }}
        />
      )}
    </header>
  );
}

