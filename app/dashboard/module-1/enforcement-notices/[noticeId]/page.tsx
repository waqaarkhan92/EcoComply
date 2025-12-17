'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, Calendar, AlertCircle, CheckCircle2, XCircle, Send, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface EnforcementNotice {
  id: string;
  company_id: string;
  site_id: string;
  document_id: string | null;
  notice_number: string;
  notice_date: string;
  notice_type: 'WARNING' | 'NOTICE' | 'VARIATION' | 'SUSPENSION' | 'REVOCATION' | 'PROSECUTION';
  regulator: string;
  subject: string;
  description: string;
  requirements: string | null;
  deadline_date: string | null;
  status: 'OPEN' | 'RESPONDED' | 'CLOSED' | 'APPEALED';
  response_submitted_at: string | null;
  response_document_url: string | null;
  response_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export default function EnforcementNoticeDetailPage({
  params,
}: {
  params: Promise<{ noticeId: string }>;
}) {
  const { noticeId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseDocumentUrl, setResponseDocumentUrl] = useState('');
  const [closureNotes, setClosureNotes] = useState('');

  const { data: notice, isLoading } = useQuery({
    queryKey: ['enforcement-notice', noticeId],
    queryFn: async (): Promise<any> => {
      const response = await apiClient.get<EnforcementNotice>(`/module-1/enforcement-notices/${noticeId}`);
      return response.data;
    },
  });

  const submitResponseMutation = useMutation({
    mutationFn: async (data: { response_text: string; response_document_url?: string }) => {
      return apiClient.post(`/module-1/enforcement-notices/${noticeId}/response`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enforcement-notice', noticeId] });
      queryClient.invalidateQueries({ queryKey: ['module-1-enforcement-notices'] });
      setShowResponseForm(false);
      setResponseText('');
      setResponseDocumentUrl('');
    },
  });

  const closeNoticeMutation = useMutation({
    mutationFn: async (data: { closure_notes?: string }) => {
      return apiClient.post(`/module-1/enforcement-notices/${noticeId}/close`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enforcement-notice', noticeId] });
      queryClient.invalidateQueries({ queryKey: ['module-1-enforcement-notices'] });
      setShowCloseForm(false);
      setClosureNotes('');
    },
  });

  if (isLoading) {
    return <div className="text-center py-12 text-text-secondary">Loading enforcement notice...</div>;
  }

  if (!notice) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">Enforcement notice not found</p>
        <Link href="/dashboard/module-1/enforcement-notices">
          <Button variant="outline" className="mt-4">
            Back to Enforcement Notices
          </Button>
        </Link>
      </div>
    );
  }

  const isOverdue = notice.deadline_date && new Date(notice.deadline_date) < new Date() && notice.status === 'OPEN';
  const canRespond = notice.status === 'OPEN' || notice.status === 'RESPONDED';
  const canClose = notice.status !== 'CLOSED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/module-1/enforcement-notices"
            className="text-sm text-text-secondary hover:text-primary mb-2 inline-block"
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to Enforcement Notices
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">
            {notice.notice_number}
          </h1>
          <p className="text-text-secondary mt-2">
            {notice.subject}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/module-1/enforcement-notices/${noticeId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-2 ${
        notice.status === 'CLOSED' ? 'bg-green-50 border-green-200' :
        notice.status === 'RESPONDED' ? 'bg-blue-50 border-blue-200' :
        isOverdue ? 'bg-red-50 border-red-200' :
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notice.status === 'CLOSED' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : notice.status === 'RESPONDED' ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className="font-semibold text-gray-900">
                Status: {notice.status}
                {isOverdue && <span className="text-red-600 ml-2">(Overdue)</span>}
              </p>
              {notice.deadline_date && (
                <p className="text-sm text-gray-600 mt-1">
                  Deadline: {new Date(notice.deadline_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canRespond && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResponseForm(!showResponseForm)}
              >
                <Send className="mr-2 h-4 w-4" />
                {notice.status === 'RESPONDED' ? 'Update Response' : 'Submit Response'}
              </Button>
            )}
            {canClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseForm(!showCloseForm)}
                disabled={notice.status === 'OPEN'}
              >
                <Lock className="mr-2 h-4 w-4" />
                Close Notice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Response Form */}
      {showResponseForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Submit Response</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Response Text *
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your response to the enforcement notice..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Response Document URL (optional)
              </label>
              <input
                type="url"
                value={responseDocumentUrl}
                onChange={(e) => setResponseDocumentUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseForm(false);
                  setResponseText('');
                  setResponseDocumentUrl('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  submitResponseMutation.mutate({
                    response_text: responseText,
                    response_document_url: responseDocumentUrl || undefined,
                  });
                }}
                disabled={!responseText || submitResponseMutation.isPending}
              >
                {submitResponseMutation.isPending ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Form */}
      {showCloseForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Close Enforcement Notice</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Closure Notes (optional)
              </label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add any notes about closing this notice..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCloseForm(false);
                  setClosureNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  closeNoticeMutation.mutate({
                    closure_notes: closureNotes || undefined,
                  });
                }}
                disabled={closeNoticeMutation.isPending}
              >
                {closeNoticeMutation.isPending ? 'Closing...' : 'Close Notice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notice Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Notice Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Notice Number</p>
            <p className="text-text-primary font-medium">{notice.notice_number}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Notice Type</p>
            <p className="text-text-primary">{notice.notice_type}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Regulator</p>
            <p className="text-text-primary">{notice.regulator}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Notice Date</p>
            <p className="text-text-primary">
              {new Date(notice.notice_date).toLocaleDateString()}
            </p>
          </div>

          {notice.deadline_date && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Deadline Date</p>
              <p className={`text-text-primary ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                {new Date(notice.deadline_date).toLocaleDateString()}
                {isOverdue && <span className="ml-2">(Overdue)</span>}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Status</p>
            <p className="text-text-primary">{notice.status}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-text-secondary mb-2">Description</p>
            <p className="text-text-primary whitespace-pre-wrap">{notice.description}</p>
          </div>

          {notice.requirements && (
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-text-secondary mb-2">Requirements</p>
              <p className="text-text-primary whitespace-pre-wrap">{notice.requirements}</p>
            </div>
          )}

          {notice.response_submitted_at && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Response</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Submitted At</p>
                  <p className="text-text-primary">
                    {new Date(notice.response_submitted_at).toLocaleString()}
                  </p>
                </div>
                {notice.response_notes && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Response Notes</p>
                    <p className="text-text-primary whitespace-pre-wrap">{notice.response_notes}</p>
                  </div>
                )}
                {notice.response_document_url && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Response Document</p>
                    <a
                      href={notice.response_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <FileText className="inline w-4 h-4 mr-1" />
                      View Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {notice.closed_at && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Closure</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Closed At</p>
                  <p className="text-text-primary">
                    {new Date(notice.closed_at).toLocaleString()}
                  </p>
                </div>
                {notice.closure_notes && (
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Closure Notes</p>
                    <p className="text-text-primary whitespace-pre-wrap">{notice.closure_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Created</p>
            <p className="text-text-primary">
              {new Date(notice.created_at).toLocaleDateString()}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Last Updated</p>
            <p className="text-text-primary">
              {new Date(notice.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

