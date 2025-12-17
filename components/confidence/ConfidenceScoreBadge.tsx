'use client';

import { CONFIDENCE_THRESHOLDS, getConfidenceLevel } from '@/lib/utils/status';

/**
 * @deprecated Use `ConfidenceBadge` from `@/components/ui/status-badge` instead.
 * This component is kept for backwards compatibility.
 *
 * Example migration:
 * ```tsx
 * // Before:
 * import ConfidenceScoreBadge from '@/components/confidence/ConfidenceScoreBadge';
 * <ConfidenceScoreBadge score={0.85} />
 *
 * // After:
 * import { ConfidenceBadge } from '@/components/ui/status-badge';
 * <ConfidenceBadge score={0.85} />
 * ```
 */
interface ConfidenceScoreBadgeProps {
  score: number; // 0-1 or 0-100
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'inline';
}

export default function ConfidenceScoreBadge({
  score,
  showPercentage = true,
  size = 'md',
  variant = 'badge',
}: ConfidenceScoreBadgeProps) {
  // Normalize score to 0-1 if it's 0-100
  const normalizedScore = score > 1 ? score / 100 : score;
  const percentage = Math.round(normalizedScore * 100);

  // Use centralized confidence level calculation
  const level = getConfidenceLevel(normalizedScore);

  // Determine color based on confidence level using centralized thresholds
  const getColorClasses = () => {
    switch (level) {
      case 'HIGH':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'VERY_LOW':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
      case 'VERY_LOW':
        return 'Very Low';
      default:
        return 'Unknown';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-base px-3 py-1.5';
      default:
        return 'text-sm px-2.5 py-1';
    }
  };

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1 ${getSizeClasses()}`}>
        <span className={`w-2 h-2 rounded-full ${getColorClasses().split(' ')[0]}`}></span>
        {showPercentage && <span>{percentage}%</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${getColorClasses()} ${getSizeClasses()}`}
    >
      <span className="font-semibold">{percentage}%</span>
      {getLevelLabel()}
    </span>
  );
}
