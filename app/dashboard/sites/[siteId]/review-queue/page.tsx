'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SiteReviewQueuePage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;

  // Redirect to main review queue with site filter
  useEffect(() => {
    router.replace(`/dashboard/review-queue?site_id=${siteId}`);
  }, [siteId, router]);

  // Fallback content while redirecting
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-gray-500">Redirecting to review queue...</p>
      </div>
    </div>
  );
}

