'use client';

import { ErrorBoundary } from '@/components/error-boundary';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background-secondary flex items-center justify-center p-4">
        {children}
      </div>
    </ErrorBoundary>
  );
}

