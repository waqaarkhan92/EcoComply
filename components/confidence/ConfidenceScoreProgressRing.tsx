'use client';

interface ConfidenceScoreProgressRingProps {
  score: number; // 0-1 or 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export default function ConfidenceScoreProgressRing({
  score,
  size = 60,
  strokeWidth = 6,
  showLabel = true,
  animated = true,
}: ConfidenceScoreProgressRingProps) {
  // Normalize score to 0-1
  const normalizedScore = score > 1 ? score / 100 : score;
  const percentage = Math.round(normalizedScore * 100);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - normalizedScore * circumference;

  // Determine color based on confidence level
  const getColor = () => {
    if (percentage >= 85) {
      return '#10b981'; // green-500
    } else if (percentage >= 70) {
      return '#f59e0b'; // amber-500
    } else {
      return '#ef4444'; // red-500
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={animated ? 'transition-all duration-500 ease-in-out' : ''}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold" style={{ color: getColor() }}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

