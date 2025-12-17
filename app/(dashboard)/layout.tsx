'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { ErrorBoundary } from '@/components/error-boundary';
import { CommandPalette } from '@/components/ui/enhanced/command-palette';
import { QuickActionsFAB } from '@/components/ui/quick-actions-fab';
import { useKeyboardShortcuts, commonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    commonShortcuts.goToDashboard(() => router.push('/dashboard')),
    commonShortcuts.goToSites(() => router.push('/dashboard/sites')),
    commonShortcuts.goToDeadlines(() => router.push('/dashboard/deadlines')),
    commonShortcuts.goToEvidence(() => router.push('/dashboard/evidence')),
    commonShortcuts.goToPacks(() => router.push('/dashboard/packs/regulatory')),
    commonShortcuts.help(() => {
      // Could open a help modal or shortcuts guide
      console.log('Help shortcuts: g d = Dashboard, g s = Sites, g l = Deadlines, g e = Evidence, g p = Packs, ctrl+k = Search');
    }),
  ]);

  // Check onboarding progress
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get('/users/me/onboarding-progress');
      return response.data;
    },
    enabled: isAuthenticated && !pathname.startsWith('/onboarding'),
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if onboarding is complete
    if (onboardingData && !onboardingData.is_complete && !pathname.startsWith('/onboarding')) {
      // Determine which step to redirect to
      const currentStep = onboardingData.current_step;
      if (currentStep === 'SITE_CREATION') {
        router.push('/onboarding/site-setup');
      } else if (currentStep === 'UPLOAD_METHOD_SELECTION') {
        router.push('/onboarding/upload-method');
      } else if (currentStep === 'PERMIT_UPLOAD' || currentStep === 'EXCEL_IMPORT') {
        // Check which path was taken
        if (onboardingData.completed_steps.includes('PERMIT_UPLOAD')) {
          router.push('/onboarding/extraction-review');
        } else if (onboardingData.completed_steps.includes('EXCEL_IMPORT')) {
          router.push('/onboarding/import-preview');
        } else {
          router.push('/onboarding/upload-method');
        }
      } else if (currentStep === 'EXTRACTION_REVIEW' || currentStep === 'IMPORT_CONFIRMATION') {
        router.push('/onboarding/evidence-tutorial');
      } else if (currentStep === 'EVIDENCE_TUTORIAL') {
        router.push('/onboarding/dashboard-intro');
      } else if (currentStep === 'DASHBOARD_INTRO') {
        router.push('/onboarding/complete');
      } else if (currentStep && currentStep !== 'COMPLETE') {
        // Default: redirect to site setup
        router.push('/onboarding/site-setup');
      }
    } else {
      setCheckingOnboarding(false);
    }
  }, [isAuthenticated, onboardingData, pathname, router]);

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Show loading while checking onboarding
  if (checkingOnboarding && !pathname.startsWith('/onboarding')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* Skip to main content link for keyboard users */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette />

      <div className="flex h-screen bg-background-secondary overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-background-secondary p-4 md:p-8 pb-20 md:pb-8"
            role="main"
            aria-label="Main content"
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Mobile Quick Actions FAB */}
        <QuickActionsFAB />
      </div>
    </ErrorBoundary>
  );
}

