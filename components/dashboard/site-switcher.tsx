'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Building2, Check, ChevronDown } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  compliance_score?: number;
  compliance_status?: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
}

export function SiteSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Extract current site ID from pathname
  const siteIdMatch = pathname?.match(/\/sites\/([^/]+)/);
  const currentSiteId = siteIdMatch ? siteIdMatch[1] : null;

  // Fetch all sites
  const { data: sitesData, isLoading } = useQuery<{ data: Site[] }>({
    queryKey: ['sites'],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Site[] }>('/sites');
    },
  });

  const sites = sitesData?.data || [];
  const currentSite = sites.find(s => s.id === currentSiteId);

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
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-gray-500">Loading sites...</div>
            ) : sites.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">No sites available</div>
            ) : (
              <>
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Select Site</p>
                </div>
                {sites.map((site) => {
                  const isSelected = site.id === currentSiteId;
                  const statusColor = getStatusColor(site.compliance_status, site.compliance_score);

                  return (
                    <button
                      key={site.id}
                      onClick={() => handleSiteChange(site.id)}
                      className={`
                        w-full px-4 py-3 flex items-center gap-3
                        hover:bg-gray-50 transition-colors
                        ${isSelected ? 'bg-blue-50' : ''}
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
                          <div className="flex items-center gap-2 mt-1">
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
                            <span className="text-xs text-gray-500">
                              {site.compliance_status === 'COMPLIANT' || (site.compliance_score >= 85) ? 'Compliant' :
                               site.compliance_status === 'AT_RISK' || (site.compliance_score >= 70 && site.compliance_score < 85) ? 'At Risk' :
                               'Non-Compliant'}
                            </span>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/dashboard/sites');
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
                  >
                    View All Sites →
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
