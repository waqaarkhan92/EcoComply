/**
 * Hook to check module activation status
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth-store';
import { apiClient } from '@/lib/api/client';

interface ModuleActivation {
  id: string;
  company_id: string;
  site_id: string | null;
  module_id: string;
  module_name?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface Module {
  id: string;
  module_code: string;
  module_name: string;
}

/**
 * Check if a module is activated for the user's company
 */
export function useModuleActivation(moduleCode: 'MODULE_2' | 'MODULE_3') {
  const { user } = useAuthStore();

  return useQuery<boolean>({
    queryKey: ['module-activation', user?.company_id, moduleCode],
    queryFn: async () => {
      if (!user?.company_id) {
        return false;
      }

      try {
        // First, get the module ID
        const modulesResponse = await apiClient.get<Module[]>(
          `/modules?filter[module_code]=${moduleCode}`
        );
        
        if (!modulesResponse.data || modulesResponse.data.length === 0) {
          return false;
        }

        const module = modulesResponse.data[0];

        // Check if module is activated for the company
        // For Module 2 (site-level), check if there's any active activation for any site
        // For Module 3 (company-level), check company-level activation (site_id is null)
        const activationsResponse = await apiClient.get<ModuleActivation[]>(
          `/module-activations?filter[company_id]=${user.company_id}&filter[module_id]=${module.id}&filter[status]=ACTIVE`
        );

        if (!activationsResponse.data || activationsResponse.data.length === 0) {
          return false;
        }

        // For Module 3, ensure it's company-level (site_id is null)
        if (moduleCode === 'MODULE_3') {
          return activationsResponse.data.some(activation => activation.site_id === null);
        }

        // For Module 2, any active activation means it's activated (for at least one site)
        return true;
      } catch (error) {
        console.error('Error checking module activation:', error);
        return false;
      }
    },
    enabled: !!user?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

