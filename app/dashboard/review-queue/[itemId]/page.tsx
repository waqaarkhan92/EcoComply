'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, X, Edit, AlertCircle, FileText, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ReviewQueueItem {
  id: string;
  document_id: string;
  obligation_id: string | null;
  review_type: string;
  is_blocking: boolean;
  priority: number;
  hallucination_risk: boolean;
  original_data: any;
  review_status: string;
  review_action: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  edited_data: any;
  created_at: string;
  updated_at: string;
  documents?: {
    id: string;
    file_name: string;
    document_type: string;
    site_id: string;
  };
  obligations?: {
    id: string;
    obligation_title: string;
    obligation_description: string;
    category: string;
    frequency: string;
    deadline_date: string;
    confidence_score: number;
    is_subjective: boolean;
  };
}

interface EditFormData {
  obligation_title: string;
  obligation_description: string;
  category: string;
  frequency: string;
  deadline_date: string;
  edit_reason: string;
}

export default function ReviewQueueDetailPage({ params }: { params: { itemId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<EditFormData>();

  // Fetch review queue item
  const { data: itemData, isLoading: itemLoading } = useQuery<{
    data: ReviewQueueItem;
  }>({
    queryKey: ['review-queue-item', params.itemId],
    queryFn: async (): Promise<any> => {
      const response: any = await apiClient.get(`/review-queue?filter[id]=${params.itemId}`);
      const items = response.data.data;
      return { data: items[0] };
    },
  });

  const item = itemData?.data;

  // Set form values when item loads
  if (item && !isEditing) {
    setValue('obligation_title', item.obligations?.obligation_title || '');
    setValue('obligation_description', item.obligations?.obligation_description || '');
    setValue('category', item.obligations?.category || '');
    setValue('frequency', item.obligations?.frequency || '');
    setValue('deadline_date', item.obligations?.deadline_date || '');
  }

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put(`/review-queue/${params.itemId}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      router.push('/dashboard/review-queue');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiClient.put(`/review-queue/${params.itemId}/reject`, {
        rejection_reason: reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      router.push('/dashboard/review-queue');
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      const response = await apiClient.put(`/review-queue/${params.itemId}/edit`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue-item', params.itemId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setIsEditing(false);
    },
  });

  const handleConfirm = () => {
    if (confirm('Are you sure you want to confirm this extraction?')) {
      confirmMutation.mutate();
    }
  };

  const handleReject = () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason && reason.trim().length > 0) {
      rejectMutation.mutate(reason);
    }
  };

  const handleEdit = (data: EditFormData) => {
    editMutation.mutate(data);
  };

  const getConfidenceColor = (score: number | null | undefined) => {
    if (!score) return 'text-text-tertiary';
    if (score >= 0.85) return 'text-success';
    if (score >= 0.70) return 'text-warning';
    return 'text-danger';
  };

  const getConfidenceLabel = (score: number | null | undefined) => {
    if (!score) return 'N/A';
    const percentage = Math.round(score * 100);
    if (percentage >= 85) return 'High (Confirmed)';
    if (percentage >= 70) return 'Medium (Review Recommended)';
    return 'Low (Review Required)';
  };

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-text-secondary">Loading review item...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-text-secondary mb-4">Review item not found</div>
          <Button variant="primary" onClick={() => router.push('/dashboard/review-queue')}>
            Back to Review Queue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/review-queue')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Review Extraction</h1>
            <p className="text-text-secondary mt-2">
              {item.documents?.file_name || 'Unknown Document'}
            </p>
          </div>
        </div>
        {item.review_status === 'PENDING' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={confirmMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </div>
        )}
      </div>

      {/* Hallucination Warning */}
      {item.hallucination_risk && (
        <div className="bg-danger/10 border border-danger rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">Hallucination Risk Detected</p>
            <p className="text-sm text-text-secondary mt-1">
              The extracted text may not match the source document. Please verify carefully against the original document.
            </p>
          </div>
        </div>
      )}

      {/* Side-by-Side Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Original Document */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Original Document
            </h2>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Full Document
            </Button>
          </div>
          <div className="bg-background-tertiary rounded-lg p-4 min-h-[400px]">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {item.original_data?.original_text || item.obligations?.obligation_description || 'Original text not available'}
            </p>
            {item.original_data?.page_number && (
              <p className="text-xs text-text-tertiary mt-4">
                Page {item.original_data.page_number}
              </p>
            )}
          </div>
        </div>

        {/* Right Panel: Extracted Data */}
        <div className="bg-white rounded-lg shadow-base p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">Extracted Data</h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getConfidenceColor(item.obligations?.confidence_score)}`}>
                {getConfidenceLabel(item.obligations?.confidence_score)}
              </span>
              {item.obligations?.confidence_score && (
                <span className="text-xs text-text-tertiary">
                  ({Math.round(item.obligations.confidence_score * 100)}%)
                </span>
              )}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(handleEdit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Obligation Title <span className="text-danger">*</span>
                </label>
                <Input
                  {...register('obligation_title', { required: 'Obligation title is required' })}
                  className={errors.obligation_title ? 'border-danger' : ''}
                />
                {errors.obligation_title && (
                  <p className="text-xs text-danger mt-1">{errors.obligation_title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Obligation Description
                </label>
                <textarea
                  {...register('obligation_description')}
                  className="w-full min-h-[100px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Category
                  </label>
                  <select
                    {...register('category')}
                    className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="MONITORING">Monitoring</option>
                    <option value="REPORTING">Reporting</option>
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Frequency
                  </label>
                  <select
                    {...register('frequency')}
                    className="w-full rounded-lg border border-input-border px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ANNUAL">Annual</option>
                    <option value="CONTINUOUS">Continuous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Deadline Date
                </label>
                <Input
                  type="date"
                  {...register('deadline_date')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Edit Reason <span className="text-danger">*</span>
                </label>
                <textarea
                  {...register('edit_reason', { required: 'Edit reason is required' })}
                  className="w-full min-h-[80px] rounded-lg border border-input-border px-4 py-3 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Explain why you're making these changes..."
                />
                {errors.edit_reason && (
                  <p className="text-xs text-danger mt-1">{errors.edit_reason.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-input-border">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={editMutation.isPending}
                  loading={editMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Obligation Title
                </label>
                <p className="text-text-primary">{item.obligations?.obligation_title || 'N/A'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Obligation Description
                </label>
                <p className="text-text-primary whitespace-pre-wrap">
                  {item.obligations?.obligation_description || 'N/A'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Category
                  </label>
                  <p className="text-text-primary">{item.obligations?.category || 'N/A'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Frequency
                  </label>
                  <p className="text-text-primary">{item.obligations?.frequency || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Deadline Date
                </label>
                <p className="text-text-primary">
                  {item.obligations?.deadline_date
                    ? new Date(item.obligations.deadline_date).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>

              {item.obligations?.is_subjective && (
                <div className="bg-warning/10 border border-warning rounded-lg p-4">
                  <p className="text-sm font-medium text-warning mb-2">
                    ⚠️ Subjective Obligation
                  </p>
                  <p className="text-xs text-text-secondary">
                    This obligation requires interpretation notes before it can be marked as complete.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

