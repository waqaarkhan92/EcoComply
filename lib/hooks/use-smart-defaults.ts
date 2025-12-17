import { useState, useEffect, useCallback } from 'react';

// Local storage keys for smart defaults
const LAST_SITE_KEY = 'ecocomply_last_site';
const LAST_FILTERS_KEY = 'ecocomply_last_filters';
const UPLOAD_PREFERENCES_KEY = 'ecocomply_upload_prefs';

interface UploadPreferences {
  defaultSiteId?: string;
  defaultCategory?: string;
  autoLinkToOverdue?: boolean;
}

interface FilterPreferences {
  [pageKey: string]: Record<string, string>;
}

/**
 * Hook for managing smart defaults - remembers user preferences
 */
export function useSmartDefaults() {
  // Last visited site
  const [lastSiteId, setLastSiteIdState] = useState<string | null>(null);

  // Filter preferences by page
  const [filterPrefs, setFilterPrefsState] = useState<FilterPreferences>({});

  // Upload preferences
  const [uploadPrefs, setUploadPrefsState] = useState<UploadPreferences>({});

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedSite = localStorage.getItem(LAST_SITE_KEY);
      if (storedSite) setLastSiteIdState(storedSite);

      const storedFilters = localStorage.getItem(LAST_FILTERS_KEY);
      if (storedFilters) setFilterPrefsState(JSON.parse(storedFilters));

      const storedUpload = localStorage.getItem(UPLOAD_PREFERENCES_KEY);
      if (storedUpload) setUploadPrefsState(JSON.parse(storedUpload));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Set last visited site
  const setLastSiteId = useCallback((siteId: string) => {
    setLastSiteIdState(siteId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SITE_KEY, siteId);
    }
  }, []);

  // Get/set filter preferences for a specific page
  const getFilterDefaults = useCallback((pageKey: string): Record<string, string> => {
    return filterPrefs[pageKey] || {};
  }, [filterPrefs]);

  const setFilterDefaults = useCallback((pageKey: string, filters: Record<string, string>) => {
    setFilterPrefsState(prev => {
      const updated = { ...prev, [pageKey]: filters };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_FILTERS_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Update upload preferences
  const updateUploadPrefs = useCallback((prefs: Partial<UploadPreferences>) => {
    setUploadPrefsState(prev => {
      const updated = { ...prev, ...prefs };
      if (typeof window !== 'undefined') {
        localStorage.setItem(UPLOAD_PREFERENCES_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Get suggested site for upload (most recently used or most used)
  const getSuggestedSite = useCallback(() => {
    return uploadPrefs.defaultSiteId || lastSiteId;
  }, [uploadPrefs.defaultSiteId, lastSiteId]);

  // Clear all preferences
  const clearAll = useCallback(() => {
    setLastSiteIdState(null);
    setFilterPrefsState({});
    setUploadPrefsState({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_SITE_KEY);
      localStorage.removeItem(LAST_FILTERS_KEY);
      localStorage.removeItem(UPLOAD_PREFERENCES_KEY);
    }
  }, []);

  return {
    // Site tracking
    lastSiteId,
    setLastSiteId,
    getSuggestedSite,

    // Filter preferences
    getFilterDefaults,
    setFilterDefaults,

    // Upload preferences
    uploadPrefs,
    updateUploadPrefs,

    // Utility
    clearAll,
  };
}

/**
 * Hook for remembering filter state on a specific page
 */
export function useRememberedFilters(pageKey: string, defaultFilters: Record<string, string> = {}) {
  const { getFilterDefaults, setFilterDefaults } = useSmartDefaults();
  const [filters, setFiltersState] = useState<Record<string, string>>(defaultFilters);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    const saved = getFilterDefaults(pageKey);
    if (Object.keys(saved).length > 0) {
      setFiltersState(prev => ({ ...prev, ...saved }));
    }
    setIsInitialized(true);
  }, [pageKey, getFilterDefaults]);

  // Save filters when they change
  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters);
    setFilterDefaults(pageKey, newFilters);
  }, [pageKey, setFilterDefaults]);

  // Update a single filter
  const updateFilter = useCallback((key: string, value: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, [key]: value };
      setFilterDefaults(pageKey, updated);
      return updated;
    });
  }, [pageKey, setFilterDefaults]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setFilterDefaults(pageKey, {});
  }, [defaultFilters, pageKey, setFilterDefaults]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    isInitialized,
  };
}

/**
 * Hook for suggesting the most relevant obligation when uploading evidence
 */
export function useSuggestedObligation(siteId?: string) {
  const [suggestedId, setSuggestedId] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, this would fetch the most urgent/relevant obligation
    // For now, we'll leave it as a placeholder that can be expanded
    setSuggestedId(null);
  }, [siteId]);

  return suggestedId;
}
