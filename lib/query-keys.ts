/**
 * Query Key Factory
 *
 * Centralized query key management for React Query
 * Ensures consistent cache invalidation and prevents stale data
 *
 * Benefits:
 * - Type-safe query keys
 * - Easy invalidation (invalidate entire entity or specific queries)
 * - Prevents typos and inconsistencies
 * - Self-documenting query structure
 */

export const queryKeys = {
  // ============================================
  // OBLIGATIONS
  // ============================================
  obligations: {
    all: ['obligations'] as const,
    lists: () => [...queryKeys.obligations.all, 'list'] as const,
    list: (filters: {
      siteId?: string;
      status?: string;
      reviewStatus?: string;
      moduleId?: string;
    }) => [...queryKeys.obligations.lists(), filters] as const,
    details: () => [...queryKeys.obligations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.obligations.details(), id] as const,
    statistics: () => [...queryKeys.obligations.all, 'statistics'] as const,
    siteStats: (siteId: string) => [...queryKeys.obligations.statistics(), siteId] as const,
  },

  // ============================================
  // DOCUMENTS
  // ============================================
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: {
      siteId?: string;
      documentType?: string;
      status?: string;
      moduleId?: string;
    }) => [...queryKeys.documents.lists(), filters] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
    extractionStatus: (id: string) => [...queryKeys.documents.detail(id), 'extraction-status'] as const,
    extractionResults: (id: string) => [...queryKeys.documents.detail(id), 'extraction-results'] as const,
  },

  // ============================================
  // SITES
  // ============================================
  sites: {
    all: ['sites'] as const,
    lists: () => [...queryKeys.sites.all, 'list'] as const,
    list: (filters?: { companyId?: string; status?: string }) =>
      [...queryKeys.sites.lists(), filters || {}] as const,
    details: () => [...queryKeys.sites.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sites.details(), id] as const,
    dashboard: (id: string) => [...queryKeys.sites.detail(id), 'dashboard'] as const,
  },

  // ============================================
  // EVIDENCE
  // ============================================
  evidence: {
    all: ['evidence'] as const,
    lists: () => [...queryKeys.evidence.all, 'list'] as const,
    list: (filters: { siteId?: string; obligationId?: string }) =>
      [...queryKeys.evidence.lists(), filters] as const,
    details: () => [...queryKeys.evidence.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.evidence.details(), id] as const,
    links: (obligationId: string) => [...queryKeys.evidence.all, 'links', obligationId] as const,
  },

  // ============================================
  // DEADLINES
  // ============================================
  deadlines: {
    all: ['deadlines'] as const,
    lists: () => [...queryKeys.deadlines.all, 'list'] as const,
    list: (filters: {
      siteId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }) => [...queryKeys.deadlines.lists(), filters] as const,
    details: () => [...queryKeys.deadlines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.deadlines.details(), id] as const,
    upcoming: (siteId: string, days: number) =>
      [...queryKeys.deadlines.all, 'upcoming', siteId, days] as const,
  },

  // ============================================
  // USERS
  // ============================================
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: { companyId?: string; role?: string }) =>
      [...queryKeys.users.lists(), filters || {}] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
  },

  // ============================================
  // ANALYTICS
  // ============================================
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    complianceScore: (siteId: string) =>
      [...queryKeys.analytics.all, 'compliance-score', siteId] as const,
    trends: (siteId: string, period: string) =>
      [...queryKeys.analytics.all, 'trends', siteId, period] as const,
    costSavings: () => [...queryKeys.analytics.all, 'cost-savings'] as const,
  },

  // ============================================
  // MODULES
  // ============================================
  modules: {
    all: ['modules'] as const,
    lists: () => [...queryKeys.modules.all, 'list'] as const,
    list: () => [...queryKeys.modules.lists()] as const,
    details: () => [...queryKeys.modules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.modules.details(), id] as const,
  },

  // ============================================
  // BACKGROUND JOBS
  // ============================================
  backgroundJobs: {
    all: ['background-jobs'] as const,
    lists: () => [...queryKeys.backgroundJobs.all, 'list'] as const,
    list: (filters?: { status?: string; jobType?: string }) =>
      [...queryKeys.backgroundJobs.lists(), filters || {}] as const,
    details: () => [...queryKeys.backgroundJobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.backgroundJobs.details(), id] as const,
  },

  // ============================================
  // ENHANCED FEATURES V2
  // ============================================

  // Evidence Gaps
  evidenceGaps: {
    all: ['evidence-gaps'] as const,
    lists: () => [...queryKeys.evidenceGaps.all, 'list'] as const,
    list: (filters?: { siteId?: string; severity?: string; status?: string }) =>
      [...queryKeys.evidenceGaps.lists(), filters || {}] as const,
    summary: (siteId?: string) => [...queryKeys.evidenceGaps.all, 'summary', siteId] as const,
  },

  // Risk Scores
  riskScores: {
    all: ['risk-scores'] as const,
    lists: () => [...queryKeys.riskScores.all, 'list'] as const,
    list: (filters?: { siteId?: string; scoreType?: string }) =>
      [...queryKeys.riskScores.lists(), filters || {}] as const,
    trends: (siteId?: string, period?: string) =>
      [...queryKeys.riskScores.all, 'trends', siteId, period] as const,
    factors: (siteId: string) => [...queryKeys.riskScores.all, 'factors', siteId] as const,
  },

  // Activity Feed
  activityFeed: {
    all: ['activity-feed'] as const,
    list: (filters?: { siteId?: string; entityType?: string; limit?: number }) =>
      [...queryKeys.activityFeed.all, 'list', filters || {}] as const,
  },

  // Costs
  costs: {
    all: ['costs'] as const,
    obligation: (obligationId: string) => [...queryKeys.costs.all, 'obligation', obligationId] as const,
    summary: (filters?: { siteId?: string; period?: string; groupBy?: string }) =>
      [...queryKeys.costs.all, 'summary', filters || {}] as const,
  },

  // Timeline
  timeline: {
    all: ['timeline'] as const,
    obligation: (obligationId: string) => [...queryKeys.timeline.all, 'obligation', obligationId] as const,
    site: (siteId: string) => [...queryKeys.timeline.all, 'site', siteId] as const,
  },

  // Trends
  trends: {
    all: ['trends'] as const,
    complianceScore: (filters?: { siteId?: string; period?: string }) =>
      [...queryKeys.trends.all, 'compliance-score', filters || {}] as const,
  },

  // Calendar / iCal
  calendar: {
    all: ['calendar'] as const,
    tokens: () => [...queryKeys.calendar.all, 'tokens'] as const,
  },

  // Webhooks
  webhooks: {
    all: ['webhooks'] as const,
    lists: () => [...queryKeys.webhooks.all, 'list'] as const,
    list: () => [...queryKeys.webhooks.lists()] as const,
    detail: (id: string) => [...queryKeys.webhooks.all, 'detail', id] as const,
    deliveries: (webhookId: string) => [...queryKeys.webhooks.all, 'deliveries', webhookId] as const,
  },

  // Forecasting
  forecasting: {
    all: ['forecasting'] as const,
    workload: (filters?: { siteId?: string; weeksAhead?: number }) =>
      [...queryKeys.forecasting.all, 'workload', filters || {}] as const,
    capacity: (filters?: { weeksAhead?: number; hoursPerWeek?: number }) =>
      [...queryKeys.forecasting.all, 'capacity', filters || {}] as const,
  },

  // Search
  search: {
    all: ['search'] as const,
    semantic: (query: string, filters?: { entityTypes?: string[] }) =>
      [...queryKeys.search.all, 'semantic', query, filters || {}] as const,
  },

  // User Activity Reports
  reports: {
    all: ['reports'] as const,
    userActivity: (filters?: { userId?: string; siteId?: string; period?: string }) =>
      [...queryKeys.reports.all, 'user-activity', filters || {}] as const,
  },

  // AI Features
  ai: {
    all: ['ai'] as const,
    evidenceSuggestions: (obligationId: string) =>
      [...queryKeys.ai.all, 'evidence-suggestions', obligationId] as const,
    draftResponse: (questionId: string) =>
      [...queryKeys.ai.all, 'draft-response', questionId] as const,
  },

  // Diff View
  diff: {
    all: ['diff'] as const,
    obligation: (obligationId: string, v1?: number, v2?: number) =>
      [...queryKeys.diff.all, 'obligation', obligationId, v1, v2] as const,
  },
};

/**
 * Query invalidation patterns
 *
 * Use these functions in mutation onSuccess callbacks to invalidate related queries
 */

export const invalidationPatterns = {
  /**
   * After creating/updating/deleting an obligation
   */
  onObligationChange: (siteId?: string) => [
    queryKeys.obligations.all,
    ...(siteId ? [queryKeys.sites.detail(siteId), queryKeys.sites.dashboard(siteId)] : []),
    queryKeys.analytics.all,
  ],

  /**
   * After creating/updating/deleting a document
   */
  onDocumentChange: (siteId?: string) => [
    queryKeys.documents.all,
    ...(siteId ? [queryKeys.sites.detail(siteId)] : []),
  ],

  /**
   * After document extraction completes
   */
  onExtractionComplete: (documentId: string, siteId: string) => [
    queryKeys.documents.detail(documentId),
    queryKeys.documents.extractionStatus(documentId),
    queryKeys.documents.extractionResults(documentId),
    queryKeys.obligations.list({ siteId }),
    queryKeys.sites.detail(siteId),
    queryKeys.sites.dashboard(siteId),
    queryKeys.analytics.all,
  ],

  /**
   * After creating/updating/deleting evidence
   */
  onEvidenceChange: (obligationId?: string, siteId?: string) => [
    queryKeys.evidence.all,
    ...(obligationId ? [queryKeys.evidence.links(obligationId), queryKeys.obligations.detail(obligationId)] : []),
    ...(siteId ? [queryKeys.sites.dashboard(siteId)] : []),
  ],

  /**
   * After creating/updating/deleting a deadline
   */
  onDeadlineChange: (siteId?: string) => [
    queryKeys.deadlines.all,
    ...(siteId ? [queryKeys.sites.detail(siteId), queryKeys.sites.dashboard(siteId)] : []),
    queryKeys.analytics.all,
  ],

  /**
   * After updating user profile
   */
  onUserProfileUpdate: (userId: string) => [
    queryKeys.users.detail(userId),
    queryKeys.users.current(),
  ],

  /**
   * After site update (affects many queries)
   */
  onSiteUpdate: (siteId: string) => [
    queryKeys.sites.detail(siteId),
    queryKeys.sites.dashboard(siteId),
    queryKeys.sites.lists(),
    queryKeys.obligations.list({ siteId }),
    queryKeys.documents.list({ siteId }),
    queryKeys.analytics.all,
  ],
};

/**
 * Example usage:
 *
 * // In a query hook
 * useQuery({
 *   queryKey: queryKeys.obligations.list({ siteId, status: 'PENDING' }),
 *   queryFn: () => fetchObligations({ siteId, status: 'PENDING' }),
 * });
 *
 * // In a mutation
 * const mutation = useMutation({
 *   mutationFn: updateObligation,
 *   onSuccess: (data, variables) => {
 *     // Invalidate all related queries
 *     invalidationPatterns.onObligationChange(variables.siteId).forEach(key => {
 *       queryClient.invalidateQueries({ queryKey: key });
 *     });
 *   },
 * });
 *
 * // Invalidate specific queries
 * queryClient.invalidateQueries({ queryKey: queryKeys.obligations.all }); // All obligations
 * queryClient.invalidateQueries({ queryKey: queryKeys.obligations.detail('ob-123') }); // Specific obligation
 * queryClient.invalidateQueries({ queryKey: queryKeys.obligations.list({ siteId: 'site-456' }) }); // Filtered list
 */
