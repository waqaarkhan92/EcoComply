'use client';

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
  // Normalize score to 0-100 if it's 0-1
  const normalizedScore = score > 1 ? score : score * 100;
  const percentage = Math.round(normalizedScore);

  // Determine color based on confidence level
  const getColorClasses = () => {
    if (percentage >= 85) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (percentage >= 70) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else {
      return 'bg-red-100 text-red-800 border-red-200';
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
      {percentage >= 85 ? 'High' : percentage >= 70 ? 'Medium' : 'Low'}
    </span>
  );
}
