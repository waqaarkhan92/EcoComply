'use client';

interface ConfidenceScoreInlineIndicatorProps {
  score: number; // 0-1 or 0-100
  showLabel?: boolean;
  compact?: boolean;
}

export default function ConfidenceScoreInlineIndicator({
  score,
  showLabel = true,
  compact = false,
}: ConfidenceScoreInlineIndicatorProps) {
  // Normalize score to 0-100
  const normalizedScore = score > 1 ? score : score * 100;
  const percentage = Math.round(normalizedScore);

  // Determine color based on confidence level
  const getColor = () => {
    if (percentage >= 85) {
      return {
        dot: 'bg-green-500',
        text: 'text-green-700',
      };
    } else if (percentage >= 70) {
      return {
        dot: 'bg-amber-500',
        text: 'text-amber-700',
      };
    } else {
      return {
        dot: 'bg-red-500',
        text: 'text-red-700',
      };
    }
  };

  const colors = getColor();
  const level = percentage >= 85 ? 'High' : percentage >= 70 ? 'Medium' : 'Low';

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${colors.dot}`}></span>
        {showLabel && <span className={`text-xs font-medium ${colors.text}`}>{percentage}%</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`}></span>
      {showLabel && (
        <span className={`text-sm font-medium ${colors.text}`}>
          {percentage}% ({level})
        </span>
      )}
    </span>
  );
}

