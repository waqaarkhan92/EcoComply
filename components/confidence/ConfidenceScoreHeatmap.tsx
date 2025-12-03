'use client';

import { useState } from 'react';

interface HeatmapDataItem {
  x: string;
  y: string;
  score: number;
  count?: number;
}

interface ConfidenceScoreHeatmapProps {
  data: HeatmapDataItem[];
  xLabel?: string;
  yLabel?: string;
  showTooltip?: boolean;
  onClick?: (x: string, y: string) => void;
}

export default function ConfidenceScoreHeatmap({
  data,
  xLabel = 'Category',
  yLabel = 'Module',
  showTooltip = true,
  onClick,
}: ConfidenceScoreHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string } | null>(null);

  // Normalize scores to 0-100
  const normalizedData = data.map(item => ({
    ...item,
    normalizedScore: item.score > 1 ? item.score * 100 : item.score * 100,
  }));

  // Get unique x and y values
  const xValues = [...new Set(normalizedData.map(item => item.x))].sort();
  const yValues = [...new Set(normalizedData.map(item => item.y))].sort();

  // Create a map for quick lookup
  const dataMap = new Map<string, HeatmapDataItem & { normalizedScore: number }>();
  normalizedData.forEach(item => {
    dataMap.set(`${item.x}-${item.y}`, item);
  });

  // Get color for score
  const getColor = (score: number) => {
    if (score >= 85) return { bg: 'bg-green-500', text: 'text-green-900' };
    if (score >= 75) return { bg: 'bg-green-400', text: 'text-green-900' };
    if (score >= 70) return { bg: 'bg-yellow-400', text: 'text-yellow-900' };
    if (score >= 60) return { bg: 'bg-orange-400', text: 'text-orange-900' };
    return { bg: 'bg-red-500', text: 'text-red-900' };
  };

  // Get cell data
  const getCellData = (x: string, y: string) => {
    return dataMap.get(`${x}-${y}`) || null;
  };

  // Calculate cell size based on count (if available)
  const maxCount = Math.max(...normalizedData.map(item => item.count || 1));
  const minSize = 40;
  const maxSize = 80;

  const getCellSize = (count?: number) => {
    if (!count) return minSize;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

  const hoveredData = hoveredCell ? getCellData(hoveredCell.x, hoveredCell.y) : null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Confidence Score Heatmap</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>High (85-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded"></div>
            <span>Medium (70-84%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Low (&lt;70%)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Y-axis labels */}
          <div className="flex">
            <div className="w-32 flex-shrink-0"></div>
            <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${xValues.length}, minmax(60px, 1fr))` }}>
              {xValues.map(x => (
                <div key={x} className="text-sm font-medium text-gray-700 text-center">
                  {x}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col gap-2 mt-2">
            {yValues.map(y => (
              <div key={y} className="flex items-center gap-2">
                {/* Y-axis label */}
                <div className="w-32 flex-shrink-0 text-sm font-medium text-gray-700">
                  {y}
                </div>
                
                {/* Cells */}
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${xValues.length}, minmax(60px, 1fr))` }}>
                  {xValues.map(x => {
                    const cellData = getCellData(x, y);
                    const score = cellData?.normalizedScore || 0;
                    const count = cellData?.count || 0;
                    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                    const colors = getColor(score);
                    const cellSize = getCellSize(count);

                    if (!cellData) {
                      return (
                        <div
                          key={`${x}-${y}`}
                          className="bg-gray-100 rounded aspect-square flex items-center justify-center"
                          style={{ minHeight: minSize, minWidth: minSize }}
                        >
                          <span className="text-xs text-gray-400">-</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${x}-${y}`}
                        className={`${colors.bg} rounded flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isHovered ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        }`}
                        style={{ 
                          minHeight: cellSize, 
                          minWidth: cellSize,
                          height: cellSize,
                          width: cellSize,
                        }}
                        onMouseEnter={() => setHoveredCell({ x, y })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onClick?.(x, y)}
                      >
                        <span className={`text-sm font-semibold ${colors.text}`}>
                          {Math.round(score)}%
                        </span>
                        {count > 1 && (
                          <span className={`text-xs ${colors.text} opacity-75`}>
                            ({count})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && hoveredData && hoveredCell && (
        <div className="mt-4 p-3 bg-gray-900 text-white rounded-lg">
          <div className="text-sm font-semibold mb-1">
            {xLabel}: {hoveredCell.x} | {yLabel}: {hoveredCell.y}
          </div>
          <div className="text-xs">
            Average Confidence: {Math.round(hoveredData.normalizedScore)}%
          </div>
          {hoveredData.count && (
            <div className="text-xs">
              Items: {hoveredData.count}
            </div>
          )}
        </div>
      )}

      {/* Labels */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-600">
        <div>{yLabel}</div>
        <div>{xLabel}</div>
      </div>
    </div>
  );
}

