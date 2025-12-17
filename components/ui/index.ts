/**
 * UI Component Library
 *
 * Central export for all UI components
 */

// =============================================================================
// CORE COMPONENTS
// =============================================================================

export { Button } from './button';
export type { ButtonProps } from './button';

export { Input } from './input';

export { Badge } from './badge';

export { Checkbox } from './checkbox';

export { Dropdown } from './dropdown';

export { Modal } from './modal';

export { Textarea } from './textarea';

export { Tooltip } from './tooltip';

// =============================================================================
// LOADING & FEEDBACK
// =============================================================================

export { Spinner, Skeleton, LoadingOverlay } from './loading';
export { SkeletonStats } from './skeleton';

export { EmptyState } from './empty-state';

export { Toast } from './toast';
export { useToast } from '@/lib/hooks/use-toast';

// =============================================================================
// NAVIGATION
// =============================================================================

export { Breadcrumbs, useBreadcrumbsFromPath } from './breadcrumbs';
export type { BreadcrumbItem } from './breadcrumbs';

// =============================================================================
// PAGE LAYOUT
// =============================================================================

export { PageHeader, PageHeaderWithStats } from './page-header';

// =============================================================================
// FORMS & FILTERS
// =============================================================================

export { Select } from './select';
export type { SelectOption } from './select';

export { FilterBar, ViewToggle, ActiveFilters } from './filter-bar';
export type { FilterConfig, FilterValues } from './filter-bar';

// =============================================================================
// DATA DISPLAY
// =============================================================================

export {
  StatusBadge,
  ComplianceStatusBadge,
  ObligationStatusBadge,
  TaskStatusBadge,
  PackStatusBadge,
  UrgencyBadge,
  StatusDot,
  // Ingestion-related badges
  ReviewStatusBadge,
  ConfidenceBadge,
  ExtractionStatusBadge,
  ConditionTypeBadge,
  // Traffic light indicators (Ingestion UI Spec)
  TrafficLight,
  TrafficLightStack,
  getTrafficLightFromScore,
  getTrafficLightFromConfidence,
  getTrafficLightFromDaysRemaining,
} from './status-badge';
export type { TrafficLightStatus } from './status-badge';

export {
  StatCard,
  StatCardGrid,
  CompactStat,
  HeroStat,
} from './stat-card';

// =============================================================================
// ACTIONS
// =============================================================================

export { ActionCard, ActionCardGrid } from './action-card';
