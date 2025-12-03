'use client';

import { use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ModuleCascadingDeactivation from '@/components/modules/ModuleCascadingDeactivation';

export default function ModuleDeactivationPage({
  params,
}: {
  params: Promise<{ siteId: string; moduleId: string }>;
}) {
  const { siteId, moduleId } = use(params);
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6">
      <ModuleCascadingDeactivation
        siteId={siteId}
        moduleId={moduleId}
        onCancel={() => router.back()}
        onConfirm={() => router.push(`/dashboard/sites/${siteId}/modules`)}
      />
    </div>
  );
}

