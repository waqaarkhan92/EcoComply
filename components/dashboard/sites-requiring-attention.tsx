'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getComplianceStatus, complianceStatusConfig } from '@/lib/utils/status';

interface Site {
  id: string;
  name: string;
  compliance_score?: number;
  overdue_count?: number;
  upcoming_count?: number;
}

interface SitesRequiringAttentionProps {
  sites: Site[];
  threshold?: number; // Sites below this score need attention
  limit?: number;
}

export function SitesRequiringAttention({
  sites,
  threshold = 85,
  limit = 3,
}: SitesRequiringAttentionProps) {
  const router = useRouter();

  // Filter sites that need attention (below threshold or have overdue items)
  const sitesNeedingAttention = sites
    .filter((site) => {
      const score = site.compliance_score ?? 100;
      const hasOverdue = (site.overdue_count ?? 0) > 0;
      return score < threshold || hasOverdue;
    })
    .sort((a, b) => {
      // Sort by overdue count first, then by compliance score
      const aOverdue = a.overdue_count ?? 0;
      const bOverdue = b.overdue_count ?? 0;
      if (aOverdue !== bOverdue) return bOverdue - aOverdue;
      return (a.compliance_score ?? 100) - (b.compliance_score ?? 100);
    })
    .slice(0, limit);

  if (sitesNeedingAttention.length === 0) {
    return null; // Don't render if no sites need attention
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-warning/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">Sites Requiring Attention</h2>
            <p className="text-sm text-text-secondary">
              {sitesNeedingAttention.length} {sitesNeedingAttention.length === 1 ? 'site' : 'sites'} below {threshold}% or with overdue items
            </p>
          </div>
        </div>
        <Link href="/dashboard/sites?filter=attention">
          <Button variant="outline" size="sm" className="border-warning text-warning hover:bg-warning hover:text-white">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {sitesNeedingAttention.map((site) => {
          const status = getComplianceStatus(site.compliance_score ?? 0);
          const config = complianceStatusConfig[status];

          return (
            <div
              key={site.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
            >
              <div className="flex items-center gap-4">
                {/* Status Indicator */}
                <div className={`w-3 h-3 rounded-full ${config.dotColor}`} />

                <div>
                  <p className="font-medium text-text-primary">{site.name}</p>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    {(site.overdue_count ?? 0) > 0 && (
                      <span className="text-danger font-medium">
                        {site.overdue_count} overdue
                      </span>
                    )}
                    {(site.upcoming_count ?? 0) > 0 && (
                      <span className="text-warning">
                        {site.upcoming_count} due soon
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={`text-2xl font-bold ${config.textColor}`}>
                    {site.compliance_score ?? 0}%
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-text-tertiary" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
