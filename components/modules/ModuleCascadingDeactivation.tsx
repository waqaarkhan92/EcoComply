'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CheckCircle, AlertCircle } from 'lucide-react';

interface Module {
  id: string;
  module_type: string;
  module_name: string;
  is_active: boolean;
  dependencies: string[]; // Module IDs this module depends on
  dependents: string[]; // Module IDs that depend on this module
}

interface ModuleCascadingDeactivationProps {
  siteId: string;
  moduleId: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ModuleCascadingDeactivation({
  siteId,
  moduleId,
  onCancel,
  onConfirm,
}: ModuleCascadingDeactivationProps) {
  const queryClient = useQueryClient();
  const [acknowledged, setAcknowledged] = useState(false);

  const { data: modulesData } = useQuery<{ data: Module[] }>({
    queryKey: ['site-modules', siteId],
    queryFn: async () => {
      return apiClient.get(`/sites/${siteId}/modules`);
    },
  });

  const { data: moduleData } = useQuery<{ data: Module }>({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      return apiClient.get(`/modules/${moduleId}`);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/sites/${siteId}/modules/${moduleId}/deactivate`, {
        cascade: true,
        acknowledge_dependencies: acknowledged,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-modules', siteId] });
      queryClient.invalidateQueries({ queryKey: ['module', moduleId] });
      onConfirm();
    },
  });

  const modules = modulesData?.data || [];
  const module = moduleData?.data;

  if (!module) {
    return null;
  }

  // Find dependent modules (modules that depend on this one)
  const dependentModules = modules.filter(m =>
    m.dependencies?.includes(moduleId)
  );

  // Find modules this module depends on
  const dependencyModules = modules.filter(m =>
    module.dependencies?.includes(m.id)
  );

  const hasDependents = dependentModules.length > 0;
  const hasDependencies = dependencyModules.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Module Deactivation Warning</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Warning Message */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-900 mb-1">
                Deactivating {module.module_name} will affect other modules
              </div>
              <div className="text-xs text-amber-800">
                This action cannot be easily undone. Please review the impact below.
              </div>
            </div>
          </div>
        </div>

        {/* Dependent Modules Warning */}
        {hasDependents && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900 mb-2">
                  The following modules depend on {module.module_name}:
                </div>
                <ul className="space-y-1">
                  {dependentModules.map((dep) => (
                    <li key={dep.id} className="text-sm text-red-800">
                      • {dep.module_name}
                      {dep.is_active && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-red-700 mt-2">
                  These modules may need to be deactivated or reconfigured.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dependency Modules Info */}
        {hasDependencies && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  {module.module_name} depends on:
                </div>
                <ul className="space-y-1">
                  {dependencyModules.map((dep) => (
                    <li key={dep.id} className="text-sm text-blue-800">
                      • {dep.module_name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* No Dependencies */}
        {!hasDependents && !hasDependencies && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-green-900">
                  No module dependencies detected
                </div>
                <div className="text-xs text-green-800 mt-1">
                  This module can be safely deactivated without affecting others.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acknowledgment Checkbox */}
        {hasDependents && (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="acknowledge"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 rounded border-gray-300"
            />
            <label htmlFor="acknowledge" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-gray-900">
                I acknowledge that dependent modules may be affected
              </div>
              <div className="text-xs text-gray-600 mt-1">
                By checking this, you confirm that you understand the impact of deactivating this module.
              </div>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deactivateMutation.mutate()}
            disabled={hasDependents && !acknowledged}
          >
            {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Module'}
          </Button>
        </div>
      </div>
    </div>
  );
}

