'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, Check, ChevronDown, Search, Star, Clock } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

// Local storage key for recent sites
const RECENT_SITES_KEY = 'ecocomply_recent_sites';
const FAVORITE_SITES_KEY = 'ecocomply_favorite_sites';
const MAX_RECENT_SITES = 3;

export function SiteSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract current site ID from pathname
  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  // Recent sites from localStorage
  const [recentSiteIds, setRecentSiteIds] = useState<string[]>([]);
  const [favoriteSiteIds, setFavoriteSiteIds] = useState<string[]>([]);

  // Load recent and favorite sites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SITES_KEY);
      if (stored) setRecentSiteIds(JSON.parse(stored));

      const favorites = localStorage.getItem(FAVORITE_SITES_KEY);
      if (favorites) setFavoriteSiteIds(JSON.parse(favorites));
    }
  }, []);

  // Save current site to recent sites
  useEffect(() => {
    if (currentSiteId && typeof window !== 'undefined') {
      setRecentSiteIds(prev => {
        const updated = [currentSiteId, ...prev.filter(id => id !== currentSiteId)].slice(0, MAX_RECENT_SITES);
        localStorage.setItem(RECENT_SITES_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentSiteId]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch all sites
  const { data: sitesData, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites: any[] = sitesData?.data || [];
  const currentSite = sites.find(s => s.id === currentSiteId);

  // Filter sites based on search
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) return sites;
    const query = searchQuery.toLowerCase();
    return sites.filter(site => site.name.toLowerCase().includes(query));
  }, [sites, searchQuery]);

  // Get recent sites (excluding current)
  const recentSites = useMemo(() => {
    return recentSiteIds
      .filter(id => id !== currentSiteId)
      .map(id => sites.find(s => s.id === id))
      .filter((s): s is Site => !!s)
      .slice(0, MAX_RECENT_SITES);
  }, [recentSiteIds, sites, currentSiteId]);

  // Get favorite sites
  const favoriteSites = useMemo(() => {
    return favoriteSiteIds
      .map(id => sites.find(s => s.id === id))
      .filter((s): s is Site => !!s);
  }, [favoriteSiteIds, sites]);

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

  // Don't show if not on a site page
  if (!currentSiteId || !pathname.includes('/sites/')) {
    return null;
  }

  const getStatusColor = (status?: string, score?: number) => {
    if (!status && !score) return '#6B7280'; // Gray if no status
    if (status === 'COMPLIANT' || (score && score >= 85)) return '#2E7D32'; // Green
    if (status === 'AT_RISK' || (score && score >= 70 && score < 85)) return '#D4A017'; // Yellow
    return '#C44536'; // Red
  };

  const handleSiteChange = (siteId: string) => {
    setIsOpen(false);
    // Navigate to the new site's dashboard
    router.push(`/dashboard/sites/${siteId}/dashboard`);
  };

  return (
    <div className="relative">
      {/* Site Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-[#1a1f20] hover:bg-[#242a2b]
          border border-[#2d3436]
          transition-all duration-200
          min-w-[200px]
        "
        aria-label="Switch site"
      >
        <Building2 className="h-4 w-4 text-white flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {currentSite?.name || 'Select Site'}
          </p>
          {currentSite && currentSite.compliance_score !== undefined && (
            <div className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(currentSite.compliance_status, currentSite.compliance_score) }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: getStatusColor(currentSite.compliance_status, currentSite.compliance_score) }}
              >
                {currentSite.compliance_score}%
              </span>
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[28rem] overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search sites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  aria-label="Search sites"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading sites...</div>
              ) : sites.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">No sites available</div>
              ) : (
                <>
                  {/* Favorites Section */}
                  {favoriteSites.length > 0 && !searchQuery && (
                    <div className="py-2">
                      <div className="px-4 py-1.5 flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Favorites</p>
                      </div>
                      {favoriteSites.map((site) => (
                        <SiteRow
                          key={`fav-${site.id}`}
                          site={site}
                          isSelected={site.id === currentSiteId}
                          isFavorite={true}
                          getStatusColor={getStatusColor}
                          onSelect={handleSiteChange}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}

                  {/* Recent Sites Section */}
                  {recentSites.length > 0 && !searchQuery && (
                    <div className="py-2 border-t border-gray-100">
                      <div className="px-4 py-1.5 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-500 uppercase">Recent</p>
                      </div>
                      {recentSites.map((site) => (
                        <SiteRow
                          key={`recent-${site.id}`}
                          site={site}
                          isSelected={site.id === currentSiteId}
                          isFavorite={favoriteSiteIds.includes(site.id)}
                          getStatusColor={getStatusColor}
                          onSelect={handleSiteChange}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  )}

                  {/* All Sites Section */}
                  <div className="py-2 border-t border-gray-100">
                    <div className="px-4 py-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {searchQuery ? `Results (${filteredSites.length})` : 'All Sites'}
                      </p>
                    </div>
                    {filteredSites.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-gray-500 text-center">
                        No sites match "{searchQuery}"
                      </div>
                    ) : (
                      filteredSites.map((site) => (
                        <SiteRow
                          key={site.id}
                          site={site}
                          isSelected={site.id === currentSiteId}
                          isFavorite={favoriteSiteIds.includes(site.id)}
                          getStatusColor={getStatusColor}
                          onSelect={handleSiteChange}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/sites');
                }}
                className="w-full px-3 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50 transition-colors rounded-md"
              >
                View All Sites →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Extracted SiteRow component for cleaner code
interface SiteRowProps {
  site: Site;
  isSelected: boolean;
  isFavorite: boolean;
  getStatusColor: (status?: string, score?: number) => string;
  onSelect: (siteId: string) => void;
  onToggleFavorite: (siteId: string, e: React.MouseEvent) => void;
}

function SiteRow({ site, isSelected, isFavorite, getStatusColor, onSelect, onToggleFavorite }: SiteRowProps) {
  const statusColor = getStatusColor(site.compliance_status, site.compliance_score);

  return (
    <button
      onClick={() => onSelect(site.id)}
      className={`
        w-full px-4 py-2.5 flex items-center gap-3
        hover:bg-gray-50 transition-colors group
        ${isSelected ? 'bg-primary/5' : ''}
      `}
    >
      <div className="flex-shrink-0">
        <Building2
          className="h-5 w-5"
          style={{ color: statusColor }}
        />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
          {site.name}
        </p>
        {site.compliance_score !== undefined && (
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: statusColor }}
            >
              {site.compliance_score}%
            </span>
          </div>
        )}
      </div>
      <button
        onClick={(e) => onToggleFavorite(site.id, e)}
        className={`p-1 rounded hover:bg-gray-200 transition-colors ${isFavorite ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>
      {isSelected && (
        <Check className="h-5 w-5 text-primary flex-shrink-0" />
      )}
    </button>
  );
}
