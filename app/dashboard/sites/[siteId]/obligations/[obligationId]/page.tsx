'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuditLogPanel } from '@/components/audit/audit-log-panel';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Link as LinkIcon,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
} from 'lucide-react';
import Link from 'next/link';

interface Obligation {
  id: string;
  obligation_title: string;
  obligation_description?: string;
  category?: string;
  frequency?: string;
  status?: string;
  deadline_date?: string;
  assigned_to?: string;
  review_status?: string;
  evidence_count?: number;
  schedules?: any[];
  deadlines?: any[];
}

export default function ObligationDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const obligationId = params.obligationId as string;
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'schedule' | 'history'>(
    'details'
  );

  const { data: obligationData, isLoading } = useQuery({
    queryKey: ['obligation', obligationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<{ data: Obligation }>(`/obligations/${obligationId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading obligation...</div>
      </div>
    );
  }

  if (!obligationData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Obligation not found</div>
      </div>
    );
  }

  const obligation = obligationData.data;

  // Get status badge variant
  const getStatusVariant = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLIANT':
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
      case 'IN_PROGRESS':
        return 'warning';
      case 'OVERDUE':
      case 'NON_COMPLIANT':
        return 'danger';
      default:
        return 'default';
    }
  };

  // Get review status badge variant
  const getReviewStatusVariant = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'EDITED':
      case 'REJECTED':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/dashboard/sites/${siteId}/obligations`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{obligation.obligation_title}</h1>
              {obligation.status && (
                <Badge variant={getStatusVariant(obligation.status)} size="md">
                  {obligation.status}
                </Badge>
              )}
            </div>
            {obligation.category && (
              <p className="text-gray-600 mt-1">
                {obligation.category.replace(/_/g, ' ')} • {obligation.frequency || 'N/A'}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence/upload`}>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload Evidence
            </Button>
          </Link>
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/schedule`}>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline mr-2 h-4 w-4" />
            Details
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'evidence'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <LinkIcon className="inline mr-2 h-4 w-4" />
            Evidence
            {obligation.evidence_count !== undefined && obligation.evidence_count > 0 && (
              <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                {obligation.evidence_count}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline mr-2 h-4 w-4" />
            Schedule & Deadlines
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="inline mr-2 h-4 w-4" />
            History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Obligation Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Obligation Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <div className="mt-1 text-sm text-gray-900">{obligation.obligation_title}</div>
              </div>

              {obligation.category && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {obligation.category.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              {obligation.frequency && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Frequency</label>
                  <div className="mt-1 text-sm text-gray-900">{obligation.frequency}</div>
                </div>
              )}

              {obligation.deadline_date && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Deadline</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date(obligation.deadline_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {obligation.status && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(obligation.status)} size="sm">
                      {obligation.status}
                    </Badge>
                  </div>
                </div>
              )}

              {obligation.review_status && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Review Status</label>
                  <div className="mt-1">
                    <Badge variant={getReviewStatusVariant(obligation.review_status)} size="sm">
                      {obligation.review_status}
                    </Badge>
                  </div>
                </div>
              )}

              {obligation.obligation_description && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {obligation.obligation_description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-4">
              <Link
                href={`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence/upload`}
              >
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <div className="font-medium text-gray-900">Upload Evidence</div>
                  <div className="text-sm text-gray-600 mt-1">Add supporting documents</div>
                </div>
              </Link>

              <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/schedule`}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <Calendar className="h-8 w-8 text-gray-400 mb-2" />
                  <div className="font-medium text-gray-900">Manage Schedule</div>
                  <div className="text-sm text-gray-600 mt-1">Set up monitoring schedule</div>
                </div>
              </Link>

              <Link
                href={`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence-rules`}
              >
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <Settings className="h-8 w-8 text-gray-400 mb-2" />
                  <div className="font-medium text-gray-900">Evidence Rules</div>
                  <div className="text-sm text-gray-600 mt-1">Configure requirements</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <EvidenceTab siteId={siteId} obligationId={obligationId} />
      )}

      {activeTab === 'schedule' && (
        <ScheduleTab siteId={siteId} obligationId={obligationId} obligation={obligation} />
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Audit Log Panel */}
          <AuditLogPanel
            entityType="obligation"
            entityId={obligationId}
            defaultExpanded={true}
          />
        </div>
      )}
    </div>
  );
}

// Evidence Tab Component
function EvidenceTab({ siteId, obligationId }: { siteId: string; obligationId: string }) {
  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['obligation-evidence', obligationId],
    queryFn: async (): Promise<any> => {
      return apiClient.get(`/obligations/${obligationId}/evidence`);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">Loading evidence...</div>
      </div>
    );
  }

  const evidenceLinks: any[] = evidenceData?.data || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Linked Evidence</h3>
        <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence/upload`}>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Upload Evidence
          </Button>
        </Link>
      </div>
      {evidenceLinks.length === 0 ? (
        <div className="text-center py-12">
          <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No evidence linked yet</p>
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/evidence/upload`}>
            <Button variant="primary" size="sm" className="mt-4">
              <Upload className="mr-2 h-4 w-4" />
              Upload Evidence
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {evidenceLinks.map((link: any) => (
            <div key={link.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{link.evidence?.file_name || 'Unknown File'}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Linked: {new Date(link.linked_at || link.created_at).toLocaleDateString()}
                  </div>
                </div>
                {link.evidence_id && (
                  <Link href={`/dashboard/sites/${siteId}/evidence/${link.evidence_id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Schedule Tab Component
function ScheduleTab({
  siteId,
  obligationId,
  obligation,
}: {
  siteId: string;
  obligationId: string;
  obligation: Obligation;
}) {
  return (
    <div className="space-y-6">
      {/* Schedules */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Monitoring Schedules</h3>
          <Link href={`/dashboard/sites/${siteId}/obligations/${obligationId}/schedule`}>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Manage Schedule
            </Button>
          </Link>
        </div>
        {!obligation.schedules || obligation.schedules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No schedules configured</div>
        ) : (
          <div className="space-y-4">
            {obligation.schedules.map((schedule: any) => (
              <div key={schedule.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {schedule.frequency} - Next: {new Date(schedule.next_due_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Status: {schedule.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deadlines */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Deadlines</h3>
        {!obligation.deadlines || obligation.deadlines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No deadlines scheduled</div>
        ) : (
          <div className="space-y-4">
            {obligation.deadlines.map((deadline: any) => (
              <div key={deadline.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Due: {new Date(deadline.due_date).toLocaleDateString()}
                    </div>
                    {deadline.compliance_period && (
                      <div className="text-sm text-gray-600 mt-1">
                        Period: {deadline.compliance_period}
                      </div>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(deadline.status)} size="sm">
                    {deadline.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for status badge variant
function getStatusVariant(status?: string) {
  switch (status?.toUpperCase()) {
    case 'COMPLIANT':
    case 'COMPLETED':
      return 'success';
    case 'PENDING':
    case 'IN_PROGRESS':
      return 'warning';
    case 'OVERDUE':
    case 'NON_COMPLIANT':
      return 'danger';
    default:
      return 'default';
  }
}
