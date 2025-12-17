'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { AlertCircle, Link as LinkIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface UnlinkedEvidenceItem {
  id: string;
  file_name: string;
  days_since_upload: number;
  enforcement_status: string;
}

interface UnlinkedEvidenceWidgetProps {
  siteId: string;
}

export default function UnlinkedEvidenceWidget({ siteId }: UnlinkedEvidenceWidgetProps) {
  const { data: evidenceData } = useQuery({
    queryKey: ['unlinked-evidence-widget', siteId],
    queryFn: async () => {
      try {
        return apiClient.get<UnlinkedEvidenceItem[]>(`/evidence/unlinked?site_id=${siteId}&limit=5`);
      } catch (error) {
        return { data: [] as UnlinkedEvidenceItem[] };
      }
    },
  });

  const evidenceItems: UnlinkedEvidenceItem[] = evidenceData?.data ?? [];
  const criticalCount = evidenceItems.filter((item: UnlinkedEvidenceItem) =>
    item.enforcement_status === 'UNLINKED_CRITICAL' ||
    item.days_since_upload >= 14
  ).length;

  if (evidenceItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold">Unlinked Evidence</h3>
        </div>
        <Link
          href={`/dashboard/sites/${siteId}/evidence/unlinked`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {criticalCount > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm font-medium text-red-900">
            {criticalCount} {criticalCount === 1 ? 'item requires' : 'items require'} immediate attention
          </div>
        </div>
      )}

      <div className="space-y-3">
        {evidenceItems.slice(0, 5).map((item: UnlinkedEvidenceItem) => {
          const isCritical = item.enforcement_status === 'UNLINKED_CRITICAL' || item.days_since_upload >= 14;
          const daysRemaining = Math.max(0, 7 - item.days_since_upload);

          return (
            <div
              key={item.id}
              className={`p-3 border rounded-lg ${isCritical ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {item.file_name}
                  </div>
                  <div className="text-xs text-gray-600">
                    Uploaded {item.days_since_upload} {item.days_since_upload === 1 ? 'day' : 'days'} ago
                    {item.days_since_upload < 7 && (
                      <span className="text-green-600 ml-2">
                        • {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/sites/${siteId}/evidence/unlinked`}
                  className="ml-2 text-primary hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Link
          href={`/dashboard/sites/${siteId}/evidence/unlinked`}
          className="block text-center text-sm text-primary hover:underline"
        >
          View all {evidenceItems.length} unlinked items →
        </Link>
      </div>
    </div>
  );
}

