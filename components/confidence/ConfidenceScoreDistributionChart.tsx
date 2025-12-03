'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ScoreItem {
  id: string;
  score: number;
  label?: string;
  type?: string;
}

interface ConfidenceScoreDistributionChartProps {
  scores: ScoreItem[];
  groupBy?: 'type' | 'category' | 'none';
  showStatistics?: boolean;
  onItemClick?: (itemId: string) => void;
}

export default function ConfidenceScoreDistributionChart({
  scores,
  groupBy = 'none',
  showStatistics = true,
  onItemClick,
}: ConfidenceScoreDistributionChartProps) {
  const [viewMode, setViewMode] = useState<'histogram' | 'scatter'>('histogram');

  // Normalize scores to 0-100
  const normalizedScores = scores.map(item => ({
    ...item,
    normalizedScore: item.score > 1 ? item.score : item.score * 100,
  }));

  // Calculate statistics
  const calculateStats = () => {
    const scoreValues = normalizedScores.map(item => item.normalizedScore);
    const sum = scoreValues.reduce((a, b) => a + b, 0);
    const mean = sum / scoreValues.length;
    const sorted = [...scoreValues].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = scoreValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / scoreValues.length;
    const stdDev = Math.sqrt(variance);

    const high = scoreValues.filter(s => s >= 85).length;
    const medium = scoreValues.filter(s => s >= 70 && s < 85).length;
    const low = scoreValues.filter(s => s < 70).length;

    return { mean, median, stdDev, high, medium, low, total: scoreValues.length };
  };

  // Create histogram buckets
  const createHistogramData = () => {
    const buckets = [
      { range: '0-50%', min: 0, max: 50, count: 0, color: '#ef4444' },
      { range: '50-70%', min: 50, max: 70, count: 0, color: '#f59e0b' },
      { range: '70-85%', min: 70, max: 85, count: 0, color: '#eab308' },
      { range: '85-100%', min: 85, max: 100, count: 0, color: '#10b981' },
    ];

    normalizedScores.forEach(item => {
      const score = item.normalizedScore;
      for (const bucket of buckets) {
        if (score >= bucket.min && score < (bucket.max === 100 ? 101 : bucket.max)) {
          bucket.count++;
          break;
        }
      }
    });

    return buckets;
  };

  // Group scores by type/category
  const groupedData = groupBy !== 'none'
    ? normalizedScores.reduce((acc, item) => {
        const key = item[groupBy as keyof ScoreItem] || 'Unknown';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {} as Record<string, typeof normalizedScores>)
    : {};

  const histogramData = createHistogramData();
  const stats = calculateStats();

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confidence Score Distribution</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('histogram')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'histogram'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Histogram
          </button>
          <button
            onClick={() => setViewMode('scatter')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'scatter'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Scatter
          </button>
        </div>
      </div>

      {viewMode === 'histogram' && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" name="Count">
              {histogramData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {viewMode === 'scatter' && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={normalizedScores.map((item, index) => ({ 
            index, 
            score: item.normalizedScore,
            label: item.label || item.id.substring(0, 8),
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis domain={[0, 100]} label={{ value: 'Confidence Score (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              formatter={(value: number) => `${Math.round(value)}%`}
              labelFormatter={(label) => `Item: ${label}`}
            />
            <Bar dataKey="score">
              {normalizedScores.map((item, index) => {
                const score = item.normalizedScore;
                const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {showStatistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(stats.mean)}%</div>
            <div className="text-sm text-gray-600">Mean</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(stats.median)}%</div>
            <div className="text-sm text-gray-600">Median</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.high}</div>
            <div className="text-sm text-gray-600">High (≥85%)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.low}</div>
            <div className="text-sm text-gray-600">Low (&lt;70%)</div>
          </div>
        </div>
      )}

      {groupBy !== 'none' && Object.keys(groupedData).length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-3">Distribution by {groupBy}</h4>
          <div className="space-y-2">
            {Object.entries(groupedData).map(([key, items]) => {
              const avgScore = items.reduce((sum, item) => sum + item.normalizedScore, 0) / items.length;
              return (
                <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{key}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{items.length} items</span>
                    <span className="text-sm font-medium">{Math.round(avgScore)}% avg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

