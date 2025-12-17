'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Gauge, Calculator, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface RegulationThreshold {
  id: string;
  threshold_type: 'MCPD_1_5MW' | 'MCPD_5_50MW' | 'SPECIFIED_GENERATOR' | 'CUSTOM';
  capacity_min_mw: number;
  capacity_max_mw: number | null;
  monitoring_frequency: string;
  stack_test_frequency: string;
  reporting_frequency: string;
  regulation_reference: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FrequencyCalculation {
  id: string;
  generator_id: string;
  calculation_date: string;
  generator_capacity_mw: number;
  calculated_monitoring_frequency: string;
  calculated_stack_test_frequency: string;
  calculated_reporting_frequency: string;
  is_applied: boolean;
}

const thresholdTypeColors: Record<string, { bg: string; text: string }> = {
  MCPD_1_5MW: { bg: 'bg-blue-50', text: 'text-blue-700' },
  MCPD_5_50MW: { bg: 'bg-purple-50', text: 'text-purple-700' },
  SPECIFIED_GENERATOR: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CUSTOM: { bg: 'bg-gray-50', text: 'text-gray-700' },
};

export default function RegulationThresholdDetailPage({
  params,
}: {
  params: Promise<{ thresholdId: string }>;
}) {
  const { thresholdId } = use(params);
  const queryClient = useQueryClient();

  const { data: threshold, isLoading } = useQuery({
    queryKey: ['regulation-threshold', thresholdId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<RegulationThreshold>(`/module-3/regulation-thresholds/${thresholdId}`);
      return response.data;
    },
  });

  // Note: Frequency calculations would need a separate endpoint
  // For now, this is a placeholder

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading regulation threshold...</div>;
  }

  if (!threshold) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Regulation threshold not found</p>
        <Link href="/dashboard/module-3/regulation-thresholds">
          <Button variant="outline" className="mt-4">
            Back to Regulation Thresholds
          </Button>
        </Link>
      </div>
    );
  }

  const typeStyle = thresholdTypeColors[threshold.threshold_type] || { bg: 'bg-gray-50', text: 'text-gray-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-3/regulation-thresholds"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Regulation Thresholds
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Regulation Threshold</h1>
          <p className="text-text-secondary mt-2">
            {threshold.threshold_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-3/regulation-thresholds/${thresholdId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Threshold Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Threshold Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Threshold Type</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}>
              {threshold.threshold_type.replace('_', ' ')}
            </span>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Capacity Range</p>
            <p className="text-text-primary font-medium">
              {parseFloat(threshold.capacity_min_mw.toString()).toFixed(2)} - {threshold.capacity_max_mw ? parseFloat(threshold.capacity_max_mw.toString()).toFixed(2) : '∞'} MW
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Monitoring Frequency</p>
            <p className="text-text-primary">{threshold.monitoring_frequency}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Stack Test Frequency</p>
            <p className="text-text-primary">{threshold.stack_test_frequency}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Reporting Frequency</p>
            <p className="text-text-primary">{threshold.reporting_frequency}</p>
          </div>

          {threshold.regulation_reference && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Regulation Reference</p>
              <p className="text-text-primary">{threshold.regulation_reference}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            {threshold.is_active ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-700">
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Inactive
              </span>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(threshold.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Frequency Calculations Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequency Calculations</h2>
        <p className="text-text-secondary mb-4">
          Use the automatic frequency calculation feature to determine monitoring frequencies for generators based on their capacity.
        </p>
        <Link href="/dashboard/module-3/generators">
          <Button variant="outline">
            <Calculator className="mr-2 h-4 w-4" />
            Calculate Frequencies for Generators
          </Button>
        </Link>
      </div>
    </div>
  );
}

