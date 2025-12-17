import React from 'react';
import { Skeleton } from '@/components/ui/enhanced/skeleton';

export function SidebarSkeleton() {
  return (
    <div className="hidden md:flex bg-charcoal h-screen flex-col border-r border-[#2A2F33] w-64">
      {/* Logo */}
      <div className="h-16 border-b border-[#2A2F33] flex items-center px-3">
        <Skeleton className="w-8 h-8 rounded-lg bg-gray-700" />
        <Skeleton className="ml-3 h-6 w-32 bg-gray-700" />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-full bg-gray-700 rounded-lg" />
        ))}
      </nav>

      {/* Account Section */}
      <div className="px-2 py-4 border-t border-[#2A2F33] space-y-1">
        <Skeleton className="h-10 w-full bg-gray-700 rounded-lg" />
        <Skeleton className="h-10 w-full bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

export function CommandPaletteSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center border-b border-slate-200 px-4">
          <Skeleton className="h-5 w-5 mr-3" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-32 w-full" />
          <div className="flex gap-3 justify-end">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <Skeleton className="h-6 w-48 mb-6" />
      <div className="space-y-3">
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-4 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ComponentLoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
}
