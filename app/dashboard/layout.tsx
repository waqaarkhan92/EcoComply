'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/lib/store/auth-store';
import { SidebarSkeleton } from '@/components/ui/loading-skeletons';
import { Header } from '@/components/dashboard/header';
import { MobileHeader } from '@/components/mobile/mobile-header';
import { BottomNav } from '@/components/mobile/bottom-nav';

// Lazy load heavy components
const Sidebar = dynamic(() => import('@/components/dashboard/sidebar').then(mod => ({ default: mod.Sidebar })), {
  loading: () => <SidebarSkeleton />,
  ssr: true,
});

const MobileSidebar = dynamic(() => import('@/components/dashboard/mobile-sidebar').then(mod => ({ default: mod.MobileSidebar })), {
  ssr: false,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Check localStorage directly on mount to avoid hydration delay
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          const parsed = JSON.parse(stored);
          const hasAuth = parsed?.state?.user && parsed?.state?.accessToken;
          if (hasAuth) {
            // Auth exists in localStorage - wait for Zustand to hydrate, don't redirect
            setIsChecking(false);
            return;
          }
        }
        // No auth in localStorage - wait a bit for Zustand to hydrate, then check
        // This prevents redirecting before Zustand finishes loading
        const timer = setTimeout(() => {
          if (!isAuthenticated && !user) {
            router.push('/login');
          } else {
            setIsChecking(false);
          }
        }, 200);
        return () => clearTimeout(timer);
      } catch (e) {
        // localStorage parse error - wait for Zustand
        const timer = setTimeout(() => {
          if (!isAuthenticated && !user) {
            router.push('/login');
          } else {
            setIsChecking(false);
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, []); // Only run on mount

  // Also check Zustand state once hydrated
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated && !user) {
      router.push('/login');
    } else if (_hasHydrated) {
      setIsChecking(false);
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const handleMobileMenuClick = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const handleSearchClick = useCallback(() => {
    // Open command palette
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  }, []);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex h-screen bg-background-secondary items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  // Only redirect if definitely not authenticated
  if (!isAuthenticated && !user) {
    return null; // Will redirect
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMobileSidebarOpen} onClose={handleCloseMobileSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <Header />
        </div>

        {/* Mobile Header */}
        <MobileHeader onMenuClick={handleMobileMenuClick} onSearchClick={handleSearchClick} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background-secondary p-4 md:p-6 mt-14 md:mt-0 mb-16 md:mb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}

