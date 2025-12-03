'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, AlertTriangle, CheckCircle2, Clock, User, Lock, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface CorrectiveAction {
  id: string;
  exceedance_id: string | null;
  parameter_id: string | null;
  site_id: string;
  action_type: string;
  action_title: string;
  action_description: string;
  assigned_to: string | null;
  due_date: string;
  status: string;
  lifecycle_phase: string | null;
  completed_date: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  evidence_ids: string[];
  resolution_notes: string | null;
  root_cause_analysis: string | null;
  impact_assessment: any;
  regulator_notification_required: boolean;
  regulator_justification: string | null;
  closure_approved_by: string | null;
  closure_approved_at: string | null;
  closure_requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export default function CorrectiveActionDetailPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  const { actionId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showAddEvidenceForm, setShowAddEvidenceForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [evidenceIds, setEvidenceIds] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [regulatorJustification, setRegulatorJustification] = useState('');

  const { data: action, isLoading } = useQuery<CorrectiveAction>({
    queryKey: ['corrective-action', actionId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<CorrectiveAction>(`/module-2/corrective-actions/${actionId}`);
      return response.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { assigned_to: string }) => {
      return apiClient.post(`/module-2/corrective-actions/${actionId}/assign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-corrective-actions'] });
      setShowAssignForm(false);
      setAssignedTo('');
    },
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async (data: { evidence_ids: string[] }) => {
      return apiClient.post(`/module-2/corrective-actions/${actionId}/add-evidence`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-corrective-actions'] });
      setShowAddEvidenceForm(false);
      setEvidenceIds('');
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (data: { resolution_notes?: string; regulator_justification?: string; closure_requires_approval?: boolean }) => {
      return apiClient.post(`/module-2/corrective-actions/${actionId}/close`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrective-action', actionId] });
      queryClient.invalidateQueries({ queryKey: ['module-2-corrective-actions'] });
      setShowCloseForm(false);
      setResolutionNotes('');
      setRegulatorJustification('');
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading corrective action...</div>;
  }

  if (!action) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Corrective action not found</p>
        <Link href="/dashboard/module-2/corrective-actions">
          <Button variant="outline" className="mt-4">
            Back to Corrective Actions
          </Button>
        </Link>
      </div>
    );
  }

  const isOverdue = new Date(action.due_date) < new Date() && action.status !== 'CLOSED';
  const canClose = action.status !== 'CLOSED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-2/corrective-actions"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Corrective Actions
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {action.action_title}
          </h1>
          <p className="text-text-secondary mt-2">
            {action.action_type.replace('_', ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-2/corrective-actions/${actionId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${
        action.status === 'CLOSED' ? 'bg-gray-50 border-gray-200' :
        action.status === 'COMPLETED' ? 'bg-green-50 border-green-200' :
        isOverdue ? 'bg-red-50 border-red-200' :
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              Status: {action.status}
              {isOverdue && <span className="text-red-600 ml-2">(Overdue)</span>}
            </p>
            {action.lifecycle_phase && (
              <p className="text-sm text-gray-600 mt-1">
                Lifecycle Phase: {action.lifecycle_phase}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!action.assigned_to && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignForm(!showAssignForm)}
              >
                <User className="mr-2 h-4 w-4" />
                Assign Owner
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddEvidenceForm(!showAddEvidenceForm)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Add Evidence
            </Button>
            {canClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseForm(!showCloseForm)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Close Action
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Assign Form */}
      {showAssignForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Assign Owner</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                User ID *
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="User UUID"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignForm(false);
                  setAssignedTo('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  assignMutation.mutate({ assigned_to: assignedTo });
                }}
                disabled={!assignedTo || assignMutation.isPending}
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Evidence Form */}
      {showAddEvidenceForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Add Evidence</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Evidence IDs (comma-separated) *
              </label>
              <input
                type="text"
                value={evidenceIds}
                onChange={(e) => setEvidenceIds(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="UUID1, UUID2, UUID3"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddEvidenceForm(false);
                  setEvidenceIds('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const ids = evidenceIds.split(',').map(id => id.trim()).filter(Boolean);
                  addEvidenceMutation.mutate({ evidence_ids: ids });
                }}
                disabled={!evidenceIds || addEvidenceMutation.isPending}
              >
                {addEvidenceMutation.isPending ? 'Adding...' : 'Add Evidence'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Form */}
      {showCloseForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Close Corrective Action</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe how the issue was resolved..."
              />
            </div>
            {action.regulator_notification_required && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Regulator Justification *
                </label>
                <textarea
                  value={regulatorJustification}
                  onChange={(e) => setRegulatorJustification(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Justification for regulator..."
                  required
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCloseForm(false);
                  setResolutionNotes('');
                  setRegulatorJustification('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  closeMutation.mutate({
                    resolution_notes: resolutionNotes || undefined,
                    regulator_justification: regulatorJustification || undefined,
                  });
                }}
                disabled={closeMutation.isPending || (action.regulator_notification_required && !regulatorJustification)}
              >
                {closeMutation.isPending ? 'Closing...' : 'Close Action'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Action Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Action Title</p>
            <p className="text-text-primary font-medium">{action.action_title}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Action Type</p>
            <p className="text-text-primary">{action.action_type.replace('_', ' ')}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            <p className="text-text-primary">{action.status}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Due Date</p>
            <p className={`text-text-primary ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              {new Date(action.due_date).toLocaleDateString()}
              {isOverdue && <span className="ml-2">(Overdue)</span>}
            </p>
          </div>

          {action.assigned_to && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Assigned To</p>
              <p className="text-text-primary">{action.assigned_to}</p>
            </div>
          )}

          {action.lifecycle_phase && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Lifecycle Phase</p>
              <p className="text-text-primary">{action.lifecycle_phase}</p>
            </div>
          )}

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Description</p>
            <p className="text-text-primary whitespace-pre-wrap">{action.action_description}</p>
          </div>

          {action.root_cause_analysis && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Root Cause Analysis</p>
              <p className="text-text-primary whitespace-pre-wrap">{action.root_cause_analysis}</p>
            </div>
          )}

          {action.resolution_notes && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Resolution Notes</p>
              <p className="text-text-primary whitespace-pre-wrap">{action.resolution_notes}</p>
            </div>
          )}

          {action.evidence_ids && action.evidence_ids.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Evidence ({action.evidence_ids.length})</p>
              <div className="space-y-1">
                {action.evidence_ids.map((evidenceId, index) => (
                  <div key={index} className="text-sm text-gray-600">{evidenceId}</div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(action.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(action.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

