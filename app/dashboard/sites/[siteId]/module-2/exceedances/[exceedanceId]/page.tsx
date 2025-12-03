'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

interface Exceedance {
  id: string;
  parameter_id: string;
  lab_result_id: string;
  site_id: string;
  recorded_value: number;
  limit_value: number;
  percentage_of_limit: number;
  recorded_date: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  resolution_notes: string | null;
  resolved_at: string | null;
  corrective_action: string | null;
  notified_water_company: boolean;
  notification_date: string | null;
  parameter_type: string;
  parameter_unit: string;
  alert_level: 'WARNING' | 'HIGH' | 'CRITICAL';
}

interface ExceedanceResponse {
  data: Exceedance;
}

export default function ExceedanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.siteId as string;
  const exceedanceId = params.exceedanceId as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery<ExceedanceResponse>({
    queryKey: ['module-2-exceedance', exceedanceId],
    queryFn: async (): Promise<any> => {
      // Note: We'll need to fetch from the list endpoint and filter, or create a detail endpoint
      // For now, we'll use the list endpoint with a filter
      const response = await apiClient.get<{ data: Exceedance[] }>(`/module-2/exceedances?filter[id]=${exceedanceId}`);
      if (response.data && response.data.length > 0) {
        return { data: response.data[0] };
      }
      throw new Error('Exceedance not found');
    },
    enabled: !!exceedanceId,
  });

  const exceedance = data?.data;

  // Initialize form when data loads
  useState(() => {
    if (exceedance) {
      setResolutionNotes(exceedance.resolution_notes || '');
      setCorrectiveAction(exceedance.corrective_action || '');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { status: string; resolution_notes?: string; corrective_action?: string }) => {
      // Note: We'll need to create an update endpoint for exceedances
      // For now, this is a placeholder
      return apiClient.put(`/module-2/exceedances/${exceedanceId}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Exceedance updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['module-2-exceedance'] });
      queryClient.invalidateQueries({ queryKey: ['module-2-exceedances'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update exceedance',
        variant: 'destructive',
      });
    },
  });

  const handleResolve = () => {
    updateMutation.mutate({
      status: 'RESOLVED',
      resolution_notes: resolutionNotes,
      corrective_action: correctiveAction,
    });
  };

  const handleClose = () => {
    updateMutation.mutate({
      status: 'CLOSED',
      resolution_notes: resolutionNotes,
      corrective_action: correctiveAction,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/exceedances`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !exceedance) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/sites/${siteId}/module-2/exceedances`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">Exceedance Not Found</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <p className="text-red-800">Error loading exceedance details. Please try again.</p>
        </div>
      </div>
    );
  }

  const getAlertLevelColor = (level: string): string => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-red-400 text-white';
      case 'WARNING':
        return 'bg-yellow-400 text-yellow-900';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'CLOSED':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sites/${siteId}/module-2/exceedances`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Exceedance Alert</h1>
          <p className="text-text-secondary mt-2">
            {exceedance.parameter_type} - {new Date(exceedance.recorded_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className={`rounded-lg p-6 ${
        exceedance.alert_level === 'CRITICAL' ? 'bg-red-600 text-white' :
        exceedance.alert_level === 'HIGH' ? 'bg-red-500 text-white' :
        'bg-yellow-400 text-yellow-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">Limit Exceeded</h2>
              <p className="text-sm opacity-90">
                {exceedance.recorded_value} {exceedance.parameter_unit} exceeds limit of {exceedance.limit_value} {exceedance.parameter_unit}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-semibold ${getAlertLevelColor(exceedance.alert_level)}`}>
            {exceedance.alert_level}
          </span>
        </div>
      </div>

      {/* Exceedance Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Parameter</p>
            <p className="text-lg font-semibold text-text-primary">{exceedance.parameter_type}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Recorded Date</p>
            <p className="text-lg font-semibold text-text-primary">
              {new Date(exceedance.recorded_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Recorded Value</p>
            <p className="text-lg font-semibold text-red-600">
              {exceedance.recorded_value} {exceedance.parameter_unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Limit Value</p>
            <p className="text-lg font-semibold text-text-primary">
              {exceedance.limit_value} {exceedance.parameter_unit}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">% Over Limit</p>
            <p className="text-lg font-semibold text-red-600">
              {exceedance.percentage_of_limit.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Status</p>
            <div className="flex items-center gap-2">
              {getStatusIcon(exceedance.status)}
              <span className="text-lg font-semibold text-text-primary">{exceedance.status}</span>
            </div>
          </div>
        </div>

        {exceedance.notified_water_company && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-text-primary">Water company notified</p>
              {exceedance.notification_date && (
                <span className="text-xs text-text-tertiary ml-2">
                  ({new Date(exceedance.notification_date).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Form */}
      {exceedance.status === 'OPEN' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Resolution</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Corrective Action
              </label>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe the corrective action taken..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add notes about the resolution..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              variant="primary"
              onClick={handleResolve}
              disabled={updateMutation.isPending}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Resolved
            </Button>
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={updateMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Close Exceedance
            </Button>
          </div>
        </div>
      )}

      {/* Existing Resolution Info */}
      {exceedance.status !== 'OPEN' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Resolution Information</h2>
          
          {exceedance.corrective_action && (
            <div className="mb-4">
              <p className="text-sm font-medium text-text-secondary mb-1">Corrective Action</p>
              <p className="text-sm text-text-primary">{exceedance.corrective_action}</p>
            </div>
          )}
          
          {exceedance.resolution_notes && (
            <div className="mb-4">
              <p className="text-sm font-medium text-text-secondary mb-1">Resolution Notes</p>
              <p className="text-sm text-text-primary">{exceedance.resolution_notes}</p>
            </div>
          )}
          
          {exceedance.resolved_at && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-1">Resolved At</p>
              <p className="text-sm text-text-primary">
                {new Date(exceedance.resolved_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/sites/${siteId}/module-2/parameters/${exceedance.parameter_id}`}>
          <Button variant="secondary">
            View Parameter
          </Button>
        </Link>
        <Link href={`/dashboard/sites/${siteId}/module-2/lab-results/${exceedance.lab_result_id}`}>
          <Button variant="secondary">
            View Lab Result
          </Button>
        </Link>
      </div>
    </div>
  );
}

