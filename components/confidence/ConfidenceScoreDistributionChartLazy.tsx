'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/components/ui/loading-skeletons';

// Lazy load the Recharts-based chart component
const ConfidenceScoreDistributionChart = dynamic(() => import('./ConfidenceScoreDistributionChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Charts are client-side only
});

export default ConfidenceScoreDistributionChart;
