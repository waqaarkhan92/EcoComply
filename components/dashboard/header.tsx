'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { Search, User, ChevronDown, LogOut, Settings, HelpCircle, Menu } from 'lucide-react';
import Link from 'next/link';
import { NotificationDropdown } from './notification-dropdown';
import { SiteSwitcher } from './site-switcher';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, company, logout } = useAuthStore();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Detect platform for keyboard shortcut display
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showUserMenu) {
        setShowUserMenu(false);
        userMenuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Open command palette using the global event
  const openCommandPalette = useCallback(() => {
    // Dispatch a custom event that the CommandPalette component listens for
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  // Handle keyboard navigation for user menu button
  const handleUserMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setShowUserMenu(!showUserMenu);
    } else if (e.key === 'ArrowDown' && !showUserMenu) {
      e.preventDefault();
      setShowUserMenu(true);
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
        {/* Left: Hamburger Menu (Mobile) + Site Switcher */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Hamburger Menu Button (Mobile Only) */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-white hover:text-primary transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          {/* Site Switcher (shows on site pages) */}
          <SiteSwitcher />
          {/* Company Name (shows when not on site page) */}
          <h2 className="text-base md:text-lg font-semibold text-white truncate hidden md:block">
            {company?.name || 'Dashboard'}
          </h2>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <button
            onClick={openCommandPalette}
            className="
              w-full flex items-center gap-3 px-4 py-2
              bg-[#1a1f20] hover:bg-[#242a2b]
              border border-[#2d3436] rounded-lg
              transition-all duration-200
              group
            "
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4 text-text-tertiary" />
            <span className="flex-1 text-left text-sm text-text-tertiary">
              Search anything...
            </span>
            <kbd className="
              hidden lg:inline-flex items-center gap-1
              px-2 py-1 text-xs font-medium
              bg-[#2d3436] text-text-tertiary
              rounded border border-[#3d4446]
              group-hover:bg-[#3d4446] group-hover:text-white
              transition-colors
            ">
              {isMac ? '⌘' : 'Ctrl'}
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Search Icon (Mobile) - Opens Command Palette */}
          <button
            onClick={openCommandPalette}
            className="md:hidden p-2 text-white hover:text-primary transition-colors"
            aria-label="Open search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications Bell */}
          <NotificationDropdown />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              ref={userMenuButtonRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              onKeyDown={handleUserMenuKeyDown}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-border-gray transition-colors"
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                {userInitials}
              </div>
              <ChevronDown className="h-4 w-4 text-white hidden md:block" />
            </button>
            {showUserMenu && (
              <div
                role="menu"
                aria-orientation="vertical"
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-text-primary">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-text-secondary truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1" role="none">
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/help"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-background-tertiary transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </Link>
                </div>
                <div className="border-t border-gray-200 pt-1" role="none">
                  <button
                    role="menuitem"
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

