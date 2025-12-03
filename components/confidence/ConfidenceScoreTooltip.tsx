'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface ConfidenceScoreTooltipProps {
  score: number; // 0-1 or 0-100
  children?: React.ReactNode;
  showIcon?: boolean;
}

export default function ConfidenceScoreTooltip({
  score,
  children,
  showIcon = true,
}: ConfidenceScoreTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize score to 0-100
  const normalizedScore = score > 1 ? score : score * 100;
  const percentage = Math.round(normalizedScore);

  // Determine level and recommendations
  const getLevelInfo = () => {
    if (percentage >= 85) {
      return {
        level: 'High',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        message: 'High confidence - extraction is likely accurate',
        recommendation: 'No action required. This extraction can be used with confidence.',
      };
    } else if (percentage >= 70) {
      return {
        level: 'Medium',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        message: 'Medium confidence - extraction may require review',
        recommendation: 'Consider reviewing this extraction for accuracy. Manual verification recommended.',
      };
    } else {
      return {
        level: 'Low',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        message: 'Low confidence - extraction requires manual review',
        recommendation: 'Manual review required. This extraction should be verified before use.',
      };
    }
  };

  const levelInfo = getLevelInfo();

  return (
    <div className="relative inline-flex items-center">
      {children || (
        <button
          type="button"
          className="inline-flex items-center"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={() => setIsOpen(!isOpen)}
        >
          {showIcon && <Info className="h-4 w-4 text-gray-400" />}
        </button>
      )}
      
      {isOpen && (
        <div
          className={`absolute z-50 w-64 p-3 rounded-lg shadow-lg border ${levelInfo.bgColor} ${levelInfo.borderColor} bottom-full left-1/2 transform -translate-x-1/2 mb-2`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className={`text-sm font-semibold ${levelInfo.color} mb-1`}>
            Confidence Score: {percentage}% ({levelInfo.level})
          </div>
          <div className={`text-xs ${levelInfo.color} mb-2`}>
            {levelInfo.message}
          </div>
          <div className="text-xs text-gray-600 border-t pt-2 mt-2">
            <div className="font-medium mb-1">Recommendation:</div>
            <div>{levelInfo.recommendation}</div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Score breakdown: Pattern match (40%), Structure (30%), Semantic (20%), OCR (10%)
          </div>
        </div>
      )}
    </div>
  );
}
