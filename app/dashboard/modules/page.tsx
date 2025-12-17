'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';

interface Module {
  id: string;
  module_code: string;
  module_name: string;
  module_description: string;
  is_active: boolean;
  is_default: boolean;
}

interface ModuleActivation {
  id: string;
  module_id: string;
  status: string;
  activated_at: string;
}

export default function ModulesPage() {
  const { user } = useAuthStore();

  const { data: modulesData } = useQuery({
    queryKey: ['modules'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Module[] }>('/modules');
    },
  });

  const { data: activationsData } = useQuery({
    queryKey: ['module-activations', user?.company_id],
    queryFn: async (): Promise<any> => {
      if (!user?.company_id) return { data: [] };
      return apiClient.get<{ data: ModuleActivation[] }>(`/module-activations?filter[company_id]=${user.company_id}&filter[status]=ACTIVE`);
    },
    enabled: !!user?.company_id,
  });

  const activateModule = useMutation({
    mutationFn: async (moduleId: string) => {
      return apiClient.post(`/modules/${moduleId}/activate`, {});
    },
    onSuccess: () => {
      // Refetch activations
    },
  });

  const modules: any[] = modulesData?.data || [];
  const activations: any[] = activationsData?.data || [];
  const activatedModuleIds = new Set(activations.map(a => a.module_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modules</h1>
        <p className="text-gray-600 mt-1">Activate and manage compliance modules</p>
      </div>

      <div className="grid gap-6">
        {modules.map((module) => {
          const isActivated = activatedModuleIds.has(module.id);
          
          return (
            <div key={module.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold">{module.module_name}</h3>
                    {isActivated ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{module.module_description}</p>
                </div>
                <div>
                  {!isActivated ? (
                    <Button
                      onClick={() => activateModule.mutate(module.id)}
                      disabled={activateModule.isPending}
                    >
                      Activate Module
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activated
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

