'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';

interface ComparisonItem {
  id: string;
  label: string;
  score: number;
}

interface Comparison {
  label: string;
  score: number;
  items: ComparisonItem[];
}

interface ConfidenceScoreComparisonViewProps {
  comparisons: Comparison[];
  showDiff?: boolean;
  highlightImprovements?: boolean;
}

export default function ConfidenceScoreComparisonView({
  comparisons,
  showDiff = true,
  highlightImprovements = true,
}: ConfidenceScoreComparisonViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedComparison, setExpandedComparison] = useState<string | null>(null);

  // Normalize scores to 0-100
  const normalizedComparisons = comparisons.map(comp => ({
    ...comp,
    normalizedScore: comp.score > 1 ? comp.score : comp.score * 100,
    normalizedItems: comp.items.map(item => ({
      ...item,
      normalizedScore: item.score > 1 ? item.score : item.score * 100,
    })),
  }));

  // Calculate differences between comparisons
  const calculateDiff = (current: number, previous: number) => {
    return current - previous;
  };

  // Get color for score
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  // Get bar color
  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const toggleComparison = (label: string) => {
    setExpandedComparison(expandedComparison === label ? null : label);
  };

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confidence Score Comparison</h3>
        {showDiff && normalizedComparisons.length === 2 && (
          <div className="text-sm text-gray-600">
            Comparing {normalizedComparisons[0].label} vs {normalizedComparisons[1].label}
          </div>
        )}
      </div>

      {/* Comparison bars */}
      <div className="space-y-4">
        {normalizedComparisons.map((comparison, index) => {
          const score = Math.round(comparison.normalizedScore);
          const previousComparison = index > 0 ? normalizedComparisons[index - 1] : null;
          const diff = previousComparison
            ? calculateDiff(comparison.normalizedScore, previousComparison.normalizedScore)
            : 0;
          const isImprovement = diff > 0;
          const isExpanded = expandedComparison === comparison.label;

          return (
            <div key={comparison.label} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleComparison(comparison.label)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                  <div>
                    <div className="font-semibold text-gray-900">{comparison.label}</div>
                    {comparison.items.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {comparison.items.length} {comparison.items.length === 1 ? 'item' : 'items'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {showDiff && previousComparison && (
                    <div className={`flex items-center gap-1 ${
                      highlightImprovements
                        ? isImprovement
                          ? 'text-green-600'
                          : diff < 0
                          ? 'text-red-600'
                          : 'text-gray-600'
                        : 'text-gray-600'
                    }`}>
                      {diff > 0 && <ArrowUp className="h-4 w-4" />}
                      {diff < 0 && <ArrowDown className="h-4 w-4" />}
                      {diff === 0 && <Minus className="h-4 w-4" />}
                      <span className="text-sm font-medium">
                        {diff > 0 ? '+' : ''}{Math.round(diff)}%
                      </span>
                    </div>
                  )}
                  <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                    {score}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-6 rounded-full transition-all duration-500 ${getBarColor(score)}`}
                    style={{ width: `${score}%` }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                      {score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Item-level breakdown */}
              {isExpanded && comparison.normalizedItems.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Item-Level Breakdown:
                  </div>
                  {comparison.normalizedItems.map((item, itemIndex) => {
                    const itemScore = Math.round(item.normalizedScore);
                    const previousItem = index > 0 && normalizedComparisons[index - 1]?.normalizedItems.find(
                      i => i.id === item.id
                    );
                    const itemDiff = previousItem
                      ? calculateDiff(item.normalizedScore, previousItem.normalizedScore)
                      : 0;
                    const itemIsExpanded = expandedItems.has(item.id);
                    const itemIsImprovement = itemDiff > 0;

                    return (
                      <div key={item.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleItem(item.id)}
                            className="flex items-center gap-2 flex-1 text-left"
                          >
                            {itemIsExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">{item.label}</span>
                          </button>
                          <div className="flex items-center gap-3">
                            {showDiff && previousItem && (
                              <div className={`flex items-center gap-1 text-xs ${
                                highlightImprovements
                                  ? itemIsImprovement
                                    ? 'text-green-600'
                                    : itemDiff < 0
                                    ? 'text-red-600'
                                    : 'text-gray-600'
                                  : 'text-gray-600'
                              }`}>
                                {itemDiff > 0 && <ArrowUp className="h-3 w-3" />}
                                {itemDiff < 0 && <ArrowDown className="h-3 w-3" />}
                                {itemDiff === 0 && <Minus className="h-3 w-3" />}
                                <span>{itemDiff > 0 ? '+' : ''}{Math.round(itemDiff)}%</span>
                              </div>
                            )}
                            <span className={`text-sm font-semibold ${getScoreColor(itemScore)}`}>
                              {itemScore}%
                            </span>
                          </div>
                        </div>
                        {itemIsExpanded && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                              <div
                                className={`h-4 rounded-full transition-all ${getBarColor(itemScore)}`}
                                style={{ width: `${itemScore}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary statistics */}
      {normalizedComparisons.length === 2 && showDiff && (
        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {Math.round(normalizedComparisons[1].normalizedScore - normalizedComparisons[0].normalizedScore)}%
              </div>
              <div className="text-sm text-gray-600">Overall Change</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {normalizedComparisons[1].normalizedItems.filter((item, idx) => {
                  const prevItem = normalizedComparisons[0].normalizedItems[idx];
                  return prevItem && item.normalizedScore > prevItem.normalizedScore;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Improved Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {normalizedComparisons[1].normalizedItems.filter((item, idx) => {
                  const prevItem = normalizedComparisons[0].normalizedItems[idx];
                  return prevItem && item.normalizedScore < prevItem.normalizedScore;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Decreased Items</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

