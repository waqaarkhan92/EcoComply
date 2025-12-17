'use client';

/**
 * Risk Score Card
 * Displays compliance risk score with gauge visualization
 */

import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useRiskScores, useRiskScoreTrends, RiskScore } from '@/lib/hooks/use-enhanced-features';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface RiskScoreCardProps {
  siteId?: string;
  showTrend?: boolean;
  compact?: boolean;
}

const riskLevelConfig = {
  LOW: { color: 'text-green-600', bg: 'bg-green-100', icon: ShieldCheck, label: 'Low Risk' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Shield, label: 'Medium Risk' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100', icon: ShieldAlert, label: 'High Risk' },
  CRITICAL: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Critical Risk' },
};

export function RiskScoreCard({ siteId, showTrend = true, compact = false }: RiskScoreCardProps) {
  const { data: scores, isLoading: scoresLoading } = useRiskScores({
    siteId,
    scoreType: siteId ? 'SITE' : 'COMPANY',
  });
  const { data: trendsData, isLoading: trendsLoading } = useRiskScoreTrends(siteId, '30d');

  if (scoresLoading) {
    return <RiskScoreCardSkeleton compact={compact} />;
  }

  const currentScore = scores?.[0];

  if (!currentScore) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Score</h3>
        <p className="text-gray-500">No risk score available</p>
      </div>
    );
  }

  const config = riskLevelConfig[currentScore.risk_level];
  const Icon = config.icon;

  // Calculate trend from history
  const trends = trendsData?.trends || [];
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  let trendValue = 0;

  if (trends.length >= 2) {
    const oldScore = trends[0].score;
    const newScore = trends[trends.length - 1].score;
    trendValue = newScore - oldScore;
    if (trendValue > 5) trendDirection = 'up';
    else if (trendValue < -5) trendDirection = 'down';
  }

  if (compact) {
    return (
      <Link href="/dashboard/risk-scores" className="block">
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Risk Score</p>
                <p className={`text-2xl font-bold ${config.color}`}>{currentScore.risk_score}</p>
              </div>
            </div>
            {showTrend && trendDirection !== 'stable' && (
              <div className={`flex items-center gap-1 ${trendDirection === 'down' ? 'text-green-600' : 'text-red-600'}`}>
                {trendDirection === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">{Math.abs(trendValue)}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Risk Score</h3>
        <Link href="/dashboard/risk-scores" className="text-sm text-primary hover:underline">
          View details
        </Link>
      </div>

      <div className="flex items-center justify-center mb-6">
        <RiskGauge score={currentScore.risk_score} level={currentScore.risk_level} />
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className={`font-medium ${config.color}`}>{config.label}</span>
        </div>

        {showTrend && !trendsLoading && (
          <TrendIndicator direction={trendDirection} value={trendValue} />
        )}
      </div>

      {currentScore.factors && Object.keys(currentScore.factors).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">Contributing Factors</p>
          <div className="space-y-2">
            {Object.entries(currentScore.factors)
              .filter(([_, value]) => typeof value === 'number' && value > 0)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{value as number}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const config = riskLevelConfig[level as keyof typeof riskLevelConfig];
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-48 h-24">
      {/* Background arc */}
      <svg className="w-full h-full" viewBox="0 0 200 100">
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored arc based on score */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 283} 283`}
          className={config.color}
        />
      </svg>

      {/* Center score */}
      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <span className={`text-4xl font-bold ${config.color}`}>{score}</span>
      </div>
    </div>
  );
}

function TrendIndicator({ direction, value }: { direction: 'up' | 'down' | 'stable'; value: number }) {
  if (direction === 'stable') {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-4 h-4" />
        <span className="text-sm">Stable</span>
      </div>
    );
  }

  // For risk scores, down is good (lower risk)
  const isPositive = direction === 'down';
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {direction === 'up' ? '+' : '-'}{Math.abs(value)} pts
      </span>
    </div>
  );
}

function RiskScoreCardSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-16 mb-1" />
            <Skeleton className="h-8 w-12" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-center mb-6">
        <Skeleton className="w-48 h-24 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

export default RiskScoreCard;
