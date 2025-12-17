import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';
import { PWAProvider } from '@/lib/providers/pwa-provider';
import { KeyboardShortcutsProvider } from '@/lib/providers/keyboard-shortcuts-provider';
import { ContextualHelpProvider } from '@/lib/providers/contextual-help-provider';
import { I18nProvider } from '@/lib/providers/i18n-provider';
import { HelpModal } from '@/components/help/HelpModal';
import { KeyboardShortcutsHandler } from '@/components/keyboard-shortcuts/KeyboardShortcutsHandler';
import { WorkerInitializer } from '@/components/system/WorkerInitializer';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EcoComply - Environmental Compliance Management',
  description: 'Compliance Management SaaS for Environmental Permits',
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
        <ErrorBoundary>
          <WorkerInitializer />
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
