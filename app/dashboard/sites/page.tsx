'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { NoSitesState } from '@/components/ui/empty-state';
import { Building2, Plus, ArrowRight, MapPin, AlertCircle, Clock, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getComplianceStatus, complianceStatusConfig } from '@/lib/utils/status';

// Local storage key for favorite sites (shared with site-switcher)
const FAVORITE_SITES_KEY = 'ecocomply_favorite_sites';

interface Site {
  id: string;
  name: string;
  address_line_1: string;
  city: string;
  postcode: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  active_modules?: string[];
  overdue_count?: number;
  upcoming_count?: number;
}

export default function SitesPage() {
  const router = useRouter();
  const [favoriteSiteIds, setFavoriteSiteIds] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(FAVORITE_SITES_KEY);
      if (stored) setFavoriteSiteIds(JSON.parse(stored));
    }
  }, []);

  // Toggle favorite
  const toggleFavorite = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteSiteIds(prev => {
      const updated = prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId];
      localStorage.setItem(FAVORITE_SITES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const { data: sitesData, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites: any[] = sitesData?.data || [];

  // Separate favorites from other sites
  const { favoriteSites, otherSites } = useMemo(() => {
    const favorites = sites.filter(s => favoriteSiteIds.includes(s.id));
    const others = sites.filter(s => !favoriteSiteIds.includes(s.id));
    return { favoriteSites: favorites, otherSites: others };
  }, [sites, favoriteSiteIds]);

  // Calculate summary stats
  const totalSites = sites.length;
  const compliantSites = sites.filter(s => (s.compliance_score ?? 0) >= 85).length;
  const atRiskSites = sites.filter(s => (s.compliance_score ?? 0) >= 70 && (s.compliance_score ?? 0) < 85).length;
  const nonCompliantSites = sites.filter(s => (s.compliance_score ?? 0) < 70).length;
  const totalOverdue = sites.reduce((sum, s) => sum + (s.overdue_count || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
        <div className="h-12 bg-gray-200 rounded animate-pulse w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Sites' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Sites"
        description="Manage your sites and view compliance status"
        actions={
          <Link href="/dashboard/sites/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Site
            </Button>
          </Link>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Total Sites</p>
          <p className="text-2xl font-bold text-text-primary">{totalSites}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Compliant</p>
          <p className="text-2xl font-bold text-success">{compliantSites}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">At Risk</p>
          <p className="text-2xl font-bold text-warning">{atRiskSites}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Non-Compliant</p>
          <p className="text-2xl font-bold text-danger">{nonCompliantSites}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-text-secondary mb-1">Overdue Items</p>
          <p className="text-2xl font-bold text-danger">{totalOverdue}</p>
        </div>
      </div>

      {/* Favorite Sites */}
      {favoriteSites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Favorites</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {favoriteSites.map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  isFavorite={true}
                  onToggleFavorite={toggleFavorite}
                  onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sites List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {sites.length === 0 ? (
          <NoSitesState onCreate={() => router.push('/dashboard/sites/new')} />
        ) : (
          <>
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-text-secondary uppercase tracking-wider">
              <div className="col-span-4">Site</div>
              <div className="col-span-2 text-center">Compliance</div>
              <div className="col-span-2 text-center">Overdue</div>
              <div className="col-span-2 text-center">Upcoming</div>
              <div className="col-span-2 text-center">Modules</div>
            </div>

            {/* Site Rows */}
            <div className="divide-y divide-gray-100">
              {(favoriteSites.length > 0 ? otherSites : sites).map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  isFavorite={favoriteSiteIds.includes(site.id)}
                  onToggleFavorite={toggleFavorite}
                  onClick={() => router.push(`/dashboard/sites/${site.id}/dashboard`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Extracted SiteRow component
interface SiteRowProps {
  site: Site;
  isFavorite: boolean;
  onToggleFavorite: (siteId: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

function SiteRow({ site, isFavorite, onToggleFavorite, onClick }: SiteRowProps) {
  const score = site.compliance_score || 0;
  const status = getComplianceStatus(score);
  const config = complianceStatusConfig[status];

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors items-center group"
      onClick={onClick}
    >
      {/* Site Info */}
      <div className="col-span-4 flex items-center gap-3">
        {/* Favorite Star Button */}
        <button
          onClick={(e) => onToggleFavorite(site.id, e)}
          className={`p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ${
            isFavorite ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
          status === 'COMPLIANT' ? 'bg-success' :
          status === 'AT_RISK' ? 'bg-warning' : 'bg-danger'
        }`} />
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{site.name}</h3>
          <div className="flex items-center text-sm text-text-secondary">
            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">{site.city}{site.postcode ? `, ${site.postcode}` : ''}</span>
          </div>
        </div>
      </div>

      {/* Compliance Score */}
      <div className="col-span-2 flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${config.textClass}`}>{score}</span>
          <span className="text-sm text-text-tertiary">%</span>
        </div>
        <div className="w-full max-w-[80px] bg-gray-200 rounded-full h-1.5 mt-1">
          <div
            className={`h-1.5 rounded-full ${config.bgClass}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Overdue */}
      <div className="col-span-2 flex justify-center">
        {(site.overdue_count || 0) > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-danger/10 rounded-full">
            <AlertCircle className="h-4 w-4 text-danger" />
            <span className="font-semibold text-danger">{site.overdue_count}</span>
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </div>

      {/* Upcoming */}
      <div className="col-span-2 flex justify-center">
        {(site.upcoming_count || 0) > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-warning/10 rounded-full">
            <Clock className="h-4 w-4 text-warning" />
            <span className="font-semibold text-warning">{site.upcoming_count}</span>
          </div>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </div>

      {/* Active Modules */}
      <div className="col-span-2 flex items-center justify-between">
        <div className="flex gap-1">
          {site.active_modules && site.active_modules.length > 0 ? (
            site.active_modules.slice(0, 3).map((module) => (
              <span
                key={module}
                className="w-6 h-6 flex items-center justify-center text-xs font-medium rounded bg-primary/10 text-primary"
                title={module.replace('MODULE_', 'Module ')}
              >
                {module.replace('MODULE_', '')}
              </span>
            ))
          ) : (
            <span className="text-xs text-text-tertiary">None</span>
          )}
          {site.active_modules && site.active_modules.length > 3 && (
            <span className="w-6 h-6 flex items-center justify-center text-xs font-medium rounded bg-gray-100 text-text-secondary">
              +{site.active_modules.length - 3}
            </span>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-text-tertiary" />
      </div>
    </div>
  );
}
