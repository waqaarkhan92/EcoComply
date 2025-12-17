/**
 * React Query Hooks for Enhanced Features V2
 * Reference: docs/specs/90_Enhanced_Features_V2.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

// ============================================
// Types
// ============================================

export interface EvidenceGap {
  id: string;
  site_id: string;
  obligation_id: string;
  deadline_id: string | null;
  gap_type: 'NO_EVIDENCE' | 'EXPIRED_EVIDENCE' | 'INSUFFICIENT_EVIDENCE';
  days_until_deadline: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detected_at: string;
  resolved_at: string | null;
  obligation?: {
    title: string;
    frequency: string;
  };
  site?: {
    name: string;
  };
}

export interface EvidenceGapSummary {
  total: number;
  by_severity: Record<string, number>;
  by_gap_type: Record<string, number>;
  by_site: { site_id: string; site_name: string; count: number }[];
}

export interface RiskScore {
  id: string;
  site_id: string | null;
  obligation_id: string | null;
  score_type: 'SITE' | 'OBLIGATION' | 'COMPANY';
  risk_score: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  factors: Record<string, any>;
  calculated_at: string;
  site?: { name: string };
}

export interface RiskTrend {
  date: string;
  score: number;
  level: string;
}

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  summary: string;
  metadata: Record<string, any>;
  created_at: string;
  user?: { full_name: string; avatar_url?: string };
}

export interface ObligationCost {
  id: string;
  obligation_id: string;
  cost_type: string;
  amount: number;
  currency: string;
  description: string | null;
  incurred_date: string;
  created_at: string;
}

export interface CostSummary {
  total: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  count: number;
  breakdown: Record<string, any>;
  group_by: string;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  user?: { full_name: string };
}

export interface ComplianceTrend {
  date: string;
  score: number;
  obligations_total: number;
  obligations_compliant: number;
}

export interface CalendarToken {
  id: string;
  token: string;
  token_type: 'USER' | 'SITE';
  site_id: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  feed_url?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  retry_count: number;
  timeout_ms: number;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, any>;
  response_status: number | null;
  delivered_at: string | null;
  failed_at: string | null;
  retry_count: number;
  created_at: string;
}

export interface WorkloadForecast {
  forecast: {
    week_start: string;
    deadline_count: number;
    estimated_hours: number;
    deadlines: any[];
  }[];
  summary: {
    weeks_ahead: number;
    total_deadlines: number;
    total_estimated_hours: number;
    average_hours_per_week: number;
  };
}

export interface CapacityAnalysis {
  capacity: {
    team_members: number;
    hours_per_week: number;
    weeks_ahead: number;
    total_capacity_hours: number;
  };
  workload: {
    deadline_count: number;
    estimated_hours: number;
    average_hours_per_deadline: number;
  };
  analysis: {
    utilization_rate: number;
    capacity_status: 'UNDER_CAPACITY' | 'OPTIMAL' | 'AT_RISK' | 'OVER_CAPACITY';
    surplus_hours: number;
    deficit_hours: number;
  };
  recommendations: string[];
}

export interface SemanticSearchResult {
  entity_type: string;
  entity_id: string;
  title: string;
  content_preview: string;
  similarity_score: number;
  metadata: Record<string, any>;
}

export interface EvidenceSuggestion {
  id: string;
  obligation_id: string;
  suggestions: {
    evidence_type: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
  }[];
  confidence: number;
  generated_at: string;
}

export interface DraftResponse {
  question_id: string;
  draft_response: string;
  evidence_suggestions: {
    id: string;
    file_name: string;
    evidence_type: string;
    relevance: string;
  }[];
  context_used: {
    obligations_count: number;
    evidence_count: number;
  };
  generated_at: string;
  disclaimer: string;
}

export interface UserActivityReport {
  user_id: string;
  user_name: string;
  user_email: string;
  period: { start: string; end: string };
  totals: {
    total_actions: number;
    obligations_completed: number;
    evidence_uploaded: number;
    audit_log_entries: number;
  };
  by_activity_type: Record<string, number>;
  by_day: { date: string; count: number }[];
}

// ============================================
// Evidence Gaps Hooks
// ============================================

export function useEvidenceGaps(filters?: { siteId?: string; severity?: string }) {
  return useQuery({
    queryKey: queryKeys.evidenceGaps.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.severity) params.set('severity', filters.severity);
      const response = await apiClient.get<EvidenceGap[]>(`/evidence-gaps?${params}`);
      return response.data;
    },
  });
}

export function useEvidenceGapsSummary(siteId?: string) {
  return useQuery({
    queryKey: queryKeys.evidenceGaps.summary(siteId),
    queryFn: async () => {
      const params = siteId ? `?site_id=${siteId}` : '';
      const response = await apiClient.get<EvidenceGapSummary>(`/evidence-gaps/summary${params}`);
      return response.data;
    },
  });
}

export function useDismissEvidenceGap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gapId, reason }: { gapId: string; reason?: string }) => {
      const response = await apiClient.post(`/evidence-gaps/${gapId}/dismiss`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evidenceGaps.all });
    },
  });
}

// ============================================
// Risk Scores Hooks
// ============================================

export function useRiskScores(filters?: { siteId?: string; scoreType?: string }) {
  return useQuery({
    queryKey: queryKeys.riskScores.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.scoreType) params.set('score_type', filters.scoreType);
      const response = await apiClient.get<RiskScore[]>(`/risk-scores?${params}`);
      return response.data;
    },
  });
}

export function useRiskScoreTrends(siteId?: string, period?: string) {
  return useQuery({
    queryKey: queryKeys.riskScores.trends(siteId, period),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteId) params.set('site_id', siteId);
      if (period) params.set('period', period);
      const response = await apiClient.get<{ trends: RiskTrend[] }>(`/risk-scores/trends?${params}`);
      return response.data;
    },
  });
}

// ============================================
// Activity Feed Hooks
// ============================================

export function useActivityFeed(filters?: { siteId?: string; entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.activityFeed.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.entityType) params.set('entity_type', filters.entityType);
      if (filters?.limit) params.set('limit', filters.limit.toString());
      const response = await apiClient.get<ActivityFeedItem[]>(`/activity-feed?${params}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============================================
// Cost Tracking Hooks
// ============================================

export function useObligationCosts(obligationId: string) {
  return useQuery({
    queryKey: queryKeys.costs.obligation(obligationId),
    queryFn: async () => {
      const response = await apiClient.get<ObligationCost[]>(`/obligations/${obligationId}/costs`);
      return response.data;
    },
    enabled: !!obligationId,
  });
}

export function useAddObligationCost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ obligationId, ...data }: { obligationId: string; cost_type: string; amount: number; description?: string; incurred_date: string }) => {
      const response = await apiClient.post(`/obligations/${obligationId}/costs`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.costs.obligation(variables.obligationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.costs.summary() });
    },
  });
}

export function useCostSummary(filters?: { siteId?: string; period?: string; groupBy?: string }) {
  return useQuery({
    queryKey: queryKeys.costs.summary(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.period) params.set('period', filters.period);
      if (filters?.groupBy) params.set('group_by', filters.groupBy);
      const response = await apiClient.get<CostSummary>(`/costs/summary?${params}`);
      return response.data;
    },
  });
}

// ============================================
// Timeline Hooks
// ============================================

export function useObligationTimeline(obligationId: string) {
  return useQuery({
    queryKey: queryKeys.timeline.obligation(obligationId),
    queryFn: async () => {
      const response = await apiClient.get<TimelineEvent[]>(`/obligations/${obligationId}/timeline`);
      return response.data;
    },
    enabled: !!obligationId,
  });
}

// ============================================
// Trends Hooks
// ============================================

export function useComplianceTrends(filters?: { siteId?: string; period?: string }) {
  return useQuery({
    queryKey: queryKeys.trends.complianceScore(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.period) params.set('period', filters.period);
      const response = await apiClient.get<{ trends: ComplianceTrend[] }>(`/trends/compliance-score?${params}`);
      return response.data;
    },
  });
}

// ============================================
// Calendar / iCal Hooks
// ============================================

export function useCalendarTokens() {
  return useQuery({
    queryKey: queryKeys.calendar.tokens(),
    queryFn: async () => {
      const response = await apiClient.get<CalendarToken[]>('/calendar/tokens');
      return response.data;
    },
  });
}

export function useCreateCalendarToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { token_type: 'USER' | 'SITE'; site_id?: string }) => {
      const response = await apiClient.post<CalendarToken>('/calendar/tokens', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.tokens() });
    },
  });
}

export function useRevokeCalendarToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      await apiClient.delete(`/calendar/tokens/${tokenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.tokens() });
    },
  });
}

// ============================================
// Webhook Hooks
// ============================================

export function useWebhooks() {
  return useQuery({
    queryKey: queryKeys.webhooks.list(),
    queryFn: async () => {
      const response = await apiClient.get<Webhook[]>('/webhooks');
      return response.data;
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Webhook>) => {
      const response = await apiClient.post<Webhook>('/webhooks', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Webhook>) => {
      const response = await apiClient.put<Webhook>(`/webhooks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.webhooks.all });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await apiClient.post(`/webhooks/${webhookId}/test`);
      return response.data;
    },
  });
}

export function useWebhookDeliveries(webhookId: string) {
  return useQuery({
    queryKey: queryKeys.webhooks.deliveries(webhookId),
    queryFn: async () => {
      const response = await apiClient.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`);
      return response.data;
    },
    enabled: !!webhookId,
  });
}

// ============================================
// Forecasting Hooks
// ============================================

export function useWorkloadForecast(filters?: { siteId?: string; weeksAhead?: number }) {
  return useQuery({
    queryKey: queryKeys.forecasting.workload(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.weeksAhead) params.set('weeks_ahead', filters.weeksAhead.toString());
      const response = await apiClient.get<WorkloadForecast>(`/forecasting/workload?${params}`);
      return response.data;
    },
  });
}

export function useCapacityAnalysis(filters?: { weeksAhead?: number; hoursPerWeek?: number }) {
  return useQuery({
    queryKey: queryKeys.forecasting.capacity(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.weeksAhead) params.set('weeks_ahead', filters.weeksAhead.toString());
      if (filters?.hoursPerWeek) params.set('hours_per_week', filters.hoursPerWeek.toString());
      const response = await apiClient.get<CapacityAnalysis>(`/forecasting/capacity?${params}`);
      return response.data;
    },
  });
}

// ============================================
// Search Hooks
// ============================================

export function useSemanticSearch(query: string, filters?: { entityTypes?: string[] }) {
  return useQuery({
    queryKey: queryKeys.search.semantic(query, filters),
    queryFn: async () => {
      const response = await apiClient.post<{ results: SemanticSearchResult[] }>('/search/semantic', {
        query,
        entity_types: filters?.entityTypes,
      });
      return response.data;
    },
    enabled: query.length >= 3,
  });
}

// ============================================
// User Activity Reports Hooks
// ============================================

export function useUserActivityReport(filters?: { userId?: string; siteId?: string; period?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.userActivity(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.userId) params.set('user_id', filters.userId);
      if (filters?.siteId) params.set('site_id', filters.siteId);
      if (filters?.period) params.set('period', filters.period);
      const response = await apiClient.get<UserActivityReport>(`/reports/user-activity?${params}`);
      return response.data;
    },
  });
}

// ============================================
// AI Features Hooks
// ============================================

export function useEvidenceSuggestions(obligationId: string) {
  return useQuery({
    queryKey: queryKeys.ai.evidenceSuggestions(obligationId),
    queryFn: async () => {
      const response = await apiClient.get<EvidenceSuggestion>(`/obligations/${obligationId}/evidence-suggestions`);
      return response.data;
    },
    enabled: !!obligationId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useAnalyzeEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (obligationId: string) => {
      const response = await apiClient.post<EvidenceSuggestion>(`/obligations/${obligationId}/analyze-evidence`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.ai.evidenceSuggestions(data.obligation_id), data);
    },
  });
}

export function useGenerateDraftResponse() {
  return useMutation({
    mutationFn: async (questionId: string) => {
      const response = await apiClient.post<DraftResponse>(`/regulator-questions/${questionId}/draft-response`);
      return response.data;
    },
  });
}

// ============================================
// Diff View Hooks
// ============================================

export function useObligationDiff(obligationId: string, v1?: number, v2?: number) {
  return useQuery({
    queryKey: queryKeys.diff.obligation(obligationId, v1, v2),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (v1) params.set('v1', v1.toString());
      if (v2) params.set('v2', v2.toString());
      const response = await apiClient.get<{ diff: any; v1: any; v2: any }>(`/obligations/${obligationId}/diff?${params}`);
      return response.data;
    },
    enabled: !!obligationId,
  });
}
