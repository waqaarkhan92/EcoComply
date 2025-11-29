'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth-store';

interface ModuleActivation {
  id: string;
  company_id: string;
  module_id: string;
  status: string;
  modules?: {
    module_code: string;
  };
}

interface ModuleActivationsResponse {
  data: ModuleActivation[];
}

export default function Module2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams();
  const siteId = params.siteId as string;
  const { user } = useAuthStore();

  // Check if Module 2 is activated - try to access a Module 2 endpoint to verify
  const { data, isLoading, error } = useQuery<{ data: any[] }>({
    queryKey: ['module-2-check', user?.company_id],
    queryFn: async () => {
      // Try to fetch parameters - if Module 2 is not activated, this will return 403
      try {
        return await apiClient.get('/module-2/parameters?limit=1');
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
      // Module 2 not activated or error
      router.push(`/dashboard?module_required=MODULE_2`);
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

