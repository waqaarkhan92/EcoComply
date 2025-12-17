import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';
import { PWAProvider } from '@/lib/providers/pwa-provider';
import { KeyboardShortcutsProvider } from '@/lib/providers/keyboard-shortcuts-provider';
import { ContextualHelpProvider } from '@/lib/providers/contextual-help-provider';
import { I18nProvider } from '@/lib/providers/i18n-provider';
import { PostHogProvider } from '@/lib/providers/posthog-provider';
import { HelpModal } from '@/components/help/HelpModal';
import { KeyboardShortcutsHandler } from '@/components/keyboard-shortcuts/KeyboardShortcutsHandler';
import { WorkerInitializer } from '@/components/system/WorkerInitializer';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://ecocomply.io'),
  title: {
    default: 'EcoComply - Environmental Compliance Management for UK Businesses',
    template: '%s | EcoComply',
  },
  description:
    'AI-powered environmental permit compliance for UK businesses. Extract obligations from permits in 60 seconds. Track deadlines, link evidence, generate audit packs.',
  keywords: [
    'environmental compliance',
    'permit management',
    'UK environmental regulations',
    'audit packs',
    'compliance tracking',
    'environmental permits',
    'EA permits',
    'obligation tracking',
  ],
  authors: [{ name: 'EcoComply' }],
  creator: 'EcoComply',
  publisher: 'EcoComply',
  manifest: '/manifest.json',
  themeColor: '#104B3A',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EcoComply',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://ecocomply.io',
    siteName: 'EcoComply',
    title: 'EcoComply - Environmental Compliance Management',
    description:
      'AI-powered environmental permit compliance. Extract obligations in 60 seconds, track deadlines, generate audit packs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EcoComply - Environmental Compliance Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EcoComply - Environmental Compliance Management',
    description:
      'AI-powered environmental permit compliance. Extract obligations in 60 seconds.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add these when you have them
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} bg-slate text-charcoal`}>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
        >
          Skip to main content
        </a>
        <ErrorBoundary>
          <WorkerInitializer />
          <Suspense fallback={null}>
            <PostHogProvider>
              <QueryProvider>
                <I18nProvider>
                  <PWAProvider>
                    <KeyboardShortcutsProvider>
                      <ContextualHelpProvider>
                        {children}
                        <HelpModal />
                        <KeyboardShortcutsHandler />
                        <Toaster position="top-right" richColors expand={true} />
                      </ContextualHelpProvider>
                    </KeyboardShortcutsProvider>
                  </PWAProvider>
                </I18nProvider>
              </QueryProvider>
            </PostHogProvider>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
