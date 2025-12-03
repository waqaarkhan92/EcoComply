'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuditPackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const auditPackId = params.auditPackId as string;

  // Redirect to pack detail page (legacy route behavior)
  useEffect(() => {
    router.replace(`/dashboard/sites/${siteId}/packs/${auditPackId}`);
  }, [siteId, auditPackId, router]);

  // Fallback content while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-gray-500">Redirecting to pack detail...</p>
      </div>
    </div>
  );
}

