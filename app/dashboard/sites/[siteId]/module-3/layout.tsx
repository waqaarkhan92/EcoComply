'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

export default function Module3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const siteId = params.siteId as string;
  const { user } = useAuthStore();

  // Check if Module 3 is activated - try to access a Module 3 endpoint to verify
  const { data, isLoading, error } = useQuery({
    queryKey: ['module-3-check', user?.company_id],
    queryFn: async (): Promise<any> => {
      // Try to fetch generators - if Module 3 is not activated, this will return 403
      try {
        return await apiClient.get('/module-3/generators?limit=1');
      } catch (err: any) {
        if (err.status === 403) {
          return null; // Module not activated
        }
        throw err;
      }
    },
    enabled: !!user?.company_id,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && (error || !data)) {
      // Module 3 not activated or error
      router.push(`/dashboard?module_required=MODULE_3`);
    }
  }, [data, isLoading, error, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Checking module activation...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

