'use client';

import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface ConfidenceScoreAlertBannerProps {
  threshold: number; // 0-1 or 0-100
  count: number;
  onDismiss?: () => void;
  onViewDetails?: () => void;
  severity?: 'low' | 'medium' | 'high';
}

export default function ConfidenceScoreAlertBanner({
  threshold,
  count,
  onDismiss,
  onViewDetails,
  severity = 'medium',
}: ConfidenceScoreAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Normalize threshold to 0-100
  const normalizedThreshold = threshold > 1 ? threshold : threshold * 100;
  const thresholdPercent = Math.round(normalizedThreshold);

  const getSeverityClasses = () => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-100 hover:bg-red-200 text-red-800',
        };
      case 'low':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          icon: 'text-amber-600',
          button: 'bg-amber-100 hover:bg-amber-200 text-amber-800',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
        };
    }
  };

  const classes = getSeverityClasses();

  if (dismissed || count === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`rounded-lg border ${classes.bg} ${classes.border} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${classes.icon} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <div className={`font-semibold ${classes.text} mb-1`}>
              Low Confidence Scores Detected
            </div>
            <div className={`text-sm ${classes.text}`}>
              {count} {count === 1 ? 'item has' : 'items have'} a confidence score below {thresholdPercent}%.
              {severity === 'high' && ' Manual review is required.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className={`px-3 py-1 rounded text-sm font-medium ${classes.button}`}
            >
              View Details
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`${classes.text} hover:opacity-70`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

